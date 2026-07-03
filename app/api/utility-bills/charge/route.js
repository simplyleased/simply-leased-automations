import { spawn } from 'node:child_process';
import { getAllowedUser, getPrivilegedUser } from '@/lib/user';
import { engineAvailable, engineDir } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Streams progress while running the charge bot. Dry-run (posts NOTHING) is open
// to any allowed user; LIVE posting (real money on ledgers) is limited to the
// privileged users (Glen & Christian). The bot is idempotent — safe to re-run.
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const live = !!body.live;
  const smoke = !!body.smoke;

  const user = live ? await getPrivilegedUser() : await getAllowedUser();
  if (!user) {
    return new Response(live ? 'Live charge posting is limited to Glen or Christian.' : 'Not authenticated', { status: live ? 403 : 401 });
  }
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const args = ['src/charge_bot.js'];
  if (smoke) args.push('--smoke');
  if (live) args.push('--live');

  const dir = engineDir();
  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      send({ type: 'log', line: `Starting ${live ? 'LIVE charge posting' : 'dry-run (nothing is posted)'}${smoke ? ' — smoke test (unit 27)' : ''}…` });
      logEvent(user, live ? 'utility_bills.charge_start_live' : 'utility_bills.charge_start_dry', { smoke });

      const p = spawn(process.execPath, args, { cwd: dir, shell: false });
      let buf = '';
      const onData = (d) => {
        buf += d.toString();
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const l = clean(buf.slice(0, i)).trimEnd();
          buf = buf.slice(i + 1);
          if (l) send({ type: 'log', line: l });
        }
      };
      p.stdout.on('data', onData);
      p.stderr.on('data', onData);
      p.on('error', () => {
        send({ type: 'log', line: 'Could not start the charge bot (is the AppFolio session live?).' });
        logEvent(user, 'utility_bills.charge_failed', { reason: 'spawn_error', live });
        send({ type: 'result', ok: false });
        controller.close();
      });
      p.on('close', (code) => {
        if (buf.trim()) send({ type: 'log', line: clean(buf).trim() });
        const ok = code === 0;
        const audited = logEvent(user, ok ? (live ? 'utility_bills.charge_done_live' : 'utility_bills.charge_done_dry') : 'utility_bills.charge_failed', { exitCode: code, live, smoke });
        send({ type: 'log', line: ok ? 'Done.' : 'Charge run failed — check the log above.' });
        send({ type: 'result', ok, audited });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
