// Per-user audit log. Every meaningful action (who did what, when) is appended
// as one JSON object per line to logs/portal_audit.jsonl in the engine dir
// (kept off GitHub). Simple + durable-enough to start; easy to migrate to a DB.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

function auditPath() {
  const dir = path.join(engineDir(), 'logs');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, 'portal_audit.jsonl');
}

// actor = { userId, email }; action = string; details = any JSON-able object.
export function logEvent(actor, action, details = {}) {
  const event = {
    ts: new Date().toISOString(),
    userId: actor?.userId || null,
    email: actor?.email || null,
    action,
    details,
  };
  try {
    fs.appendFileSync(auditPath(), JSON.stringify(event) + '\n');
  } catch (e) {
    // Never let audit failure break the action; surface to server logs only.
    console.error('[audit] failed to write event:', e && e.message);
  }
  return event;
}

// Read the most recent N events (newest first). Best-effort.
export function recentEvents(limit = 50) {
  try {
    const lines = fs.readFileSync(auditPath(), 'utf8').trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}
