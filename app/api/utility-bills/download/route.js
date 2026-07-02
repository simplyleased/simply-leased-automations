import fs from 'node:fs';
import path from 'node:path';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// Only these keys are downloadable — no arbitrary paths (prevents traversal).
function resolveFile(key, dir) {
  const newest = (re) => fs.readdirSync(dir)
    .filter((f) => re.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]?.f;

  let name, type;
  if (key === 'reconciliation') { name = newest(/^reconciliation_.*\.csv$/i); type = 'text/csv'; }
  else if (key === 'control-totals') { name = newest(/^control_totals_.*\.json$/i); type = 'application/json'; }
  else return null;

  if (!name) return null;
  return { name, full: path.join(dir, name), type };
}

export async function GET(req) {
  const user = await getAllowedUser();
  if (!user) return new Response('Not authenticated', { status: 401 });
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  const key = new URL(req.url).searchParams.get('file');
  const meta = resolveFile(key, engineDir());
  if (!meta) return new Response('Not found', { status: 404 });

  const data = fs.readFileSync(meta.full);
  logEvent(user, 'utility_bills.download', { key, file: meta.name });
  return new Response(data, {
    headers: {
      'Content-Type': meta.type,
      'Content-Disposition': `attachment; filename="${meta.name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
