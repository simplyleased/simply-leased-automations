import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getAllowedUser } from '@/lib/user';
import { FUNCTIONS, cadenceClass } from '@/lib/functions';
import { knowledgeAvailable, knowledgeStats } from '@/lib/knowledge';
import KnowledgebaseClient from './KnowledgebaseClient';

export default async function Page() {
  const user = await getAllowedUser();
  if (!user) redirect('/');
  const fn = FUNCTIONS['knowledgebase'];
  const kb = knowledgeAvailable() ? knowledgeStats() : null;

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

        <div className="section-h"><h2>Ask the knowledgebase</h2><span className="line"></span></div>
        <p className="hint">{kb
          ? `Answers come from all your exported text conversations — ${kb.fileCount} property notebooks, ${kb.chunkCount.toLocaleString()} searchable sections. It cites its sources and points you to Glen or Christian for anything sensitive.`
          : 'Conversation data isn’t on this machine, so answers fall back to a small set of saved facts. Run the portal on the office machine for the full conversation knowledgebase.'}</p>
        <KnowledgebaseClient />
      </div>
    </>
  );
}
