'use client';
import { useState } from 'react';

export default function ExportClient() {
  const [state, setState] = useState({ status: 'idle' });

  async function exportSheet() {
    setState({ status: 'loading' });
    try {
      const r = await fetch('/api/summit-scan-checks/export', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setState({ status: 'done', url: j.url, count: j.count, audited: j.audited });
    } catch (e) {
      setState({ status: 'error', error: String((e && e.message) || e) });
    }
  }

  return (
    <div>
      <div className="btnrow">
        <button className="btn primary" onClick={exportSheet} disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Exporting…' : '📊 Export scan to Google Sheet'}
        </button>
        {state.status === 'done' && <a className="btn ghost" href={state.url} target="_blank" rel="noreferrer">Open the sheet ↗</a>}
      </div>
      {state.status === 'done' && (
        <div className="note-ok">✓ Exported {state.count} finding(s) to a Google Sheet.{state.audited ? ' Logged to the audit trail.' : ' (Note: audit-log write failed.)'}</div>
      )}
      {state.status === 'error' && <div className="note-err">Couldn’t export: {state.error}</div>}
    </div>
  );
}
