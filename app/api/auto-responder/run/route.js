import { spawn } from 'node:child_process';
import { getAllowedUser, getPrivilegedUser } from '@/lib/user';
import { autoResponderDir, autoResponderAvailable } from '@/lib/autoresponder';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Streams progress while running the Auto-responder engine. Dry-run preview is
// open to any allowed user; LIVE (actually sends SMS) is limited to Glen & Christian.
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const live = !!body.live;

  const user = live ? await getPrivilegedUser() : await getAllowedUser();
  if (!user) {
    return new Response(live ? 'Live sending is limited to Glen or Christian.' : 'Not authenticated', { status: live ? 403 : 401 });
  }
  if (!autoResponderAvailable()) return new Response('Auto-responder engine not found on this machine.', { status: 409 });

  const dir = autoResponderDir();
  const args = ['src/index.js'];
  if (!live) args.push('--dry-run');

  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      send({ type: 'log', line: live ? 'Starting LIVE run (will send texts)…' : 'Starting dry-run preview (no texts sent)…' });
      logEvent(user, live ? 'auto_responder.start_live' : 'auto_responder.start_dry', {});

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
        send({ type: 'log', line: 'Could not start the Auto-responder engine.' });
        logEvent(user, 'auto_responder.failed', { reason: 'spawn_error', live });
        send({ type: 'result', ok: false });
        controller.close();
      });
      p.on('close', (code) => {
        if (buf.trim()) send({ type: 'log', line: clean(buf).trim() });
        const ok = code === 0;
        const audited = logEvent(user, ok ? (live ? 'auto_responder.done_live' : 'auto_responder.done_dry') : 'auto_responder.failed', { exitCode: code, live });
        send({ type: 'log', line: ok ? 'Done. See the Send Log for details.' : 'Run failed — check the log above.' });
        send({ type: 'result', ok, audited });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
