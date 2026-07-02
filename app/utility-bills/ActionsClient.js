'use client';
import { useState } from 'react';

export default function ActionsClient({ available }) {
  const [state, setState] = useState({ status: 'idle' });

  async function createSheet() {
    setState({ status: 'loading' });
    try {
      const r = await fetch('/api/utility-bills/create-sheet', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setState({ status: 'done', url: j.url, rows: j.rows, owner: j.owner });
    } catch (e) {
      setState({ status: 'error', error: String((e && e.message) || e) });
    }
  }

  return (
    <div>
      <div className="btnrow">
        <button className="btn primary" onClick={createSheet} disabled={!available || state.status === 'loading'}>
          {state.status === 'loading' ? 'Creating…' : '📊 Create review Google Sheet'}
        </button>
        {state.status === 'done' && (
          <a className="btn ghost" href={state.url} target="_blank" rel="noreferrer">Open the sheet ↗</a>
        )}
      </div>
      {state.status === 'done' && (
        <div className="note-ok">✓ Created a Google Sheet with {state.rows} rows{state.owner ? `, owned by ${state.owner}` : ''}. This action was logged to the audit trail under your account.</div>
      )}
      {state.status === 'error' && (
        <div className="note-err">Couldn’t create the sheet: {state.error}</div>
      )}
    </div>
  );
}
