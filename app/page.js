import { SignInButton, SignOutButton, UserButton } from '@clerk/nextjs';
import { getUserState } from '@/lib/user';

export default async function Home() {
  const s = await getUserState();
  if (s.state === 'anon') return <LoginScreen />;
  if (s.state === 'denied') return <DeniedScreen email={s.email} />;
  return <Dashboard />;
}

function LoginScreen() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">◧</div>
        <h1>Simply Leased Automations</h1>
        <p>Run and monitor your team&rsquo;s automations in one place.</p>
        <SignInButton mode="modal">
          <button className="btn google">Continue with Google</button>
        </SignInButton>
        <div className="login-note">Sign-in is restricted to @version.so and @simply-leased.com accounts.</div>
      </div>
    </div>
  );
}

function DeniedScreen({ email }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">◧</div>
        <h1>Access restricted</h1>
        <p>
          {email ? <><b>{email}</b> isn&rsquo;t permitted. </> : null}
          Only <b>@version.so</b> and <b>@simply-leased.com</b> accounts can use this portal.
        </p>
        <SignOutButton>
          <button className="btn google">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <>
      <div className="topbar">
        <div className="brand"><span className="logo">◧</span> Simply Leased Automations</div>
        <div className="user">
          <span className="gchip">Signed in with Google</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="wrap">
        <div className="hero">
          <h1>Simply Leased Automations</h1>
          <p>Run and monitor your team&rsquo;s automations in one place.</p>
          <div className="dd">
            <div className="field"><span>Choose an automation to run&hellip;</span><span>&#9662;</span></div>
          </div>
        </div>

        <div className="section-h"><h2>System status</h2><span className="line"></span></div>
        <div className="sysbar">
          <div className="sysleft">
            <div className="syshead"><span className="big-dot"></span> All systems operational</div>
            <div className="sysdiv"></div>
            <div className="sysconn"><span className="cd"></span><span className="nm">Claude AI</span><span className="st">Live</span></div>
            <div className="sysconn"><span className="cd"></span><span className="nm">AppFolio</span><span className="st">Session valid</span></div>
            <div className="sysconn"><span className="cd"></span><span className="nm">Google Workspace</span><span className="st">Connected</span></div>
          </div>
          <div className="recheck">Last checked 30s ago <button className="btn-rc">&#8635; Re-check now</button></div>
        </div>

        <div className="section-h"><h2>Today&rsquo;s automated runs</h2><span className="line"></span></div>
        <div className="status-row">
          <div className="stat"><div className="top"><span className="nm">Auto-responder</span><span className="dot ok"></span></div>
            <div className="when">Last run 8:02 AM &middot; continuous</div><div className="msg ok">14 emails handled, 0 errors</div></div>
          <div className="stat"><div className="top"><span className="nm">Application Daily Review</span><span className="dot ok"></span></div>
            <div className="when">Last run 6:30 AM</div><div className="msg ok">9 applications reviewed</div></div>
          <div className="stat"><div className="top"><span className="nm">Knowledgebase refresh</span><span className="dot ok"></span></div>
            <div className="when">Last run 3:00 AM</div><div className="msg ok">Scripts synced &amp; up to date</div></div>
          <div className="stat"><div className="top"><span className="nm">Summit Scan Checks</span><span className="dot warn"></span></div>
            <div className="when">Last run 7:15 AM</div><div className="msg warn">2 items need your review</div></div>
        </div>

        <div className="section-h"><h2>All automations</h2><span className="line"></span></div>
        <div className="grid">
          <a className="card" href="#"><div className="ic">&#9993;&#65039;</div><h3>Auto-responder</h3>
            <p>Drafts and sends replies to routine tenant &amp; applicant emails from your knowledgebase.</p>
            <div className="foot"><span className="tag daily">DAILY</span><span className="mini"><span className="dot ok"></span> Healthy</span></div></a>

          <a className="card" href="#"><div className="ic">&#128218;</div><h3>Knowledgebase</h3>
            <p>The source of truth the bots answer from. Auto-refreshes every night so nothing goes stale.</p>
            <div className="foot"><span className="tag daily">DAILY REFRESH</span><span className="mini"><span className="dot ok"></span> Synced 3:00 AM</span></div></a>

          <a className="card" href="#"><div className="ic">&#128269;</div><h3>Summit Scan Checks</h3>
            <p>Scans Summit records for issues and flags anything that needs a human&rsquo;s eyes.</p>
            <div className="foot"><span className="tag daily">DAILY</span><span className="mini"><span className="dot warn"></span> 2 to review</span></div></a>

          <a className="card featured" href="/utility-bills"><div className="ic">&#9889;</div><h3>Summit Utility Bills</h3>
            <p>Turns VCS&rsquo;s 4 monthly PDFs into reconciled electric &amp; water charges &mdash; with your review gate.</p>
            <div className="foot"><span className="tag monthly">MONTHLY</span><span className="open">Open &rarr;</span></div></a>

          <a className="card" href="#"><div className="ic">&#128196;</div><h3>Summit Upload Statements</h3>
            <p>Files each resident&rsquo;s statement into their AppFolio folder and shares it with the tenants.</p>
            <div className="foot"><span className="tag monthly">MONTHLY</span><span className="mini"><span className="dot ok"></span> Ran Jun 16</span></div></a>

          <a className="card" href="#"><div className="ic">&#128203;</div><h3>Application Daily Review</h3>
            <p>Reviews new rental applications each morning and summarizes decisions and follow-ups.</p>
            <div className="foot"><span className="tag daily">DAILY</span><span className="mini"><span className="dot ok"></span> Healthy</span></div></a>

          <a className="card" href="#"><div className="ic">&#129302;</div><h3>Browser (Ad-hoc)</h3>
            <p>Give it any one-off task &mdash; like filling out the THP &mdash; and it finds options and does it.</p>
            <div className="foot"><span className="tag ondemand">ON-DEMAND</span><span className="open">Start a task &rarr;</span></div></a>
        </div>
      </div>
    </>
  );
}
