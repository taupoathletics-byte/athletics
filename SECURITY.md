# Security — Taupō Athletics Club site

This site holds information about children, so the bar is: **nothing about a
child leaves the server unless a committee member is signed in, or a family has
entered their own access code.**

## How access works

| Who | How | Can see |
|---|---|---|
| Public | — | Club info, the **top 10 per event** record board, the self check-in page |
| Family | Access code from the sign-in desk → `/my-results` | Their own children's results only |
| Committee | Shared passcode → `/getsetgo` (12-hour HttpOnly cookie) | Run sheets, check-in, attendance, all results, access codes |

- The passcode is checked server-side in `api/auth.mjs`; nothing secret is in
  the browser code. Sessions are HMAC-signed with `SESSION_SECRET`.
- **Logout now ends the session on the server** (`DELETE /api/auth`). Before,
  it only hid the portal, and the cookie stayed valid on that device for 12 hours.
- Every write endpoint and every endpoint that returns personal detail calls
  `requireAdmin()` from `api/_guard.mjs`.

## Review — October 2026

Fixed in this change (covered by `node scripts/test_security.mjs`, which fakes
Notion and runs offline):

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High | `GET /api/records` sent **every result for every child** (full names, grades, dates, member IDs) to anyone. The Club Records page only *displayed* the top 10, but the filtering happened in the browser. | The server now sends the public only the top 10 per event, without member IDs. Admins still get everything. |
| 2 | High | The public check-in search (`/api/checkin?q=`) accepted one-letter searches with no rate limit, returning full names. About 700 requests would list every junior member's full name. | At least 2 letters, 60 searches per 10 min per IP, and results show the first name and surname initial only ("Mia S."). Check-in now submits the picked member IDs. |
| 3 | Medium | Logout didn't invalidate the session cookie (see above). | Server-side logout. |
| 4 | Medium | Record delete archived **any** Notion page ID it was given, and the ID went into the URL path unchecked (`../blocks/…`). | The ID must be a Notion ID, and the page must belong to the Club Records database. |
| 5 | Low | Public check-in accepted any date. | Only this week's club night (today, or up to 7 days back). |
| 6 | Low | Public endpoints returned raw Notion error text. | Generic message to the public, with detail in the server log (admins still see detail). |
| 7 | Low | A malformed cookie could crash a function (`decodeURIComponent` throw). | Parsed safely. |
| 8 | Low | No clickjacking/sniffing protection headers. | `vercel.json` adds `frame-ancestors 'self'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS, and stops search engines indexing `/getsetgo` and `/api`. |
| 9 | Low | `sharp` (dev only) had a high-severity advisory. | Updated via `npm audit fix`. |

Checked and found OK: no secrets or member data anywhere in the git history of
either repo; the admin portal escapes everything it renders (no XSS); passcode
comparison is timing-safe with a login rate limit; access codes are 8
characters, so guessing is impractical at the rate limit.

## Still to do — committee decisions

1. **Make `taupoathletics-byte/athletics` private again.** It was made public
   for this review. `api/_data/runJumpThrow.mjs` and `rjtActivities.mjs` contain
   Athletics NZ's Run Jump Throw material, used under the club's licence, and
   the site deliberately serves it only to signed-in admins. A public repo
   publishes it. The Get Set Go run sheets are in there too.
2. **The public record board shows children's full names** next to their
   results. It's the club's call, but check it's covered by the same consent as
   the photos. Showing "Mia S." instead is a one-line change in `publicBoard()`
   in `api/records.mjs`.
3. **Use a strong passcode and rotate it** when the committee changes. Use a
   32+ byte random `SESSION_SECRET`, and change it to sign everyone out.
4. **Limit the Notion integration** to the *Athletics* page only, so a leaked
   token can't reach the rest of the workspace.
5. **Printed access-code sheets are passwords.** Keep them at the desk and
   shred old ones. If a code leaks, run `scripts/notion_access_codes.mjs` (or
   clear the code in Notion) to issue a new one.
6. `react-router-dom` 6 has a moderate advisory (open redirect via `<Link>`).
   This site never navigates to a user-supplied URL, so it isn't exploitable
   here. The fix needs the v7 upgrade, which can go in later.
7. Rate limits are per serverless instance (in memory). That's fine for a club
   site; use Vercel's firewall if it ever needs to be stricter.
8. The API works out grades as `2026 − birth year`. Update this for the 2027/28
   season (`api/records.mjs`, `api/myrecords.mjs`).
