// Vercel serverless function — a single catch-all that dispatches the club's
// email endpoints, so they count as one function instead of five and the
// project stays under Vercel's Hobby-plan limit of 12 functions.
//
// The handlers themselves live in _-prefixed shared modules (not deployed as
// functions). The frontend still calls the same URLs — /api/familyemails,
// /api/membermail, /api/notice, /api/resultsemail and /api/unsubscribe — and
// this router forwards each to its handler.
import familyemails from './_familyemails.mjs';
import incidents from './_incidents.mjs';
import membermail from './_membermail.mjs';
import notice from './_notice.mjs';
import resultsemail from './_resultsemail.mjs';
import unsubscribe from './_unsubscribe.mjs';

const routes = { familyemails, incidents, membermail, notice, resultsemail, unsubscribe };

export const config = { maxDuration: 60 };

/** The endpoint name: the first path segment after /api/ (e.g. "notice"). */
function routeName(req) {
  const slug = req.query?.slug;
  if (Array.isArray(slug)) return slug[0] || '';
  if (typeof slug === 'string' && slug) return slug;
  const parts = String(req.url || '').split('?')[0].split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  return parts[0] || '';
}

export default async function handler(req, res) {
  const name = routeName(req);
  const fn = routes[name];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: 'not found' }));
  }
  return fn(req, res);
}
