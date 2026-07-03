'use client';
import { useState } from 'react';

export default function BrowserClient() {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const task = q.trim();
    if (!task || busy) return;
    setMsgs((m) => [...m, { role: 'u', text: task }]);
    setQ(''); setBusy(true);
    try {
      const r = await fetch('/api/browser/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task }),
      });
      const j = await r.json();
      setMsgs((m) => [...m, { role: 'a', text: r.ok ? j.plan : '⚠ ' + (j.error || 'Error') }]);
    } catch {
      setMsgs((m) => [...m, { role: 'a', text: '⚠ Could not reach the planner.' }]);
    }
    setBusy(false);
  }

  return (
    <div className="kb-chat">
      <div className="kb-msgs">
        {msgs.length === 0 && (
          <div className="hint">Describe a one-off task — e.g. “Fill out the THP tenant list for 1330 Liberty” — and I’ll plan how to do it, with options and steps.</div>
        )}
        {msgs.map((m, i) => <div key={i} className={`kb-b ${m.role}`}>{m.text}</div>)}
        {busy && <div className="kb-b a">…</div>}
      </div>
      <form className="kb-in" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe a task…" />
        <button className="btn primary" disabled={busy}>Plan it</button>
      </form>
    </div>
  );
}
