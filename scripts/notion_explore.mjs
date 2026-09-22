// Notion exploration helper — reads page/database structure via the REST API.
// Usage: NOTION_TOKEN=... node scripts/notion_explore.mjs <id> [<id> ...]
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
const VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': VERSION },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

function titleOf(block) {
  const t = block.type;
  try {
    if (t === 'child_page') return block[t].title;
    if (t === 'child_database') return block[t].title;
    if (t === 'database') {
      const title = block.title;
      return Array.isArray(title) ? title.map(x => x.plain_text || x.text?.content).join('') : '';
    }
    if (block[t] && block[t].rich_text) return block[t].rich_text.map(x => x.plain_text).join('');
    if (block[t] && block[t].title) return block[t].title.map(x => x.plain_text).join('');
    if (block[t] && block[t].caption) return block[t].caption.map(x => x.plain_text).join('');
  } catch {}
  return '';
}

async function listChildren(id) {
  const out = [];
  let cursor = undefined;
  do {
    const q = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : '';
    const res = await get(`/blocks/${id}/children${q}`);
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function summarize(id, depth = 0) {
  const pad = '  '.repeat(depth);
  let obj;
  try {
    obj = await get(`/blocks/${id}`);
  } catch (e) {
    console.log(`${pad}[${id}] ERROR ${e.message}`);
    return null;
  }
  const t = obj.type;
  const title = titleOf(obj);
  console.log(`${pad}• ${t}  ${title ? '“' + title + '”' : ''}  (${id})`);
  if (t === 'child_database' || t === 'database') {
    // print schema
    try {
      const db = await get(`/databases/${id}`);
      console.log(`${pad}  DB title: ${db.title?.map(x => x.plain_text).join('') || ''}`);
      for (const [k, v] of Object.entries(db.properties)) {
        console.log(`${pad}    prop: ${k} :: ${v.type}`);
      }
    } catch (e) {
      console.log(`${pad}  (no db schema: ${e.message})`);
    }
    return obj;
  }
  // children
  if (obj.has_children) {
    const children = await listChildren(id);
    console.log(`${pad}  children (${children.length}):`);
    for (const c of children) {
      const ct = c.type;
      const cTitle = titleOf(c);
      console.log(`${pad}    - ${ct}  ${cTitle ? '“' + cTitle + '”' : ''}  (${c.id})`);
    }
  }
  return obj;
}

const ids = process.argv.slice(2);
const all = {};
for (const id of ids) {
  console.log(`\n=== ${id} ===`);
  all[id] = await summarize(id);
}
writeFileSync(process.env.TEMP + '\\notion_explore.json', JSON.stringify(all, null, 2), 'utf8');
console.log(`\nSaved summary to ${process.env.TEMP}\\notion_explore.json`);
