// Most-recent run per function, from the audit log — powers the dashboard's
// "recent activity" strip with real data.
import { recentEvents } from './audit';

const FN = {
  'utility-bills': { prefix: 'utility_bills', title: 'Summit Utility Bills' },
  'upload-statements': { prefix: 'upload_statements', title: 'Upload Statements' },
  'auto-responder': { prefix: 'auto_responder', title: 'Auto-responder' },
  'summit-scan-checks': { prefix: 'scan_checks', title: 'Summit Scan Checks' },
  'knowledgebase': { prefix: 'knowledgebase', title: 'Knowledgebase' },
  'browser': { prefix: 'browser', title: 'Browser (Ad-hoc)' },
};

export function recentRuns(limit = 400) {
  const { events } = recentEvents(limit); // newest-first
  const out = [];
  for (const [slug, cfg] of Object.entries(FN)) {
    const ev = events.find((e) => (e.action || '').startsWith(cfg.prefix));
    if (ev) out.push({ slug, title: cfg.title, ts: ev.ts, email: ev.email, state: /fail/i.test(ev.action) ? 'err' : 'ok' });
  }
  out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return out.slice(0, 4);
}
