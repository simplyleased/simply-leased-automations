import { spawn } from 'node:child_process';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Streams the ad-hoc browser agent (src/browser_agent.js) running on the office
// machine's authenticated Chromium. Money & irreversible actions are hard-blocked
// inside the agent itself, so this is open to any allowed user; every run is
// audit-logged. On the cloud the engine is absent → "engine offline".
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const task = String(body.task || '').slice(0, 2000).trim();
  const live = body.live !== false; // this endpoint executes by default

  const user = await getAllowedUser();
  if (!user) return new Response('Not authenticated', { status: 401 });
  if (!task) return new Response('Describe a task first.', { status: 400 });
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const dir = engineDir();
  const args = ['src/browser_agent.js', '--task', task];
  if (live) args.push('--live');

  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      send({ type: 'log', line: live ? 'Starting a live browser run — watch it work below…' : 'Starting a read-only preview…' });
      logEvent(user, live ? 'browser.run_live' : 'browser.run_preview', { task: task.slice(0, 120) });

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
        send({ type: 'log', line: 'Could not start the browser agent on this machine.' });
        logEvent(user, 'browser.failed', { reason: 'spawn_error', live });
        send({ type: 'result', ok: false });
        controller.close();
      });
      p.on('close', (code) => {
        if (buf.trim()) send({ type: 'log', line: clean(buf).trim() });
        const ok = code === 0;
        const audited = logEvent(user, ok ? (live ? 'browser.done_live' : 'browser.done_preview') : 'browser.failed', { exitCode: code, live });
        send({ type: 'log', line: ok ? 'Run finished.' : 'Run failed — check the log above.' });
        send({ type: 'result', ok, audited });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
