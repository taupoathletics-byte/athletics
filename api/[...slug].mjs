// Vercel serverless function — a single catch-all that dispatches the club's
// email endpoints and the public access-code lookup, so they count as one
// function instead of six and the project stays under Vercel's Hobby-plan
// limit of 12 functions.
//
// The handlers themselves live in _-prefixed shared modules (not deployed as
// functions). The frontend still calls the same URLs — /api/familyemails,
// /api/membermail, /api/notice, /api/resultsemail, /api/unsubscribe and
// /api/codelookup — and this router forwards each to its handler.
import familyemails from './_familyemails.mjs';
import membermail from './_membermail.mjs';
import notice from './_notice.mjs';
import resultsemail from './_resultsemail.mjs';
import unsubscribe from './_unsubscribe.mjs';
import codelookup from './_codelookup.mjs';

const routes = { familyemails, membermail, notice, resultsemail, unsubscribe, codelookup };

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const name = (req.query?.slug?.[0]) || '';
  const fn = routes[name];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: 'not found' }));
  }
  return fn(req, res);
}
