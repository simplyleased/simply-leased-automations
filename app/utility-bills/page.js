import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAllowedUser } from '@/lib/user';
import { getReconciliation } from '@/lib/engine';
import { recentEvents } from '@/lib/audit';
import { FUNCTIONS } from '@/lib/functions';
import ActionsClient from './ActionsClient';
import PreviewTable from './PreviewTable';
import InputsClient from './InputsClient';

const usd = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACTION_LABELS = {
  'utility_bills.run_reconcile': 'Ran reconciliation',
  'utility_bills.run_reconcile_failed': 'Reconciliation failed',
  'utility_bills.create_review_sheet': 'Created review sheet',
  'utility_bills.create_review_sheet_failed': 'Create sheet failed',
};
const prettyAction = (a) => ACTION_LABELS[a] || a;
const fmtTime = (ts) => { try { return new Date(ts).toLocaleString('en-US'); } catch { return ts; } };
function summarizeDetails(e) {
  const d = e.details || {};
  if (e.action?.includes('create_review_sheet') && d.rows != null) return `${d.rows} rows`;
  if (e.action?.includes('run_reconcile') && d.okCount != null) return `${d.okCount} ready`;
  return '';
}

export default async function UtilityBillsPage() {
  const user = await getAllowedUser();
  if (!user) redirect('/');

  const recon = getReconciliation();
  const history = recentEvents(200);
  const events = history.events.filter((e) => (e.action || '').startsWith('utility_bills')).slice(0, 20);

  return (
    <>
      <div className="topbar">
        <div className="brand"><a href="/"><span className="logo">◧</span></a> Simply Leased Automations</div>
        <div className="user">
          <span className="gchip">{user.email}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="ub-wrap">
        <div className="crumb"><a href="/">← All automations</a></div>
        <div className="ub-title">
          <h1>Summit Utility Bills</h1>
          <span className="tag monthly">MONTHLY</span>
          <a className="howto" href={FUNCTIONS['utility-bills'].howItWorksUrl} target="_blank" rel="noreferrer">📄 How it works</a>
        </div>

        {!recon.available ? (
          <div className="offline">
            <b>Engine offline.</b> This screen runs the real reconciliation from the tenant data and AppFolio,
            which live on the office machine — not in the cloud. Open this portal on that machine to run it.
            {recon.error ? <div className="offline-err">{recon.error}</div> : null}
          </div>
        ) : (
          <>
            <div className="sub2">
              Current reconciliation: <b>{recon.summary.month || recon.csvFile}</b> &middot; source file <code>{recon.csvFile}</code>
            </div>

            <div className="section-h"><h2>1 &middot; Provide this month&rsquo;s statements</h2><span className="line"></span></div>
            <p className="hint">Upload the VCS PDFs — the system extracts and reconciles them, then you review below. Statements, Monthly Report, and Collection Report are required; Meter Reads is optional.</p>
            <InputsClient />

            <div className="section-h"><h2>2 &middot; Review the reconciliation</h2><span className="line"></span></div>

            <div className="ub-stats">
              <div className="sbox ok"><div className="big">{recon.summary.okCount}</div><div className="cap">Ready to charge</div></div>
              <div className="sbox warn"><div className="big">{recon.summary.flaggedCount}</div><div className="cap">Flagged for review</div></div>
              <div className="sbox"><div className="big">{recon.summary.otherCount}</div><div className="cap">Vacant / excluded</div></div>
              <div className="sbox"><div className="big">{recon.summary.chargeCount}</div><div className="cap">Charges to post</div></div>
            </div>

            <div className="totals">
              <div>Electricity<br /><b>{usd(recon.summary.electricTotal)}</b></div>
              <div>Water<br /><b>{usd(recon.summary.waterTotal)}</b></div>
              {recon.controlTotals ? (
                <div className="match">✓ cross-checked against control totals</div>
              ) : null}
            </div>

            <div className="section-h"><h2>Generate the review sheet</h2><span className="line"></span></div>
            <p className="hint">Creates a Google Sheet of every unit for you to approve <b>before any charge is posted</b>. Nothing is charged from this screen yet — that's the next build step, and it stays gated behind your approval.</p>
            <ActionsClient available={recon.available} />

            <div className="section-h"><h2>Reconciliation — preview</h2><span className="line"></span></div>
            <PreviewTable rows={recon.rows} total={recon.summary.totalRows} />

            <div className="section-h"><h2>Run history</h2><span className="line"></span></div>
            <div className="history">
              {events.length === 0 ? (
                <div className="hist-empty">No activity yet. Actions here (run reconciliation, create sheet) are recorded with your name and time.</div>
              ) : (
                <table>
                  <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td>{fmtTime(e.ts)}</td>
                        <td>{e.email || '—'}</td>
                        <td>{prettyAction(e.action)}</td>
                        <td className="hist-detail">{summarizeDetails(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {history.corrupt > 0 ? <div className="hist-warn">⚠ {history.corrupt} audit line(s) were unreadable.</div> : null}
            </div>

            <div className="section-h"><h2>Downloads</h2><span className="line"></span></div>
            <div className="downloads">
              <a className="dl" href="/api/utility-bills/download?file=reconciliation">⬇ Reconciliation (CSV)</a>
              <a className="dl" href="/api/utility-bills/download?file=control-totals">⬇ Control totals (JSON)</a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
