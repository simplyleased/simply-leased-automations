import { spawn } from 'node:child_process';
import { getAllowedUser, getPrivilegedUser } from '@/lib/user';
import { engineAvailable, engineDir } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Streams progress while running src/upload_statements.js. Dry-run is open to
// any allowed user; LIVE (writes to tenant AppFolio folders) is limited to the
// privileged users (Glen & Christian).
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const live = !!body.live;
  const smoke = !!body.smoke;
  const space = String(body.space || '').replace(/[^0-9]/g, '');

  const user = live ? await getPrivilegedUser() : await getAllowedUser();
  if (!user) {
    return new Response(live ? 'Live uploads are limited to Glen or Christian.' : 'Not authenticated', { status: live ? 403 : 401 });
  }
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const args = ['src/upload_statements.js'];
  if (smoke) args.push('--smoke');
  if (space) args.push('--space', space);
  if (live) args.push('--live');

  const dir = engineDir();
  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      const mode = live ? 'LIVE upload' : 'dry-run';
      send({ type: 'log', line: `Starting ${mode}${smoke ? ' (first 5 spaces)' : ''}${space ? ` (space ${space})` : ''}…` });
      logEvent(user, live ? 'upload_statements.start_live' : 'upload_statements.start_dry', { smoke, space: space || null });

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
        send({ type: 'log', line: 'Could not start the engine (is the AppFolio session live?).' });
        logEvent(user, 'upload_statements.failed', { reason: 'spawn_error', live });
        send({ type: 'result', ok: false });
        controller.close();
      });
      p.on('close', (code) => {
        if (buf.trim()) send({ type: 'log', line: clean(buf).trim() });
        const ok = code === 0;
        const audited = logEvent(user, ok ? (live ? 'upload_statements.done_live' : 'upload_statements.done_dry') : 'upload_statements.failed', { exitCode: code, live, smoke, space: space || null });
        send({ type: 'log', line: ok ? 'Done.' : 'Run failed — check the log above.' });
        send({ type: 'result', ok, audited });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
