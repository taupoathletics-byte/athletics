// Shared admin-auth guard for the API functions.
// Files prefixed with "_" are not deployed as serverless functions by Vercel;
// they are shared modules imported by the real endpoints.
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'ta_admin'

export function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function sign(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET || '').update(payload).digest('hex')
}

function reject(res, message) {
  res.statusCode = 401
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ error: message }))
  return false
}

/** Why the session is not valid, or null when it is. */
function sessionProblem(req) {
  if (!process.env.SESSION_SECRET) return 'SESSION_SECRET is not configured on the server.'
  const token = parseCookies(req.headers && req.headers.cookie)[COOKIE]
  if (!token) return 'Not authenticated.'
  const dot = String(token).indexOf('.')
  if (dot < 0) return 'Invalid session.'
  const payload = String(token).slice(0, dot)
  const sig = String(token).slice(dot + 1)
  const expected = sign(payload)
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'Invalid session.'
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.exp || Date.now() > data.exp) return 'Session expired.'
  } catch {
    return 'Invalid session.'
  }
  return null
}

/**
 * True when the request carries a valid, unexpired admin session — WITHOUT
 * touching the response.
 *
 * Use this to vary what a handler *returns* rather than to gate it: for example
 * an endpoint that is public but hands back personal detail only to an admin.
 * For anything that must be blocked outright use `requireAdmin`.
 */
export function hasAdmin(req) {
  return sessionProblem(req) === null
}

/**
 * Returns true when the request carries a valid, unexpired admin session cookie,
 * otherwise writes a 401 and returns false. Call at the top of guarded handlers.
 */
export function requireAdmin(req, res) {
  const problem = sessionProblem(req)
  if (problem) return reject(res, problem)
  return true
}
