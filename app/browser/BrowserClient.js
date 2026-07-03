'use client';
import { useState } from 'react';

export default function BrowserClient() {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const push = (role, text, streaming) => setMsgs((m) => [...m, { role, text, streaming }]);
  const setLast = (text, streaming) => setMsgs((m) => { const c = m.slice(); c[c.length - 1] = { role: 'a', text, streaming }; return c; });

  async function plan(task) {
    push('a', '…', true);
    try {
      const r = await fetch('/api/browser/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task }) });
      const j = await r.json();
      setLast(r.ok ? j.plan : '⚠ ' + (j.error || 'Error'), false);
    } catch { setLast('⚠ Could not reach the planner.', false); }
  }

  async function runLive(task) {
    push('a', '▶ Starting…', true);
    const acc = [];
    try {
      const r = await fetch('/api/browser/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, live: true }) });
      if (!r.ok || !r.body) { const t = await r.text().catch(() => ''); setLast('⚠ ' + (t || ('Error ' + r.status)), false); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          let o; try { o = JSON.parse(line); } catch { continue; }
          if (o.type === 'log') { acc.push(o.line); setLast(acc.join('\n'), true); }
        }
      }
      setLast(acc.join('\n') || 'Done.', false);
    } catch { setLast(acc.length ? acc.join('\n') : '⚠ Connection lost.', false); }
  }

  async function go(mode) {
    const task = q.trim();
    if (!task || busy) return;
    setQ(''); setBusy(true);
    push('u', task);
    if (mode === 'run') await runLive(task); else await plan(task);
    setBusy(false);
  }

  return (
    <div className="kb-chat">
      <div className="kb-msgs">
        {msgs.length === 0 && (
          <div className="hint">Describe a one-off task — e.g. “Find the guest card for John Smith and open it.” <b>Plan it</b> sketches the steps; <b>Run live</b> carries it out in the office browser while you watch. Money actions are always left for Glen or Christian.</div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`kb-b ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>{m.text}{m.streaming ? ' ▍' : ''}</div>
        ))}
      </div>
      <form className="kb-in" onSubmit={(e) => { e.preventDefault(); go('plan'); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe a task…" />
        <button type="submit" className="btn" disabled={busy}>Plan it</button>
        <button type="button" className="btn primary" disabled={busy} onClick={() => go('run')}>Run live</button>
      </form>
    </div>
  );
}
