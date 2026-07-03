import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { askClaude, askWithContext } from '@/lib/claude';
import { knowledgeAvailable, searchKnowledge } from '@/lib/knowledge';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let question = '', scope = 'all';
  try { const b = await req.json(); question = String(b.question || '').slice(0, 1000).trim(); scope = String(b.scope || 'all'); } catch {}
  if (!question) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });

  try {
    let answer;
    let sources = [];
    if (knowledgeAvailable()) {
      const chunks = searchKnowledge(question, 6, scope);
      if (chunks.length) {
        const context = chunks.map((c) => `[${c.source}]\n${c.text}`).join('\n\n---\n\n').slice(0, 9000);
        answer = await askWithContext(question, context);
        sources = [...new Set(chunks.map((c) => c.source))];
      } else {
        answer = await askClaude(question); // no matching conversations → base facts
      }
    } else {
      answer = await askClaude(question); // export not on this machine → base facts
    }
    logEvent(user, 'knowledgebase.ask', { q: question.slice(0, 120), sources: sources.length });
    return NextResponse.json({ answer, sources });
  } catch (e) {
    const msg = String((e && e.message) || e);
    return NextResponse.json({ error: msg.includes('key') ? 'The assistant isn’t configured on this machine.' : 'The assistant is unavailable right now.' }, { status: 500 });
  }
}
