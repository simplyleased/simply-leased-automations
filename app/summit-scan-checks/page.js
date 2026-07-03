import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAllowedUser } from '@/lib/user';
import { runScan } from '@/lib/scan';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';
import ExportClient from './ExportClient';

export default async function Page() {
  const user = await getAllowedUser();
  if (!user) redirect('/');
  const fn = FUNCTIONS['summit-scan-checks'];
  const scan = runScan();

  return (
    <>
      <div className="topbar">
        <div className="brand"><a href="/"><span className="logo">◧</span></a> Simply Leased Automations</div>
        <div className="user"><span className="gchip">{user.email}</span><UserButton afterSignOutUrl="/" /></div>
      </div>

      <div className="ub-wrap">
        <div className="crumb"><a href="/">← All automations</a></div>
        <div className="ub-title">
          <h1>{fn.title}</h1>
          <span className={`tag ${cadenceClass(fn.cadence)}`}>{fn.cadence.toUpperCase()}</span>
          <a className="howto" href={fn.howItWorksUrl} target="_blank" rel="noreferrer">📄 How it works</a>
        </div>
        <p className="sub2">{fn.blurb}</p>

        {!scan.available ? (
          <div className="offline"><b>Engine offline.</b> The scan reads the Summit reconciliation data on the office machine. Open the portal there to run it.</div>
        ) : (
          <>
            <div className="section-h"><h2>Latest scan</h2><span className="line"></span></div>
            <div className="ub-stats">
              <div className="sbox"><div className="big">{scan.scanned}</div><div className="cap">Records scanned</div></div>
              <div className="sbox ok"><div className="big">{scan.passed}</div><div className="cap">Passed</div></div>
              <div className="sbox warn"><div className="big">{scan.findings.length}</div><div className="cap">Flagged</div></div>
            </div>

            <ExportClient />

            <div className="section-h"><h2>Flagged items</h2><span className="line"></span></div>
            {scan.findings.length === 0 ? (
              <div className="note-ok">✓ No issues found in the current data.</div>
            ) : (
              <div className="sheetprev">
                <table>
                  <thead><tr><th>Space</th><th>Resident</th><th>Check</th><th>Finding</th><th>Severity</th></tr></thead>
                  <tbody>
                    {scan.findings.map((f, i) => (
                      <tr key={i}>
                        <td>{f.space}</td><td>{f.resident}</td><td>{f.check}</td><td>{f.finding}</td>
                        <td><span className={`sev ${f.severity}`}>{f.severity}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
