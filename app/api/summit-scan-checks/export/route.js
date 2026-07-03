import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { runScan } from '@/lib/scan';
import { createReviewSheet } from '@/lib/google';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST() {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const scan = runScan();
  if (!scan.available) return NextResponse.json({ error: 'Engine offline.' }, { status: 409 });

  try {
    const header = ['Space', 'Resident', 'Check', 'Finding', 'Severity'];
    const rows = scan.findings.length
      ? scan.findings.map((f) => [f.space, f.resident, f.check, f.finding, f.severity])
      : [['—', '—', 'No issues found', '', '']];
    const title = `Summit Scan results — ${scan.month || 'Summit'}`;
    const sheet = await createReviewSheet(title, header, rows, 'Scan results');
    const audited = logEvent(user, 'scan_checks.export', { findings: scan.findings.length, spreadsheetId: sheet.spreadsheetId, url: sheet.url });
    return NextResponse.json({ url: sheet.url, count: scan.findings.length, audited });
  } catch (e) {
    const msg = String((e && e.message) || e);
    logEvent(user, 'scan_checks.export_failed', { error: msg }); // detail stays server-side
    return NextResponse.json({ error: 'Could not export the scan results.' }, { status: 500 });
  }
}
