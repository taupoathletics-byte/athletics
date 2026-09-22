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

Inter and Source Serif 4, self-hosted via `@fontsource-variable`.

Do not switch the display font back to Fraunces: it has no glyph for `ō`
(U+014D), so the browser synthesises one and the club's own name renders as
"Taupo¯Athletics Club". Any replacement display font must be checked against
the string "Taupō" in a real screenshot before it ships.

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
