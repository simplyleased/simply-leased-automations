'use client';
import { useState } from 'react';

export default function KnowledgebaseClient() {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(e) {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { role: 'u', text: question }]);
    setQ(''); setBusy(true);
    try {
      const r = await fetch('/api/knowledgebase/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }),
      });
      const j = await r.json();
      setMsgs((m) => [...m, { role: 'a', text: r.ok ? j.answer : '⚠ ' + (j.error || 'Error'), sources: j.sources || [] }]);
    } catch {
      setMsgs((m) => [...m, { role: 'a', text: '⚠ Could not reach the assistant.', sources: [] }]);
    }
    setBusy(false);
  }

  return (
    <div className="kb-chat">
      <div className="kb-msgs">
        {msgs.length === 0 && (
          <div className="hint">Ask anything from the text conversations — e.g. “What did we tell the 1330 Liberty applicants about pets?” or “Any parking questions at Manhattan?”</div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`kb-b ${m.role}`}>
            {m.text}
            {m.role === 'a' && m.sources && m.sources.length > 0 && (
              <div className="kb-src">📎 {m.sources.slice(0, 5).join(' · ')}</div>
            )}
          </div>
        ))}
        {busy && <div className="kb-b a">…</div>}
      </div>
      <form className="kb-in" onSubmit={ask}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the knowledgebase…" />
        <button className="btn primary" disabled={busy}>Ask</button>
      </form>
    </div>
  );
}
