// Summit Scan Checks engine — read-only checks over the local reconciliation +
// exceptions data. Safe (no writes). Flags anomalies for a human to review.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir, engineAvailable, getReconciliation, parseCsv } from './engine';

export function runScan() {
  if (!engineAvailable()) return { available: false };

  const recon = getReconciliation();
  const findings = [];

  if (recon.available) {
    for (const r of recon.rows) {
      if (/^ok$/i.test(r.status)) {
        if (!(r.electric > 0)) findings.push({ space: r.unit, resident: r.resident, check: 'Zero electric charge', finding: 'Marked ready to charge but the electric amount is $0.', severity: 'medium' });
        if (!(r.water > 0)) findings.push({ space: r.unit, resident: r.resident, check: 'Zero water charge', finding: 'Marked ready to charge but the water amount is $0.', severity: 'low' });
      } else if (/^flagged/i.test(r.status)) {
        findings.push({ space: r.unit, resident: r.resident, check: 'Flagged in reconciliation', finding: `Status: ${r.status}`, severity: 'high' });
      }
    }
  }

  // Surface exceptions_<Month>.csv rows that still need action.
  const dir = engineDir();
  try {
    const exFile = fs.readdirSync(dir).find((f) => /^exceptions_.*\.csv$/i.test(f));
    if (exFile) {
      const rows = parseCsv(fs.readFileSync(path.join(dir, exFile), 'utf8')).filter((r) => r.length > 1);
      const header = rows[0].map((h) => h.trim());
      const ix = (n) => header.indexOf(n);
      for (const r of rows.slice(1)) {
        const action = (r[ix('Action needed')] || '').trim();
        if (action && !/^none/i.test(action)) {
          findings.push({
            space: r[ix('Space')],
            resident: r[ix('Resident (per statement)')],
            check: r[ix('Category')] || 'Exception',
            finding: r[ix('Reason / detail')] || action,
            severity: 'high',
          });
        }
      }
    }
  } catch { /* no exceptions file */ }

  const scanned = recon.available ? recon.rows.length : 0;
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;

  return { available: true, scanned, passed: Math.max(0, scanned - findings.length), findings, bySeverity, month: recon.summary?.month || '' };
}
