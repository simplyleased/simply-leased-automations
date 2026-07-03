// Knowledgebase assistant, backed by Claude. Reads the Anthropic key from the
// local secrets folder (so it only works on the office machine, like the rest
// of the engine). Answers from a curated set of project facts.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

function anthropicKey() {
  const txt = fs.readFileSync(path.join(engineDir(), 'secrets', 'anthropic.txt'), 'utf8');
  const m = txt.match(/sk-ant-[\w-]+/);
  if (!m) throw new Error('No Anthropic key configured.');
  return m[0];
}

const SYSTEM = `You are the Simply Leased Automations knowledgebase assistant. Answer briefly and plainly, for a non-technical virtual assistant. If a question is about a sensitive money action (removing charges, adding vendors, approving payouts) or you're unsure, tell them to ask Glen or Christian.

FACTS:
- Company: Simply Leased. Properties: Summit Mobile Home Community (24425 Woolsey Canyon Rd, West Hills CA), Liberty (1330 Liberty St, LA), Bonnie Brae (220-222 S Bonnie Brae, LA).
- Automations: Summit Utility Bills (monthly: turns the 4 VCS PDFs into reconciled electric & water charges after a review sheet; AppFolio GL 4477 = Electricity, 4478 = Water); Summit Upload Statements (after charges, files each resident's statement into AppFolio and shares with tenants, emails off); Auto-responder (texts waitlist prospects from saved templates, sends simple ones and parks unsure ones for approval); Summit Scan Checks (daily, flags anomalies like a missing charge); Application Daily Review; Browser (ad-hoc tasks).
- Summit excluded units that are NEVER billed: 35, 118, 124, 134, 145, 146, 164, 176, 201, 203.
- Permissions: ONLY glen@simply-leased.com and christian@simply-leased.com can remove charges, add vendors, or approve payouts. Anyone on the team can prepare and review.
- Utility Bills charge date: the 1st of the month — confirm the exact date with the billing-calendar owner each month before going live.
- Nothing is charged without a human reviewing the Google Sheet first.`;

async function callClaude(system, userText, maxTokens = 700) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages: [{ role: 'user', content: userText }] }),
  });
  const j = await r.json();
  if (j.error) { console.error('[claude] api error:', JSON.stringify(j.error)); throw new Error('AI request failed'); }
  return (j.content || []).map((b) => b.text || '').join('').trim() || '(no answer)';
}

export async function askClaude(question) {
  return callClaude(SYSTEM, question);
}

const PLAN_SYSTEM = `You help a property-management virtual assistant plan a ONE-OFF task at Simply Leased. You are PLANNING only — you do not execute anything yet. Given a task, reply with:
1) A one-line restatement of the goal.
2) 2-3 options for how to do it, each with a short trade-off.
3) The concrete step-by-step for the recommended option.
4) What info or files are needed to start.
If the task involves money actions (removing charges, adding vendors, approving payouts) say clearly it needs Glen or Christian. Keep it short, plain, and actionable.`;

export async function planTask(task) {
  return callClaude(PLAN_SYSTEM, task, 900);
}

const KB_SYSTEM = `You are an assistant for Simply Leased property-management staff. The knowledge base is text-message conversations harvested from AppFolio, organized one markdown file per property, plus an _unmapped file for prospect conversations not linked to a building. Each excerpt includes message bodies with dates and sender names.

RULES:
- Ground every answer ONLY in the EXCERPTS below. If they don't contain the answer, say the knowledge base has no relevant information — do NOT answer from general reasoning.
- Quote the relevant messages with their dates, and cite the source file in [brackets].
- Weight responses from Christian or Glen most heavily — they are the primary managers. Prefer and quote their prior responses to similar queries verbatim; you may consider others, but note who said what.
- Prioritize more recent messages (the more up-to-date the better). If you rely on anything more than 12 months old, explicitly caveat it.
- If the user is drafting a reply and it is (or might be) an SMS text, keep the suggested wording succinct and concise; if it's unclear whether it's SMS, ask.`;

export async function askWithContext(question, context) {
  return callClaude(KB_SYSTEM + '\n\nEXCERPTS:\n' + context, question, 800);
}
