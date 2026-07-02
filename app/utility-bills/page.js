import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAllowedUser } from '@/lib/user';
import { getReconciliation } from '@/lib/engine';
import ActionsClient from './ActionsClient';

const usd = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function UtilityBillsPage() {
  const user = await getAllowedUser();
  if (!user) redirect('/');

  const recon = getReconciliation();

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

            <div className="section-h"><h2>Review the reconciliation</h2><span className="line"></span></div>

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
            <div className="sheetprev">
              <table>
                <thead><tr><th>Unit</th><th>Resident</th><th className="num">Electric</th><th className="num">Water</th><th>Service start</th><th>Service end</th><th>Charge date</th><th>Status</th></tr></thead>
                <tbody>
                  {recon.rows.slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td>{r.unit}</td><td>{r.resident}</td>
                      <td className="num">{usd(r.electric)}</td><td className="num">{usd(r.water)}</td>
                      <td>{r.serviceStart}</td><td>{r.serviceEnd}</td><td>{r.chargeDate}</td>
                      <td><span className={/^ok$/i.test(r.status) ? 'sst ok' : 'sst flag'}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sheetprev-foot">Showing 15 of {recon.summary.totalRows} rows &middot; full data goes into the Google Sheet.</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
