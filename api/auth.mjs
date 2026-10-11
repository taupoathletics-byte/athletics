// Admin passcode login. Verifies the shared passcode and sets an
// HttpOnly, Secure, SameSite=Lax session cookie (HMAC-signed, expiring).
import { createHmac, timingSafeEqual } from 'node:crypto'
import { clientIp } from './_safety.mjs'

const COOKIE = 'ta_admin'
const SESSION_HOURS = 12

// Basic per-instance brute-force protection (resets on cold start; good enough
// for a club site, and combined with a delay on failure).
const attempts = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 10
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function rateLimited(ip) {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > MAX_ATTEMPTS
}

function sign(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET || '').update(payload).digest('hex')
}

function send(res, code, obj, extraHeaders = {}) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => { data += c })
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export default async function handler(req, res) {
  // Logout: expire the cookie on the server. Hiding the portal in the browser is
  // not enough — the HttpOnly cookie would stay valid for the rest of its 12 hours
  // on a shared sign-in-desk device.
  if (req.method === 'DELETE') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` })
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

  const passcode = process.env.ADMIN_PASSCODE
  const secret = process.env.SESSION_SECRET
  if (!passcode || !secret) {
    return send(res, 500, { error: 'ADMIN_PASSCODE and SESSION_SECRET must be configured on the server.' })
  }

  const ip = clientIp(req)
  if (rateLimited(ip)) return send(res, 429, { error: 'Too many attempts. Try again shortly.' })

  const body = await readBody(req)
  if (!safeEqual(body.passcode || '', passcode)) {
    await sleep(800) // slow brute force
    return send(res, 401, { error: 'Incorrect passcode.' })
  }

  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  const token = `${payload}.${sign(payload)}`
  const cookie = `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 60 * 60}`

  return send(res, 200, { ok: true }, { 'Set-Cookie': cookie })
}
