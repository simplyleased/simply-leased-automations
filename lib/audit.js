// Per-user audit log. Every meaningful action (who did what, when) is appended
// as one JSON object per line to logs/portal_audit.jsonl in the engine dir.
// logEvent returns whether the write DURABLY landed, so callers never claim an
// action was "logged" when it wasn't.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

function auditPath() {
  const dir = path.join(engineDir(), 'logs');
  fs.mkdirSync(dir, { recursive: true }); // may throw -> caller catches, returns false
  return path.join(dir, 'portal_audit.jsonl');
}

// actor = { userId, email }; action = string; details = any JSON-able object.
// Returns true iff the event was durably written; false on any failure.
export function logEvent(actor, action, details = {}) {
  const event = {
    ts: new Date().toISOString(),
    userId: actor?.userId || null,
    email: actor?.email || null,
    action,
    details,
  };
  let fd;
  try {
    fd = fs.openSync(auditPath(), 'a');
    fs.writeSync(fd, JSON.stringify(event) + '\n');
    fs.fsyncSync(fd); // flush to disk so an action never outlives its audit record
    return true;
  } catch (e) {
    console.error('[audit] failed to write event:', e && e.message);
    return false;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
  }
}

// Read the most recent N events (newest first). Also reports how many lines
// were corrupt/unparseable so a broken trail is visible, not silently dropped.
export function recentEvents(limit = 50) {
  try {
    const lines = fs.readFileSync(auditPath(), 'utf8').trim().split(/\r?\n/).filter(Boolean);
    let corrupt = 0;
    const events = lines.slice(-limit).reverse().map((l) => {
      try { return JSON.parse(l); } catch { corrupt++; return null; }
    }).filter(Boolean);
    return { events, corrupt, total: lines.length };
  } catch {
    return { events: [], corrupt: 0, total: 0 };
  }
}
