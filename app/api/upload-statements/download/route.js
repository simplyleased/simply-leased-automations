import fs from 'node:fs';
import path from 'node:path';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Downloads the most recent upload run log.
export async function GET() {
  const user = await getAllowedUser();
  if (!user) return new Response('Not authenticated', { status: 401 });
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const dir = path.join(engineDir(), 'logs');
  let name;
  try {
    name = fs.readdirSync(dir)
      .filter((f) => /^upload-.*\.log$/i.test(f))
      .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0]?.f;
  } catch { /* no logs dir yet */ }

  if (!name) return new Response('No upload log yet — run it first.', { status: 404 });

  const data = fs.readFileSync(path.join(dir, name));
  logEvent(user, 'upload_statements.download', { file: name });
  return new Response(data, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
