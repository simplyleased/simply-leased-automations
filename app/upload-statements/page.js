import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getUserState, canManageFinancials } from '@/lib/user';
import { engineAvailable } from '@/lib/engine';
import { recentEvents } from '@/lib/audit';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';
import RunClient from './RunClient';

const LABELS = {
  'upload_statements.start_dry': 'Started dry-run',
  'upload_statements.start_live': 'Started LIVE upload',
  'upload_statements.done_dry': 'Dry-run finished',
  'upload_statements.done_live': 'LIVE upload finished',
  'upload_statements.failed': 'Run failed',
  'upload_statements.download': 'Downloaded log',
};
const fmtTime = (ts) => { try { return new Date(ts).toLocaleString('en-US'); } catch { return ts; } };

export default async function Page() {
  const s = await getUserState();
  if (s.state !== 'ok') redirect('/');
  const user = { userId: s.userId, email: s.email };
  const privileged = canManageFinancials(user);
  const fn = FUNCTIONS['upload-statements'];
  const available = engineAvailable();

  const history = recentEvents(300);
  const events = history.events.filter((e) => (e.action || '').startsWith('upload_statements')).slice(0, 20);

  return (
    <>
      <div className="topbar">
        <div className="brand"><a href="/"><span className="logo">◧</span></a> Simply Leased Automations</div>
        <div className="user"><span className="gchip">{s.email}</span><UserButton afterSignOutUrl="/" /></div>
      </div>

      <div className="ub-wrap">
        <div className="crumb"><a href="/">← All automations</a></div>
        <div className="ub-title">
          <h1>{fn.title}</h1>
          <span className={`tag ${cadenceClass(fn.cadence)}`}>{fn.cadence.toUpperCase()}</span>
          <a className="howto" href={fn.howItWorksUrl} target="_blank" rel="noreferrer">📄 How it works</a>
        </div>
        <p className="sub2">{fn.blurb}</p>

        {!available ? (
          <div className="offline"><b>Engine offline.</b> This runs the real AppFolio upload from the office machine (where the statements and the AppFolio session live), not the cloud. Open the portal there to run it.</div>
        ) : (
          <>
            <div className="section-h"><h2>Run</h2><span className="line"></span></div>
            <p className="hint">Dry-run resolves every space and reports what it <i>would</i> do — no files written. Live actually files each statement into AppFolio and shares it with the tenants (emails stay off).</p>
            <RunClient privileged={privileged} />

            <div className="section-h"><h2>Run history</h2><span className="line"></span></div>
            <div className="history">
              {events.length === 0 ? (
                <div className="hist-empty">No runs yet. Dry-runs and live uploads are recorded here with who ran them.</div>
              ) : (
                <table>
                  <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td>{fmtTime(e.ts)}</td>
                        <td>{e.email || '—'}</td>
                        <td>{LABELS[e.action] || e.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {history.corrupt > 0 ? <div className="hist-warn">⚠ {history.corrupt} audit line(s) were unreadable.</div> : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}
