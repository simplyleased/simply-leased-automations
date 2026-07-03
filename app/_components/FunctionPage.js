import { UserButton } from '@clerk/nextjs';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';

const STATUS = {
  live: { label: 'Live', cls: 'ok' },
  beta: { label: 'Beta', cls: 'warn' },
  wiring: { label: 'Being wired up', cls: 'warn' },
  planned: { label: 'Being set up', cls: 'plan' },
};

// Standard chrome + status panel for a function page. Used by every function
// that isn't fully built yet, so they all share the same look and pattern.
export default function FunctionPage({ slug, email }) {
  const fn = FUNCTIONS[slug];
  if (!fn) return null;
  const st = STATUS[fn.status] || STATUS.planned;

  return (
    <>
      <div className="topbar">
        <div className="brand"><a href="/"><span className="logo">◧</span></a> Simply Leased Automations</div>
        <div className="user">
          <span className="gchip">{email}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="ub-wrap">
        <div className="crumb"><a href="/">← All automations</a></div>
        <div className="ub-title">
          <h1>{fn.title}</h1>
          <span className={`tag ${cadenceClass(fn.cadence)}`}>{fn.cadence.toUpperCase()}</span>
          {fn.howItWorksUrl && (
            <a className="howto" href={fn.howItWorksUrl} target="_blank" rel="noreferrer">📄 How it works</a>
          )}
        </div>
        <p className="sub2">{fn.blurb}</p>

        <div className={`fnstatus ${st.cls}`}>
          <div className="fnstatus-badge">{st.label}</div>
          <p>{fn.engineNote || 'This function is being set up.'}</p>
          <p className="fnstatus-hint">
            It’ll follow the same pattern as Summit Utility Bills — a live progress view so you can see it running,
            downloadable files, per-user logging, and sensitive actions limited to Glen &amp; Christian.
            Open the <b>How it works</b> guide for the plain-English version, and send feedback to shape this one.
          </p>
        </div>
      </div>
    </>
  );
}
