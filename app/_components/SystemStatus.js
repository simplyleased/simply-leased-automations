'use client';
import { useCallback, useEffect, useState } from 'react';

const cls = (s) => (s === 'ok' ? 'ok' : s === 'warn' ? 'warn' : s === 'offline' ? 'idle' : 'err');

export default function SystemStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/system-status');
      const j = await r.json();
      setData(r.ok ? j : null);
    } catch { setData(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const states = data ? [data.claude.state, data.google.state, data.appfolio.state] : [];
  const engineOffline = !!(data && data.engineOffline);
  const allOk = data && !engineOffline && states.every((s) => s === 'ok');
  const overall = !data
    ? (loading ? 'Checking…' : 'Status unavailable')
    : engineOffline ? 'Automations run on the office machine'
    : allOk ? 'All systems operational' : 'Some integrations need attention';
  const when = data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString('en-US') : '';

  const Conn = ({ nm, c }) => (
    <div className="sysconn"><span className={`cd ${c ? cls(c.state) : ''}`}></span><span className="nm">{nm}</span><span className="st">{c ? c.detail : '…'}</span></div>
  );

  return (
    <div className="sysbar">
      <div className="sysleft">
        <div className="syshead"><span className={`big-dot ${allOk ? '' : engineOffline ? 'idle' : 'amber'}`}></span> {overall}</div>
        <div className="sysdiv"></div>
        <Conn nm="Claude AI" c={data?.claude} />
        <Conn nm="AppFolio" c={data?.appfolio} />
        <Conn nm="Google" c={data?.google} />
      </div>
      <div className="recheck">{when ? `Last checked ${when}` : ''} <button className="btn-rc" onClick={load} disabled={loading}>↻ {loading ? 'Checking…' : 'Re-check'}</button></div>
    </div>
  );
}
