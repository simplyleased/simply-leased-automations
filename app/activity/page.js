import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getUserState, canManageFinancials } from '@/lib/user';
import { recentEvents } from '@/lib/audit';

const LABELS = {
  'utility_bills.run_reconcile': 'Utility Bills — ran reconciliation',
  'utility_bills.process': 'Utility Bills — processed uploaded PDFs',
  'utility_bills.create_review_sheet': 'Utility Bills — created review sheet',
  'utility_bills.charge_start_dry': 'Utility Bills — started dry-run charges',
  'utility_bills.charge_start_live': 'Utility Bills — started LIVE charges',
  'utility_bills.charge_done_live': 'Utility Bills — LIVE charges finished',
  'utility_bills.charge_done_dry': 'Utility Bills — dry-run charges finished',
  'utility_bills.download': 'Utility Bills — downloaded file',
  'utility_bills.charge_download': 'Utility Bills — downloaded charge results',
  'upload_statements.start_dry': 'Upload Statements — dry-run',
  'upload_statements.start_live': 'Upload Statements — LIVE upload',
  'upload_statements.done_live': 'Upload Statements — LIVE upload finished',
  'upload_statements.download': 'Upload Statements — downloaded log',
  'auto_responder.start_dry': 'Auto-responder — dry-run',
  'auto_responder.start_live': 'Auto-responder — LIVE send',
  'scan_checks.export': 'Scan Checks — exported results',
  'knowledgebase.ask': 'Knowledgebase — asked a question',
  'browser.plan': 'Browser — planned a task',
};
const pretty = (a) => LABELS[a] || String(a || '').replace('.', ' — ').replace(/_/g, ' ');
const fmt = (ts) => { try { return new Date(ts).toLocaleString('en-US'); } catch { return ts; } };
function detailStr(e) {
  const d = e.details || {};
  const p = [];
  if (d.rows != null) p.push(`${d.rows} rows`);
  if (d.okCount != null) p.push(`${d.okCount} ready`);
  if (d.findings != null) p.push(`${d.findings} findings`);
  if (d.space) p.push(`space ${d.space}`);
  if (d.smoke) p.push('smoke');
  if (d.live) p.push('LIVE');
  if (d.file) p.push(d.file);
  if (d.q) p.push(`“${d.q}”`);
  if (d.task) p.push(`“${d.task}”`);
  if (d.exitCode != null && d.exitCode !== 0) p.push(`exit ${d.exitCode}`);
  return p.join(' · ');
}

export default async function Page() {
  const s = await getUserState();
  if (s.state !== 'ok') redirect('/');
  const privileged = canManageFinancials({ email: s.email });

  const { events, corrupt, total } = privileged ? recentEvents(500) : { events: [], corrupt: 0, total: 0 };
  const users = new Set(events.map((e) => e.email).filter(Boolean));

  return (
    <>
      <div className="topbar">
        <div className="brand"><a href="/"><span className="logo">◧</span></a> Simply Leased Automations</div>
        <div className="user"><span className="gchip">{s.email}</span><UserButton afterSignOutUrl="/" /></div>
      </div>

      <div className="ub-wrap">
        <div className="crumb"><a href="/">← All automations</a></div>
        <div className="ub-title"><h1>Activity log</h1></div>
        <p className="sub2">Who did what, across every automation.</p>

        {!privileged ? (
          <div className="offline"><b>Restricted.</b> The full activity log is visible to Glen &amp; Christian only. You can see your own actions on each function's page.</div>
        ) : (
          <>
            <div className="ub-stats">
              <div className="sbox"><div className="big">{events.length}</div><div className="cap">Recent actions</div></div>
              <div className="sbox"><div className="big">{users.size}</div><div className="cap">People</div></div>
              <div className="sbox"><div className="big">{total}</div><div className="cap">Total logged</div></div>
            </div>

            {events.length === 0 ? (
              <div className="note-ok">No activity logged yet.</div>
            ) : (
              <div className="history">
                <table>
                  <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td>{fmt(e.ts)}</td>
                        <td>{e.email || '—'}</td>
                        <td>{pretty(e.action)}</td>
                        <td className="hist-detail">{detailStr(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {corrupt > 0 ? <div className="hist-warn">⚠ {corrupt} audit line(s) were unreadable.</div> : null}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
