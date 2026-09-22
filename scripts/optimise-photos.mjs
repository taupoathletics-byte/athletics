/**
 * Generate responsive, stripped-metadata derivatives of the club photo album.
 *
 *   node scripts/optimise-photos.mjs
 *
 * Source   : photos-source/<id>.jpg   (originals, 1920x1080, NOT deployed)
 * Output   : public/photos/<id>-<w>.{avif,webp,jpg}
 *
 * The originals live outside public/ on purpose. Anything under public/ is
 * copied verbatim into the build, and the 50 originals are 16 MB that no page
 * ever requests.
 *
 * Only photos 35 and above are used on the site — 1–34 are older, scanned or
 * low-res, and several have text baked in. Photos with a baked-in caption band
 * along the bottom are cropped before resizing; the band is detected rather
 * than hard-coded so re-running stays correct if the originals are replaced.
 *
 * EXIF/GPS is dropped: sharp writes no metadata unless asked, so location data
 * from parents' phones never reaches the web server.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'photos-source'
const OUT = 'public/photos'
const WIDTHS = [480, 960, 1600, 2400]
const FIRST_USABLE = 35

/**
 * Photos below FIRST_USABLE that the club has explicitly asked for. Photo 26 is
 * the same 1920x1080 as the ones in use — it was only caught by the blanket
 * cut — and is used for the Development Squad card on Home.
 */
const INCLUDE = new Set([26, 34])

/**
 * Restrict a run to specific photos, e.g.
 *
 *   node scripts/optimise-photos.mjs 34
 *
 * AVIF encoding is not byte-deterministic, so a full re-run rewrites every
 * existing .avif slightly *larger* for no visual gain. Naming ids regenerates
 * just those and leaves the rest of the set untouched.
 */
const only = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => Number.isFinite(n) && n > 0)

/** Photos that are graphics rather than photographs of members. */
const EXCLUDE = new Set([50]) // title card: "Club Nights @ Owen Delany Park"

/**
 * Height of a baked-in caption band at the foot of the image, or 0.
 *
 * Two things make this fiddly:
 *
 *  1. Brightness alone is not enough. A sunlit long-jump sandpit fills the
 *     bottom of photo 37 and measures 0.60 "light", which would get it wrongly
 *     cropped — but it holds no *pure* white (>245) at all. A printed caption
 *     band measures 0.61–1.00 pure white. So the test is pure white, not light.
 *
 *  2. We cannot stop at the first row that fails the test. The rows carrying
 *     the caption's tallest letters are dense with dark pixels and dip below
 *     the threshold, so a naive scan halts inside the text and leaves it
 *     half-visible. Instead we keep walking up and only stop once we have seen
 *     a sustained run of genuine photo content.
 */
const PURE_WHITE = 245
const BAND_RATIO = 0.5
const PHOTO_RATIO = 0.2
const PHOTO_RUN = 8

async function captionBand(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const limit = height - Math.floor(height * 0.2)

  let photoRun = 0
  let bandTop = height // first row of the band; height means "no band"

  for (let y = height - 1; y >= limit; y--) {
    let pure = 0
    let total = 0
    for (let x = 0; x < width; x += 3) {
      total++
      if (data[y * width + x] > PURE_WHITE) pure++
    }
    const ratio = pure / total

    if (ratio < PHOTO_RATIO) {
      if (++photoRun >= PHOTO_RUN) break
    } else {
      photoRun = 0
      if (ratio > BAND_RATIO) bandTop = y
    }
  }

  const band = height - bandTop
  return band > 20 ? band : 0
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const files = (await readdir(SRC))
    .filter((f) => f.endsWith('.jpg'))
    .map((f) => ({ f, id: Number(path.basename(f, '.jpg')) }))
    .filter(({ id }) => {
      if (!Number.isFinite(id) || EXCLUDE.has(id)) return false
      if (only.length) return only.includes(id)
      return id >= FIRST_USABLE || INCLUDE.has(id)
    })
    .sort((a, b) => a.id - b.id)

  const manifest = []
  for (const { f, id } of files) {
    const src = path.join(SRC, f)
    const meta = await sharp(src).metadata()
    const band = await captionBand(src)
    const height = meta.height - band
    if (band) console.log(`  ${f}: cropping ${band}px caption band`)

    const base = sharp(src).extract({ left: 0, top: 0, width: meta.width, height })

    for (const w of WIDTHS) {
      if (w > meta.width) continue // never upscale
      const pipe = () => base.clone().resize({ width: w, withoutEnlargement: true })
      await pipe().avif({ quality: 55 }).toFile(`${OUT}/${id}-${w}.avif`)
      await pipe().webp({ quality: 72 }).toFile(`${OUT}/${id}-${w}.webp`)
      await pipe().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${id}-${w}.jpg`)
    }
    manifest.push({ id, width: meta.width, height, cropped: band > 0 })
    console.log(`✓ ${id}  ${meta.width}x${height}`)
  }

  // Merge rather than replace, so a targeted run (a single id) keeps the rest
  // of the manifest intact instead of truncating it to what was just written.
  let previous = []
  try {
    previous = JSON.parse(await readFile(`${OUT}/manifest.json`, 'utf8'))
  } catch {
    // No manifest yet — first run.
  }
  const touched = new Set(manifest.map((m) => m.id))
  const merged = [...previous.filter((e) => !touched.has(e.id)), ...manifest].sort(
    (a, b) => a.id - b.id,
  )

  await writeFile(`${OUT}/manifest.json`, JSON.stringify(merged, null, 2) + '\n')
  console.log(`\n${manifest.length} photos written → ${OUT} (${merged.length} in manifest)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
