import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { getReconciliation } from '@/lib/engine';
import { createReviewSheet } from '@/lib/google';
import { logEvent } from '@/lib/audit';

export async function POST() {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const recon = getReconciliation();
  if (!recon.available) {
    return NextResponse.json(
      { error: 'Engine offline — run the portal on the machine that holds the reconciliation data.' },
      { status: 409 },
    );
  }

  try {
    const header = ['Unit', 'Resident', 'Electric', 'Water', 'Service start', 'Service end', 'Charge date', 'Status'];
    const rows = recon.rows.map((r) => [r.unit, r.resident, r.electric, r.water, r.serviceStart, r.serviceEnd, r.chargeDate, r.status]);
    const title = `Reconciliation — ${recon.summary.month || recon.csvFile} (review)`;

    const sheet = await createReviewSheet(title, header, rows);

    const audited = logEvent(user, 'utility_bills.create_review_sheet', {
      month: recon.summary.month, rows: rows.length,
      spreadsheetId: sheet.spreadsheetId, url: sheet.url, owner: sheet.owner,
    });

    return NextResponse.json({ url: sheet.url, owner: sheet.owner, rows: rows.length, audited });
  } catch (e) {
    const msg = String((e && e.message) || e);
    logEvent(user, 'utility_bills.create_review_sheet_failed', { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
