# Taupō Athletics Club

The club website — Vite + React + TypeScript + Tailwind, deployed on Vercel.

```bash
npm install
npm run dev      # local dev server
npm run build    # tsc --noEmit && vite build
npm run preview  # serve the production build
```

## Where the content lives

Almost everything on the site is data, not markup. To change the site, change
these files rather than the pages:

| File | What it holds |
|---|---|
| `src/data/site.ts` | Club identity, venue, contact details, navigation, FAQs, Ribbon Day events, season dates, headline stats |
| `src/data/fees.ts` | Registration status and URL, fees by grade, junior caps |
| `src/data/clubNights.ts` | Every club night date, per-grade times, the evening timeline, Development Squad |
| `src/data/grades.ts` | Grade = age at 31 December; powers the grade finder |
| `src/data/events.ts` | Competition calendar, tagged by season, plus the Ribbon Day kit list |
| `src/data/committee.ts` | Committee, coaches and friends of the committee |
| `src/data/volunteers.ts` | Volunteer roles and time commitments |
| `src/data/sponsors.ts` | Sponsors and supporters |
| `src/data/photos.ts` | The photo album used on the site — alt text, focal points, tags |

## Photos

Originals live in `photos-source/` (outside `public/`, so they are not deployed). Only photos **35 and above** are used on the
site: 1–34 are older, scanned or low-res, and several have text baked in.

To regenerate the optimised versions after adding or replacing an original:

```bash
node scripts/optimise-photos.mjs
```

That writes AVIF, WebP and JPG at 480/960/1600 into `public/photos`, strips
EXIF/GPS, and crops any baked-in caption band off the bottom of an image.

**Photos are used with the club's photo consent. Email
taupoathletics@gmail.com to request a photo be removed.** No child is named in
any alt text or caption on the site.

## Fonts

Inter (body) and Barlow Condensed (display), self-hosted via `@fontsource`.

Any display font must draw a real `ō` (U+014D). Fraunces doesn't: the browser
fakes the glyph and the club's own name renders as "Taupo¯Athletics Club".
Barlow Condensed's latin-ext subset has the real glyph, checked against "Taupō"
in a screenshot. Check any replacement the same way before it ships.

## The look (2026 glow-up)

The home page is scroll-driven, inspired by sixescricket.com, with athletics
kit where Sixes uses cricket balls. Building blocks live in
`src/components/athletics/`:

| Component | What it does |
|---|---|
| `ZoomHero` | Giant headline over three cards; scrolling zooms the promo film to full screen |
| `NextNightPanel` + `Odometer` | Countdown to the next club night in rolling digits, with times by grade |
| `ProgrammeCards`, `FeatureBlocks`, `RegisterBanner` | Photo cards and offset blocks on running-track lanes |
| `LifeStrip` | Pinned horizontal photo strip |
| `EventBadges`, `WordRows` | Event badges and giant word rows that slide as you scroll |
| `CrewQuotes` | The committee's own Q&A answers (no invented testimonials) |
| `icons.tsx` | Shot put, discus, baton, hurdle, stopwatch, rosette, medal, bib |

Every effect respects `prefers-reduced-motion`, and moving marquees pause on
hover. Scroll animations run on the browser's native ScrollTimeline, so every
`useTransform` range must span 0→1 with explicit end values. A partial range
eases back to the start value; see the comment in `ZoomHero.tsx`.

