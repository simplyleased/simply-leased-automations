import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir, parseCsv } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

const serialize = (rows) =>
  rows.map((r) => r.map((f) => {
    const s = String(f ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n') + '\r\n';

function latestRecon(dir) {
  const f = fs.readdirSync(dir)
    .filter((x) => /^reconciliation_.*\.csv$/i.test(x))
    .map((x) => ({ x, m: fs.statSync(path.join(dir, x)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0];
  return f ? path.join(dir, f.x) : null;
}

// Sets the charge_date column for every row in the current reconciliation CSV.
export async function POST(req) {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  if (!engineAvailable()) return NextResponse.json({ error: 'Engine offline.' }, { status: 409 });

  let date = '';
  try { date = String((await req.json()).date || '').trim(); } catch {}
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return NextResponse.json({ error: 'Use the format MM/DD/YYYY.' }, { status: 400 });

  try {
    const p = latestRecon(engineDir());
    if (!p) return NextResponse.json({ error: 'No reconciliation file found.' }, { status: 404 });

    const rows = parseCsv(fs.readFileSync(p, 'utf8')).filter((r) => r.length > 1);
    const idx = rows[0].map((h) => h.trim()).indexOf('charge_date');
    if (idx < 0) return NextResponse.json({ error: 'No charge_date column.' }, { status: 500 });

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idx] !== undefined) { rows[i][idx] = date; count++; }
    }
    fs.writeFileSync(p, serialize(rows));

    logEvent(user, 'utility_bills.set_charge_date', { date, rows: count, file: path.basename(p) });
    return NextResponse.json({ ok: true, date, count });
  } catch (e) {
    logEvent(user, 'utility_bills.set_charge_date_failed', { error: String((e && e.message) || e) });
    return NextResponse.json({ error: 'Could not update the charge date.' }, { status: 500 });
  }
}
