'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActionsClient({ available }) {
  const router = useRouter();
  const [sheet, setSheet] = useState({ status: 'idle' });
  const [recon, setRecon] = useState({ status: 'idle' });

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

  async function runReconcile() {
    setRecon({ status: 'loading' });
    try {
      const r = await fetch('/api/utility-bills/run-reconcile', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setRecon({ status: 'done', okCount: j.okCount, audited: j.audited });
      router.refresh();
    } catch (e) {
      setRecon({ status: 'error', error: String((e && e.message) || e) });
    }
  }

  return (
    <div>
      <div className="btnrow">
        <button className="btn ghost" onClick={runReconcile} disabled={!available || recon.status === 'loading'}>
          {recon.status === 'loading' ? 'Running…' : '↻ Run reconciliation'}
        </button>
        <button className="btn primary" onClick={createSheet} disabled={!available || sheet.status === 'loading'}>
          {sheet.status === 'loading' ? 'Creating…' : '📊 Create review Google Sheet'}
        </button>
        {sheet.status === 'done' && (
          <a className="btn ghost" href={sheet.url} target="_blank" rel="noreferrer">Open the sheet ↗</a>
        )}
      </div>

      {recon.status === 'done' && (
        <div className="note-ok">✓ Reconciliation re-run — {recon.okCount} units ready.{recon.audited ? ' Logged to the audit trail.' : ' (Note: audit-log write failed.)'}</div>
      )}
      {recon.status === 'error' && <div className="note-err">Reconciliation failed: {recon.error}</div>}

      {sheet.status === 'done' && (
        sheet.audited
          ? <div className="note-ok">✓ Created a Google Sheet with {sheet.rows} rows{sheet.owner ? `, owned by ${sheet.owner}` : ''}. Logged to the audit trail under your account.</div>
          : <div className="note-err">Sheet created ({sheet.rows} rows){sheet.owner ? `, owned by ${sheet.owner}` : ''} — but the audit-log write FAILED, so this action is not recorded. Tell an admin.</div>
      )}
      {sheet.status === 'error' && <div className="note-err">Couldn’t create the sheet: {sheet.error}</div>}
    </div>
  );
}
