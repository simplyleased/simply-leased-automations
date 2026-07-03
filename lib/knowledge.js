// Retrieval over the exported text-conversation knowledge (the "Text History"
// project: knowledge/*.md compiled from all ~10k AppFolio conversations).
// Too large for one prompt, so we keyword-rank chunks and feed the top ones to
// Claude. Local-only (like the rest of the engine); absent on the cloud.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

export function textHistoryDir() {
  return process.env.TEXT_HISTORY_DIR || path.resolve(engineDir(), '..', 'Text History');
}

function knowledgeRoot() {
  return path.join(textHistoryDir(), 'knowledge');
}

export function knowledgeAvailable() {
  try { return fs.existsSync(knowledgeRoot()); } catch { return false; }
}

function splitChunks(text, size = 1500) {
  const paras = text.split(/\n{2,}/);
  const out = [];
  let cur = '';
  for (const p of paras) {
    if (cur && (cur.length + p.length + 2) > size) { out.push(cur); cur = p; }
    else cur = cur ? cur + '\n\n' + p : p;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

let CACHE = null;
function loadChunks() {
  if (CACHE) return CACHE;
  const root = knowledgeRoot();
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.md$/i.test(e.name)) files.push(p);
    }
  })(root);

  const chunks = [];
  for (const f of files) {
    const source = path.relative(root, f).replace(/\\/g, '/');
    let text = '';
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const part of splitChunks(text)) chunks.push({ source, text: part });
  }
  CACHE = { chunks, fileCount: files.length };
  return CACHE;
}

export function knowledgeStats() {
  try { const { chunks, fileCount } = loadChunks(); return { fileCount, chunkCount: chunks.length }; }
  catch { return { fileCount: 0, chunkCount: 0 }; }
}

// Keyword-rank chunks for a question; filename (property) matches are boosted.
export function searchKnowledge(question, k = 6) {
  const { chunks } = loadChunks();
  const terms = [...new Set((String(question).toLowerCase().match(/[a-z0-9]{3,}/g) || []))];
  if (!terms.length) return [];

  const scored = [];
  for (const c of chunks) {
    const lc = c.text.toLowerCase();
    const src = c.source.toLowerCase();
    let score = 0;
    for (const t of terms) {
      let idx = 0, n = 0;
      while ((idx = lc.indexOf(t, idx)) >= 0 && n < 5) { n++; idx += t.length; }
      score += n;
      if (src.includes(t)) score += 4;
    }
    if (score > 0) scored.push({ c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => x.c);
}
