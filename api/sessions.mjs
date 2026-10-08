// Vercel serverless function — the Get Set Go run sheets.
//
// GATED. These run sheets used to sit at public/getsetgo/sessions.json, where
// the login screen hid them from view but anyone with the URL could download
// them (the file was served statically, no session required). They are now
// served only to a signed-in admin from api/_data/sessions.mjs, which is never
// served statically.
import { requireAdmin } from './_guard.mjs';
import sessions from './_data/sessions.mjs';

export const config = { maxDuration: 60 };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  return send(res, 200, sessions);
}
