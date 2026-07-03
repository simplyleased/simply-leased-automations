import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { planTask } from '@/lib/claude';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let task = '';
  try { task = String((await req.json()).task || '').slice(0, 2000).trim(); } catch {}
  if (!task) return NextResponse.json({ error: 'Describe a task.' }, { status: 400 });

  try {
    const plan = await planTask(task);
    logEvent(user, 'browser.plan', { task: task.slice(0, 120) });
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'The planner is unavailable right now.' }, { status: 500 });
  }
}
