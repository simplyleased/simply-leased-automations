import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAllowedUser } from '@/lib/user';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';
import BrowserClient from './BrowserClient';

export default async function Page() {
  const user = await getAllowedUser();
  if (!user) redirect('/');
  const fn = FUNCTIONS['browser'];

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

        <div className="section-h"><h2>Describe a task</h2><span className="line"></span></div>
        <p className="hint"><b>Plan it</b> sketches the goal, options, and steps. <b>Run live</b> carries the task out in the office machine&rsquo;s browser, showing each step as it goes. It will never do money actions (charges, vendors, payouts) or anything irreversible — those are always left for Glen or Christian.</p>
        <BrowserClient />
      </div>
    </>
  );
}
