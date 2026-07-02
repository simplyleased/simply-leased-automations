'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SLOTS = [
  { field: 'statements', label: 'All Resident Statements' },
  { field: 'monthly', label: 'Monthly Report' },
  { field: 'collection', label: 'Collection Report' },
  { field: 'meter', label: 'Meter Reads (optional)' },
];

export default function InputsClient() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const body = new FormData(e.currentTarget);
    setStatus('running'); setActivity([]); setErr('');
    try {
      const r = await fetch('/api/utility-bills/process', { method: 'POST', body });
      if (!r.ok || !r.body) throw new Error((await r.text().catch(() => '')) || 'Upload failed');

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
      if (!result?.ok) setErr('Processing stopped — see the log above.');
      router.refresh();
    } catch (e2) {
      setStatus('error'); setErr(String((e2 && e2.message) || e2));
    }
  }

  const running = status === 'running';
  return (
    <form onSubmit={onSubmit}>
      <div className="uploads">
        {SLOTS.map((s) => (
          <label key={s.field} className="uploadslot">
            <span>{s.label}</span>
            <input type="file" name={s.field} accept="application/pdf" />
          </label>
        ))}
      </div>
      <div className="btnrow">
        <button className="btn primary" type="submit" disabled={running}>
          {running ? 'Processing…' : '⬆ Upload & run'}
        </button>
      </div>
      {(running || activity.length > 0) && (
        <div className="activity">
          <div className="activity-head">{running ? '● Working…' : status === 'done' ? '✓ Finished' : '✕ Stopped'}</div>
          <div className="activity-lines">{activity.map((l, i) => <div key={i} className="activity-line">{l}</div>)}</div>
        </div>
      )}
      {err && <div className="note-err">{err}</div>}
    </form>
  );
}
