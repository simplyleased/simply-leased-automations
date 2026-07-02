import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir, getReconciliation } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    let out = '', err = '';
    const p = spawn(cmd, args, { cwd, shell: false });
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
    p.on('error', (e) => resolve({ code: -1, out, err: String(e) }));
  });
}

export async function POST() {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  if (!engineAvailable()) {
    return NextResponse.json({ error: 'Engine offline — run the portal on the machine with the data.' }, { status: 409 });
  }

  // Re-run the pure-data reconciliation step (no browser, no charges).
  const res = await run(process.execPath, ['src/reconcile.js'], engineDir());
  const ok = res.code === 0;
  const recon = getReconciliation();

  const audited = logEvent(user, ok ? 'utility_bills.run_reconcile' : 'utility_bills.run_reconcile_failed', {
    exitCode: res.code,
    okCount: recon.summary?.okCount,
    tail: String(res.out || res.err || '').slice(-400), // kept server-side only, in the audit log
  });

  if (!ok) {
    // Do not return the engine's raw stderr (it can contain absolute paths); it's in the audit log.
    return NextResponse.json({ error: 'Reconciliation failed on the engine.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, okCount: recon.summary?.okCount, flaggedCount: recon.summary?.flaggedCount, audited });
}
