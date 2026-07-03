'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunClient({ privileged, sendLogUrl }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');

  async function run(live) {
    setStatus('running'); setActivity([]); setErr('');
    try {
      const r = await fetch('/api/auto-responder/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ live }),
      });
      if (!r.ok || !r.body) throw new Error((await r.text().catch(() => '')) || 'Request failed');

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', result = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const l = buf.slice(0, i); buf = buf.slice(i + 1);
          if (!l.trim()) continue;
          let m; try { m = JSON.parse(l); } catch { continue; }
          if (m.type === 'log') setActivity((a) => [...a, m.line]);
          else if (m.type === 'result') result = m;
        }
      }
      setStatus(result?.ok ? 'done' : 'error');
      if (!result?.ok) setErr('Run stopped — see the log above.');
      router.refresh();
    } catch (e) {
      setStatus('error'); setErr(String((e && e.message) || e));
    }
  }

  const running = status === 'running';
  return (
    <div>
      <div className="btnrow">
        <button className="btn primary" disabled={running} onClick={() => run(false)}>▶ Dry-run preview</button>
        <a className="btn ghost" href={sendLogUrl} target="_blank" rel="noreferrer">Open Send Log ↗</a>
      </div>
      <div className="btnrow" style={{ marginTop: '8px' }}>
        <span className="privlabel">Live (Glen &amp; Christian only):</span>
        <button className="btn go" disabled={running || !privileged} onClick={() => run(true)}>Send live</button>
      </div>
      {!privileged && <div className="hint">You can run dry-run previews; actually sending texts is limited to Glen &amp; Christian.</div>}

      {(running || activity.length > 0) && (
        <div className="activity">
          <div className="activity-head">{running ? '● Working…' : status === 'done' ? '✓ Finished' : '✕ Stopped'}</div>
          <div className="activity-lines">{activity.map((l, i) => <div key={i} className="activity-line">{l}</div>)}</div>
        </div>
      )}
      {err && <div className="note-err">{err}</div>}
    </div>
  );
}
