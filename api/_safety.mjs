// Shared input-validation and abuse-protection helpers for the API functions.
// Files prefixed with "_" are not deployed as serverless functions by Vercel.

/** Notion page / database IDs: 32 hex chars, with or without dashes. */
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

export function isNotionId(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Compare two Notion IDs regardless of dashes/case. */
export function sameNotionId(a, b) {
  const norm = (s) => String(s || '').replace(/-/g, '').toLowerCase()
  return norm(a) !== '' && norm(a) === norm(b)
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
}

/** Today's date in New Zealand (club nights are local), as YYYY-MM-DD. */
export function nzToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Minutes since midnight in New Zealand, for the 4:30pm check-in gate. */
export function nzMinutesSinceMidnight(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(now)
  const h = Number(p.find((x) => x.type === 'hour')?.value)
  const m = Number(p.find((x) => x.type === 'minute')?.value)
  return h * 60 + m
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000)
}

export function clientIp(req) {
  const h = (req && req.headers) || {}
  return String(h['x-real-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
}

/**
 * Fixed-window, per-instance rate limiter. Serverless instances are short-lived
 * so this is a speed bump rather than a wall — enough to stop casual scraping.
 */
export function rateLimiter({ max, windowMs }) {
  const hits = new Map()
  return function limited(key) {
    const now = Date.now()
    const rec = hits.get(key)
    if (!rec || now >= rec.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k)
      return false
    }
    rec.count += 1
    return rec.count > max
  }
}

/** Log the real error server-side; tell a public caller only that it failed. */
export function publicError(res, send, e) {
  console.error(e)
  return send(res, 500, { error: 'Something went wrong on our side. Please try again in a moment.' })
}
