import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getUserState, canManageFinancials } from '@/lib/user';
import { autoResponderAvailable, SEND_LOG_URL } from '@/lib/autoresponder';
import { recentEvents } from '@/lib/audit';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';
import RunClient from './RunClient';

const LABELS = {
  'auto_responder.start_dry': 'Started dry-run',
  'auto_responder.start_live': 'Started LIVE send',
  'auto_responder.done_dry': 'Dry-run finished',
  'auto_responder.done_live': 'LIVE send finished',
  'auto_responder.failed': 'Run failed',
};
const fmtTime = (ts) => { try { return new Date(ts).toLocaleString('en-US'); } catch { return ts; } };

export default async function Page() {
  const s = await getUserState();
  if (s.state !== 'ok') redirect('/');
  const privileged = canManageFinancials({ email: s.email });
  const fn = FUNCTIONS['auto-responder'];
  const available = autoResponderAvailable();

  const history = recentEvents(300);
  const events = history.events.filter((e) => (e.action || '').startsWith('auto_responder')).slice(0, 20);

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
          <div className="offline"><b>Engine offline.</b> The Auto-responder runs from the office machine (it drives AppFolio and sends texts). Open the portal there to run it. It also runs automatically on a schedule.</div>
        ) : (
          <>
            <div className="section-h"><h2>Run</h2><span className="line"></span></div>
            <p className="hint">Dry-run shows exactly who it <i>would</i> text and what it would say — nothing is sent. Live actually sends the texts. The full record is in the Send Log.</p>
            <RunClient privileged={privileged} sendLogUrl={SEND_LOG_URL} />

            <div className="section-h"><h2>Run history</h2><span className="line"></span></div>
            <div className="history">
              {events.length === 0 ? (
                <div className="hist-empty">No runs yet. Dry-runs and live sends are recorded here with who ran them.</div>
              ) : (
                <table>
                  <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}><td>{fmtTime(e.ts)}</td><td>{e.email || '—'}</td><td>{LABELS[e.action] || e.action}</td></tr>
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