`public/media/promo-loop.mp4` (about 4 MB, caption bands cropped, with the
promo's music) and `promo-poster.jpg` are cut from the club's 58 MB
`public/promo.mp4`:

```bash
# video: 39 s from 0:33, caption band cropped, 960 px
ffmpeg -ss 33 -t 39 -i public/promo.mp4 -an -vf "crop=iw:ih*0.875:0:0,scale=960:-2,fps=24" \
  -c:v libx264 -crf 29 -pix_fmt yuv420p video.mp4
# audio: the same 39 s, faded at both ends so the loop doesn't click
ffmpeg -ss 33 -t 39 -i public/promo.mp4 -vn \
  -af "afade=t=in:st=0:d=0.8,afade=t=out:st=37.3:d=1.7,loudnorm=I=-18:TP=-1.5:LRA=11" \
  -c:a aac -b:a 112k audio.m4a
ffmpeg -i video.mp4 -i audio.m4a -map 0:v -map 1:a -c copy -movflags +faststart public/media/promo-loop.mp4
```

The film always starts **muted**, because browsers block autoplay with sound.
Visitors tap **Sound on** (bottom-right while the hero is on screen) to hear
the music. It plays only while the hero is on screen and the tab is visible,
pausing and resuming automatically. It never autoplays for reduced-motion or
data-saver users; they get native controls instead.

## Things the committee still needs to confirm

These are marked `TODO confirm` in the code and should not be guessed:

1. **Venue street.** The park name is confirmed as "Owen Delany Park" (one 'e'),
   but the street is not: this site says "Centennial Drive", the old Sporty site
   said "1 Delaney Drive, Tauhara". `src/data/about.ts` → `venue.address`.
2. **Registered member count** and **number of volunteer coaches and helpers.**
   Stats without a stated source are not displayed. `src/data/quickFacts.ts` →
   `clubStats`.
3. **2026/27 fixture dates** once AWBoP publishes them. `src/data/events.ts`.
4. **Alt text for photos 26 and 34.** Both were wired up from the club's
   filename requests without a visual check, so the descriptions describe the
   slot each fills rather than what is actually in frame. `src/data/photos.ts`.
5. **Cards for the five people without one** — Ben McHale, Nicola Chamberlain,
   and the Get Set Go assistants Esme, Jordyn and Libby currently fall back to
   initials placeholders. This also needs a decision on Noel Bennett's role: his own
   profile card reads "Friend of the Committee" while the committee list has him
   as a Committee Member. `src/data/committee.ts`.

## API and admin

`api/` holds the Vercel serverless functions. `api/_guard.mjs` protects every
write endpoint and the attendance read; see `SECURITY.md` if present and the
environment variables in `.env.example`.

## Get Set Go volunteer dashboard

Admin portal → **Get Set Go Sessions** opens on tonight's club night (or the
next one, in NZ time) with the four stations as picture tiles. Each tile opens
a phone-friendly station card (equipment, set-up, numbered steps, cues, age
options, safety), with the Discovery / Developing / Consolidating detail and
source notes tucked behind expanders. **Generate Tonight's Cards** draws the
four volunteer cards in the browser and saves them as PNGs (for WhatsApp), a
ZIP, or an A4 PDF; on phones, **Share** sends the PNG through the share sheet.

Where the content comes from, in order of precedence:

1. **The Notion Rotations board** → `npm run pull:lessons` → `scripts/data/lessons.json`.
2. **Hand-condensed cards** in `scripts/data/station-cards.json` (all nine
   series and the Week 19 Mini Meet). A series without one would get cards
   built mechanically from the board, marked "check before sharing". Disagreements between Notion pages are
   listed per series under `conflicts` and shown in the dashboard's
   *For admin review* panel — they are never resolved silently.
3. `npm run build:sessions` turns both into `api/_data/sessions.mjs` (admin-only).
4. **Committee edits** made in the portal's editor are saved to the Notion
   database *Get Set Go — Station Cards* (created automatically under the
   19 Weekly Lessons page on the first save). Each row is one night + station
   and holds only the changed fields, so editing one Thursday never changes
   another and later board updates still flow through. If the board changes
   after a card was edited, the card is flagged *Board changed* with a
   side-by-side comparison in the editor.

**Week 19 Mini Meet.** The final night isn't a rotation night: the dashboard
shows its timed plan and four 8-minute activity zones (stickers, not rankings)
as zone cards with the same editor and exports, plus **Print skill passports**
(four per A4 page, one sticker box per zone) and **Print certificates**
(participation only, one per A4 page). Both print blank, or with the names of
Get Set Go (6 and under) members from the admin member list — the names are
only used in the print view. Any station or zone can have volunteers assigned
in the editor; their names print on that card.

**Adding station pictures.** Drop the files in a folder and run
`npm run add:images -- path/to/folder`. Files are matched by activity name
(`01_dead_ants.png` → `public/getsetgo/stations/dead-ants.jpg`), or by the
Series 5–9 package layout (`assets/series5/weekA/station1.png` → that night's
activity; `assets/mini_meet/zone1.png` → Mini Meet zone 1), cropped to
16:9, compressed, and the cards are rebuilt. The mapping lives in `images` in
`station-cards.json`. Pictures can also be uploaded per night from the editor
(they're stored on that night's Notion row). Illustrations are decoration only —
every instruction on a card is real text.

Tests: `npm test` (run sheets + station cards, security, station-card API).
