import { spawn } from 'node:child_process';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir, getReconciliation } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Streams newline-delimited JSON events so the UI can show live "thinking":
//   { type:'log', line }   - a progress line to display
//   { type:'result', ... } - the final outcome
export async function POST() {
  const user = await getAllowedUser();
  if (!user) return new Response('Not authenticated', { status: 401 });
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const dir = engineDir();
  // Strip absolute engine paths from any streamed line so we never show them.
  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      send({ type: 'log', line: 'Starting reconciliation…' });
      send({ type: 'log', line: 'Reading the utility statements and monthly reports…' });

      const p = spawn(process.execPath, ['src/reconcile.js'], { cwd: dir, shell: false });
      let buf = '';
      const onData = (d) => {
        buf += d.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = clean(buf.slice(0, idx)).trimEnd();
          buf = buf.slice(idx + 1);
          if (line) send({ type: 'log', line });
        }
      };
      p.stdout.on('data', onData);
      p.stderr.on('data', onData);

      p.on('error', () => {
        send({ type: 'log', line: 'Could not start the engine on this machine.' });
        logEvent(user, 'utility_bills.run_reconcile_failed', { reason: 'spawn_error' });
        send({ type: 'result', ok: false });
        controller.close();
      });
      p.on('close', (code) => {
        if (buf.trim()) send({ type: 'log', line: clean(buf).trim() });
        const ok = code === 0;
        const recon = getReconciliation();
        const audited = logEvent(user, ok ? 'utility_bills.run_reconcile' : 'utility_bills.run_reconcile_failed', {
          exitCode: code, okCount: recon.summary?.okCount,
        });
        send({ type: 'log', line: ok ? `Done — ${recon.summary?.okCount} residents ready to charge.` : 'Reconciliation failed on the engine.' });
        send({ type: 'result', ok, okCount: recon.summary?.okCount, flaggedCount: recon.summary?.flaggedCount, audited });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
