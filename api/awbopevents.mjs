// Public: upcoming children's competitions from the Athletics Waikato Bay of
// Plenty events calendar (athleticswaikatobayofplenty.org.nz/competition/events/),
// which is where the club takes its Ribbon Day dates from.
//
// The calendar is an EventON WordPress page. Each event card carries its title
// (itemprop='name'), a "data-time" start–end in Unix seconds and a JSON
// "data-d" with the venue. We keep only the events our athletes go to —
// Ribbon Days, Colgate Games, the Children's Championships, the Pentathlon and
// the Short and Sweet meet — and cache the answer at the edge for six hours, so
// new or moved dates show up on their own.
export const config = { maxDuration: 30 };

export const SOURCE = 'https://athleticswaikatobayofplenty.org.nz/competition/events/';
const KEEP = /ribbon day|colgate|children'?s|pentathlon|short (and|&) sweet|relay champ/i;

const decode = (s) => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** "2026-11-21" in New Zealand time for a Unix time. */
function nzDate(seconds) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(seconds * 1000));
}

export function parseEvents(htmlText) {
  const out = [];
  const seen = new Set();
  for (const block of String(htmlText).split('class="eventon_list_event ').slice(1)) {
    const title = block.match(/evcal_event_title[^>]*>([\s\S]*?)<\/span>/);
    const time = block.match(/data-time="(\d+)-(\d+)"/);
    if (!title || !time) continue;
    const name = decode(title[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!KEEP.test(name)) continue;
    let venue = '';
    const data = block.match(/data-d="([^"]*)"/);
    if (data) { try { venue = JSON.parse(decode(data[1]))['loc.n'] || ''; } catch { /* no venue */ } }
    const url = (block.match(/itemprop='url'\s+href='([^']+)'/) || [])[1] || '';
    const start = nzDate(Number(time[1]));
    // EventON ends single-day events at 23:59:59, which is still the same day.
    const end = nzDate(Number(time[2]) - 1);
    const key = `${name}|${start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: name.replace(/\s*\|\s*/g, ' — '), start, ...(end > start ? { end } : {}), venue: decode(venue), url: /^https:\/\/athleticswaikatobayofplenty\.org\.nz\//.test(url) ? url : '' });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export default async function handler(req, res) {
  const send = (code, obj, cache) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', cache);
    res.end(JSON.stringify(obj));
  };
  if (req.method !== 'GET') return send(405, { error: 'method not allowed' }, 'no-store');
  try {
    const r = await fetch(SOURCE, { headers: { 'User-Agent': 'TaupoAthleticsClub/1.0 (+club website calendar)' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`AWBoP calendar answered ${r.status}`);
    const events = parseEvents(await r.text());
    return send(200, { source: SOURCE, fetchedAt: new Date().toISOString(), events }, 'public, s-maxage=21600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('awbop events', e);
    return send(502, { error: 'Could not read the AWBoP calendar right now.', source: SOURCE }, 'public, s-maxage=300');
  }
}
