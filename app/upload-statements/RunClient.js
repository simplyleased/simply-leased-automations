'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunClient({ privileged }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [activity, setActivity] = useState([]);
  const [space, setSpace] = useState('');
  const [err, setErr] = useState('');

  async function run(opts) {
    setStatus('running'); setActivity([]); setErr('');
    try {
      const r = await fetch('/api/upload-statements/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts),
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
        <button className="btn primary" disabled={running} onClick={() => run({ live: false })}>▶ Dry-run (all)</button>
        <input className="spaceinput" placeholder="space #" value={space} onChange={(e) => setSpace(e.target.value)} />
        <button className="btn ghost" disabled={running || !space} onClick={() => run({ live: false, space })}>Dry-run one space</button>
      </div>

      <div className="btnrow" style={{ marginTop: '8px' }}>
        <span className="privlabel">Live (Glen &amp; Christian only):</span>
        <button className="btn go" disabled={running || !privileged} onClick={() => run({ live: true, smoke: true })}>Live smoke (5)</button>
        <button className="btn go" disabled={running || !privileged || !space} onClick={() => run({ live: true, space })}>Live one space</button>
        <button className="btn go" disabled={running || !privileged} onClick={() => run({ live: true })}>Live (all)</button>
      </div>
      {!privileged && <div className="hint">You can run dry-runs; live uploads are limited to Glen &amp; Christian.</div>}

      {(running || activity.length > 0) && (
        <div className="activity">
          <div className="activity-head">{running ? '● Working…' : status === 'done' ? '✓ Finished' : '✕ Stopped'}</div>
          <div className="activity-lines">{activity.map((l, i) => <div key={i} className="activity-line">{l}</div>)}</div>
        </div>
      )}
      {err && <div className="note-err">{err}</div>}

      <div className="downloads" style={{ marginTop: '12px' }}>
        <a className="dl" href="/api/upload-statements/download">⬇ Latest upload log</a>
      </div>
    </div>
  );
}
