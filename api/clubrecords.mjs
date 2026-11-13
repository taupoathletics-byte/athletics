// Public: the Club Records board — the club's historical records, plus any
// club-night result that has since beaten or equalled one (see _clubrecords.mjs).
// Only record HOLDERS are returned (name, grade, gender, mark, date), as the
// club has always published; every other club-night result stays private.
import { publicError } from './_safety.mjs';
import { BASE_AS_AT, publicBoard } from './_clubrecords.mjs';
import { recordRows } from './records.mjs';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const send = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  if (req.method !== 'GET') return send(405, { error: 'method not allowed' });
  if (!process.env.NOTION_TOKEN) return send(500, { error: 'NOTION_TOKEN is not configured on the server.' });
  try {
    const rows = await recordRows();
    // Cached at the edge for a few minutes: a new record shows up shortly after it's saved.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return send(200, { asAt: BASE_AS_AT, events: publicBoard(rows) });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return publicError(res, (r, code, obj) => send(code, obj), e);
  }
}
