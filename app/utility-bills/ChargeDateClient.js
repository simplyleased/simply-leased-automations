'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChargeDateClient({ current }) {
  const router = useRouter();
  const [date, setDate] = useState(current || '');
  const [status, setStatus] = useState('idle');
  const [msg, setMsg] = useState('');

  async function save() {
    setStatus('saving'); setMsg('');
    try {
      const r = await fetch('/api/utility-bills/set-charge-date', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      setStatus('done'); setMsg(`Charge date set to ${j.date} on ${j.count} rows.`);
      router.refresh();
    } catch (e) {
      setStatus('error'); setMsg(String((e && e.message) || e));
    }
  }

  return (
    <div>
      <div className="btnrow">
        <input className="spaceinput" style={{ width: '120px' }} placeholder="MM/DD/YYYY" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn ghost" disabled={status === 'saving'} onClick={save}>{status === 'saving' ? 'Saving…' : 'Set charge date'}</button>
      </div>
      {status === 'done' && <div className="note-ok">✓ {msg}</div>}
      {status === 'error' && <div className="note-err">{msg}</div>}
    </div>
  );
}
