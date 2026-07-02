'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActionsClient({ available }) {
  const router = useRouter();
  const [sheet, setSheet] = useState({ status: 'idle' });
  const [recon, setRecon] = useState({ status: 'idle' });
  const [activity, setActivity] = useState([]);

  async function runReconcile() {
    setRecon({ status: 'running' });
    setActivity([]);
    try {
      const r = await fetch('/api/utility-bills/run-reconcile', { method: 'POST' });
      if (!r.ok || !r.body) throw new Error((await r.text().catch(() => '')) || 'Request failed');

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', result = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const raw = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (!raw.trim()) continue;
          let msg; try { msg = JSON.parse(raw); } catch { continue; }
          if (msg.type === 'log') setActivity((a) => [...a, msg.line]);
          else if (msg.type === 'result') result = msg;
        }
      }
      setRecon({ status: 'done', okCount: result?.okCount, audited: result?.audited, ok: result?.ok });
      router.refresh();
    } catch (e) {
      setRecon({ status: 'error', error: String((e && e.message) || e) });
    }
  }

  async function createSheet() {
    setSheet({ status: 'loading' });
    try {
      const r = await fetch('/api/utility-bills/create-sheet', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setSheet({ status: 'done', url: j.url, rows: j.rows, owner: j.owner, audited: j.audited });
      router.refresh();
    } catch (e) {
      setSheet({ status: 'error', error: String((e && e.message) || e) });
    }
  }

  const running = recon.status === 'running';

  return (
    <div>
      <div className="btnrow">
        <button className="btn ghost" onClick={runReconcile} disabled={!available || running}>
          {running ? 'Running…' : '↻ Run reconciliation'}
        </button>
        <button className="btn primary" onClick={createSheet} disabled={!available || sheet.status === 'loading'}>
          {sheet.status === 'loading' ? 'Creating…' : '📊 Create review Google Sheet'}
        </button>
        {sheet.status === 'done' && (
          <a className="btn ghost" href={sheet.url} target="_blank" rel="noreferrer">Open the sheet ↗</a>
        )}
      </div>

      {(running || activity.length > 0) && (
        <div className="activity">
          <div className="activity-head">{running ? '● Working…' : '✓ Finished'}</div>
          <div className="activity-lines">
            {activity.map((l, i) => <div key={i} className="activity-line">{l}</div>)}
          </div>
        </div>
      )}

      {recon.status === 'done' && !recon.audited && (
        <div className="note-err">The run finished but the audit-log write FAILED — this action isn’t recorded. Tell an admin.</div>
      )}
      {recon.status === 'error' && <div className="note-err">Reconciliation failed: {recon.error}</div>}

      {sheet.status === 'done' && (
        sheet.audited
          ? <div className="note-ok">✓ Created a Google Sheet with {sheet.rows} rows{sheet.owner ? `, owned by ${sheet.owner}` : ''}. Logged to the audit trail under your account.</div>
          : <div className="note-err">Sheet created ({sheet.rows} rows) — but the audit-log write FAILED, so this action is not recorded. Tell an admin.</div>
      )}
      {sheet.status === 'error' && <div className="note-err">Couldn’t create the sheet: {sheet.error}</div>}
    </div>
  );
}
