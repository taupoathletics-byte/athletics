// Normalise "Taupō" (and any other macron-vowel) to the precomposed U+014D
// form. Fixes both double-encoded mojibake ("Å\u008D") and "o" + combining
// macron (U+0304), which renders as "Taupo¯" in many fonts.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'index.html', 'public/getsetgo/index.html', 'public/getsetgo/script.js'];

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx|html|js|json)$/.test(name)) files.push(p);
  }
}
walk('src');
files.push('index.html', 'public/getsetgo/index.html', 'public/getsetgo/script.js');

let fixed = 0;
for (const f of files) {
  let text = readFileSync(f, 'utf8');
  const before = text;
  // 1. double-encoded mojibake: "Å" (U+00C5) + U+008D  ->  ō (U+014D)
  text = text.replace(/\u00C5\u008D/g, '\u014D');
  // 2. combining macron after o (and other vowels), rendered as "o" + U+0304
  text = text.replace(/o\u0304/g, '\u014D');
  text = text.replace(/a\u0304/g, '\u0101');
  text = text.replace(/e\u0304/g, '\u0113');
  text = text.replace(/i\u0304/g, '\u012B');
  text = text.replace(/u\u0304/g, '\u016B');
  if (text !== before) {
    writeFileSync(f, text, 'utf8');
    fixed++;
  }
}
console.log(`Fixed ${fixed} of ${files.length} files.`);
