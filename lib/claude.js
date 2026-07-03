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

export async function askClaude(question) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: question }],
    }),
  });
  const j = await r.json();
  if (j.error) { console.error('[claude] api error:', JSON.stringify(j.error)); throw new Error('AI request failed'); }
  const text = (j.content || []).map((b) => b.text || '').join('').trim();
  return text || '(no answer)';
}
