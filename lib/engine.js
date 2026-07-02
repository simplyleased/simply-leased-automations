// Access to the LOCAL automation engine + data (reconciliation CSVs, control
// totals, secrets). This only works when the portal runs on the machine that
// holds the tenant data — on Railway (cloud) ENGINE_DIR is absent, so callers
// get { available:false } and the UI degrades to an "engine offline" state.
import fs from 'node:fs';
import path from 'node:path';

export function engineDir() {
  return process.env.ENGINE_DIR || path.resolve(process.cwd(), '..');
}

export function engineAvailable() {
  try {
    const dir = engineDir();
    return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => /^reconciliation_.*\.csv$/i.test(f));
  } catch {
    return false;
  }
}

// Minimal, quote-aware CSV parser (matches the engine's own output format).
export function parseCsv(text) {
  const rows = [];
  let field = '', row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function latestReconciliationPath(dir) {
  const files = fs.readdirSync(dir)
    .filter((f) => /^reconciliation_.*\.csv$/i.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return files.length ? path.join(dir, files[0].f) : null;
}

const money = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

// Returns the current reconciliation as structured data + summary, or
// { available:false } when no engine/data is present (e.g. on Railway).
export function getReconciliation() {
  try {
    if (!engineAvailable()) return { available: false };
    const dir = engineDir();
    const csvPath = latestReconciliationPath(dir);
    if (!csvPath) return { available: false };

    const raw = parseCsv(fs.readFileSync(csvPath, 'utf8')).filter((r) => r.length > 1);
    if (!raw.length) return { available: false, error: 'The reconciliation file is present but empty or malformed.' };
    const header = raw[0].map((h) => h.trim());
    const idx = (name) => header.indexOf(name);
    const rows = raw.slice(1).map((r) => ({
      unit: r[idx('unit')],
      resident: r[idx('resident')],
      electric: money(r[idx('electric_total')]),
      water: money(r[idx('water_total')]),
      serviceStart: r[idx('service_start')],
      serviceEnd: r[idx('service_end')],
      month: r[idx('billing_month_year')],
      chargeDate: r[idx('charge_date')],
      status: (r[idx('status')] || '').trim(),
    }));

    const isOk = (s) => /^ok$/i.test(s);
    const isFlagged = (s) => /^flagged/i.test(s);
    const ok = rows.filter((x) => isOk(x.status));
    const flagged = rows.filter((x) => isFlagged(x.status));
    const other = rows.filter((x) => !isOk(x.status) && !isFlagged(x.status));

    const summary = {
      totalRows: rows.length,
      okCount: ok.length,
      flaggedCount: flagged.length,
      otherCount: other.length,
      chargeCount: ok.reduce((s, x) => s + (x.electric > 0 ? 1 : 0) + (x.water > 0 ? 1 : 0), 0),
      electricTotal: money(ok.reduce((s, x) => s + x.electric, 0)),
      waterTotal: money(ok.reduce((s, x) => s + x.water, 0)),
      month: rows[0]?.month || '',
    };

    // Optional: expected control totals written by reconcile.js
    let controlTotals = null;
    const ctPath = fs.readdirSync(dir).find((f) => /^control_totals_.*\.json$/i.test(f));
    if (ctPath) {
      try { controlTotals = JSON.parse(fs.readFileSync(path.join(dir, ctPath), 'utf8')); } catch {}
    }

    return { available: true, csvFile: path.basename(csvPath), rows, summary, controlTotals };
  } catch (e) {
    console.error('[engine] getReconciliation failed:', e && e.message);
    return { available: false, error: 'Could not read the reconciliation data.' };
  }
}
