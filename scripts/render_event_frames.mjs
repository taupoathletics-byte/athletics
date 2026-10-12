// Render "Explore the seven events" scenes as frame strips, to check the
// choreography by eye without scrolling the site.
//
//   node scripts/render_event_frames.mjs [event…] [--frames 9] [--out dir]
//   npm run events:frames -- hurdles --frames 12
//
// Each event becomes <out>/<event>.png: its stage drawn at evenly spaced
// progress values from 0 to 1, labelled with p. The same React stage the site
// uses produces the SVG, so what you see is what scrolling shows.
//
// Frames are drawn in Chromium when Playwright is installed (set
// PLAYWRIGHT_MODULE to its index.mjs if it isn't a project dependency).
// Without it they fall back to sharp, whose SVG renderer ignores `pathLength`,
// so trails show fully drawn.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const frames = Number(opt('frames', 9));
const outDir = opt('out', join(root, 'tmp', 'event-frames'));
const only = args;

const tmp = join(root, 'tmp', '.event-frames-build');
mkdirSync(tmp, { recursive: true });
const entry = join(tmp, 'entry.tsx');
writeFileSync(entry, `
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { EventStage } from '../../src/components/athletics/events/Stage'
import { scenes } from '../../src/components/athletics/events/scenes'
export function render(id: string, p: number) {
  const scene = scenes.find((s) => s.id === id)
  if (!scene) throw new Error('No scene ' + id)
  return renderToStaticMarkup(createElement(EventStage, { scene, progress: p }))
}
export const ids = scenes.map((s) => s.id)
`);
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: join(tmp, 'entry.mjs'), jsx: 'automatic', logLevel: 'error', external: ['react', 'react-dom'] });
const { render, ids } = await import(pathToFileURL(join(tmp, 'entry.mjs')).href + `?t=${Date.now()}`);

mkdirSync(outDir, { recursive: true });
const W = 400, H = 250, cols = Math.min(frames, 4);

let chromium = null;
for (const mod of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean)) {
  try {
    ({ chromium } = await import(mod));
    break;
  } catch {}
}
const browser = chromium ? await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}).catch(() => null) : null;
if (!browser) console.warn('Playwright not available — drawing with sharp (trails will show fully drawn).');
const page = browser ? await browser.newPage({ viewport: { width: W, height: H } }) : null;

for (const id of only.length ? only : ids) {
  const tiles = [];
  for (let i = 0; i < frames; i++) {
    const p = frames === 1 ? 0.5 : i / (frames - 1);
    const svg = render(id, p).replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"`);
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="6" y="6" width="74" height="26" rx="6" fill="#000" opacity=".55"/><text x="14" y="25" font-family="sans-serif" font-size="16" fill="#fff">p ${p.toFixed(2)}</text></svg>`);
    const base = page
      ? (await page.setContent(`<body style="margin:0">${svg}</body>`), await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } }))
      : Buffer.from(svg);
    const png = await sharp(base).composite([{ input: label }]).png().toBuffer();
    tiles.push({ input: png, left: (i % cols) * (W + 6), top: Math.floor(i / cols) * (H + 6) });
  }
  const rows = Math.ceil(frames / cols);
  const out = join(outDir, `${id}.png`);
  await sharp({ create: { width: cols * (W + 6) - 6, height: rows * (H + 6) - 6, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(out);
  console.log(`${id}: ${frames} frames -> ${out}`);
}
await browser?.close();
rmSync(tmp, { recursive: true, force: true });
