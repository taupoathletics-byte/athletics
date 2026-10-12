// Add Get Set Go station illustrations to the site.
//
//   node scripts/add_station_images.mjs <folder-or-files…>
//   npm run add:images -- ~/Downloads/thumbnails
//
// Each image is cropped to 16:9, resized to 960×540 and saved as a JPEG in
// public/getsetgo/stations/, named after the activity:
//
//   01_dead_ants.png          -> dead-ants.jpg
//   07_move_and_exchange.png  -> move-and-exchange.jpg
//
// It also understands the Series 5–9 package layout, matching each picture to
// that night's activity:
//
//   assets/series5/weekA/station1.png  -> frogs-and-flies.jpg  (Series 5, Week A, Station 1)
//   assets/mini_meet/zone2.png         -> mini-meet-zone-2.jpg
//
// (A Week B circuit that repeats Week A's activity keeps Week A's picture.)
//
// The file name must match an activity in scripts/data/station-cards.json
// ("images"); anything else is skipped with a warning. Then the station cards
// are rebuilt so the dashboard and exported cards pick the pictures up.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'getsetgo', 'stations');
const { images } = JSON.parse(readFileSync(join(here, 'data', 'station-cards.json'), 'utf8'));
const wanted = new Map(Object.entries(images).map(([activity, img]) => [basename(img.src, '.jpg'), activity]));

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/add_station_images.mjs <folder-or-files…>');
  console.error(`Expected names: ${[...wanted.keys()].join(', ')}`);
  process.exit(1);
}

const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => walk(join(p, f))) : [p]);
const files = args.flatMap((a) => walk(resolve(a))).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();

// Cards as currently built, to resolve "series5/weekA/station1" to an activity.
const { default: sessions } = await import(pathToFileURL(join(here, '..', 'api', '_data', 'sessions.mjs')).href);
const cardAt = (n, week, station) => sessions.series.find((s) => s.series === n)?.cards?.[week]?.[station - 1];

const slug = (file) => basename(file, extname(file)).replace(/^\d+[_\-\s]*/, '').replace(/_thumbnail$/i, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const imageSlug = (activity) => (images[activity] ? basename(images[activity].src, '.jpg') : null);

/** The target name for a file: package layout first, then the file's own name. */
function targetFor(file) {
  const norm = file.replace(/\\/g, '/');
  const zone = norm.match(/mini_meet\/zone(\d)\.(png|jpe?g|webp)$/i);
  if (zone) return `mini-meet-zone-${zone[1]}`;
  const m = norm.match(/series(\d+)\/week([AB])\/station(\d)\.(png|jpe?g|webp)$/i);
  if (m) {
    const [n, week, station] = [Number(m[1]), m[2].toUpperCase(), Number(m[3])];
    const card = cardAt(n, week, station);
    if (!card) return { skip: `no Series ${n} Week ${week} Station ${station} card` };
    if (week === 'B' && cardAt(n, 'A', station)?.name === card.name) return { skip: `same activity as Week A (${card.name}) — Week A's picture is used` };
    return imageSlug(card.name) || { skip: `"${card.name}" has no image mapping in station-cards.json` };
  }
  return slug(file);
}

let added = 0;
for (const file of files) {
  const target = targetFor(file);
  if (target && target.skip) {
    console.warn(`skip  ${file.split('/').slice(-3).join('/')} — ${target.skip}`);
    continue;
  }
  const name = target;
  if (!wanted.has(name)) {
    console.warn(`skip  ${basename(file)} — "${name}" isn't a mapped activity (add it to "images" in station-cards.json first)`);
    continue;
  }
  const out = join(outDir, `${name}.jpg`);
  const info = await sharp(file).rotate().resize(960, 540, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(out);
  console.log(`added ${basename(file)} -> public/getsetgo/stations/${name}.jpg (${wanted.get(name)}, ${Math.round(info.size / 1024)} KB)`);
  added++;
}
console.log(`\n${added} image(s) added. Rebuilding the station cards…\n`);
execFileSync(process.execPath, [join(here, 'build_sessions.mjs')], { stdio: 'inherit' });
