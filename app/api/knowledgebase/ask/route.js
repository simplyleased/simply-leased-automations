import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { askClaude } from '@/lib/claude';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let question = '';
  try { question = String((await req.json()).question || '').slice(0, 1000).trim(); } catch {}
  if (!question) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });

  try {
    const answer = await askClaude(question);
    logEvent(user, 'knowledgebase.ask', { q: question.slice(0, 120) });
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = String((e && e.message) || e);
    return NextResponse.json({ error: msg.includes('key') ? 'The assistant isn’t configured on this machine.' : 'The assistant is unavailable right now.' }, { status: 500 });
  }
}
