// Google integration using the no-key OAuth token captured during setup
// (secrets/google-token.json in the engine dir). Creates the review Google
// Sheet from reconciliation data. Only works locally (token is off-cloud).
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

function loadToken() {
  const p = path.join(engineDir(), 'secrets', 'google-token.json');
  if (!fs.existsSync(p)) throw new Error('Google is not connected on this machine (no token found).');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function getAccessToken() {
  const tok = loadToken();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tok.refresh_token,
    client_id: tok.client_id,
    client_secret: tok.client_secret,
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const j = await r.json();
  if (!j.access_token) {
    console.error('[google] token refresh failed:', JSON.stringify(j));
    throw new Error('Google authorization failed.');
  }
  return { accessToken: j.access_token, owner: tok.authorized_email || null };
}

async function deleteFile(fileId, accessToken) {
  try {
    await fetch('https://www.googleapis.com/drive/v3/files/' + fileId, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken },
    });
  } catch { /* best effort cleanup */ }
}

// Creates a Google Sheet titled `title` with the given header + row arrays.
// Returns { url, spreadsheetId, owner }.
export async function createReviewSheet(title, header, rows) {
  const { accessToken, owner } = await getAccessToken();
  const auth = { Authorization: 'Bearer ' + accessToken };

  const created = await (await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: 'Reconciliation' } }] }),
  })).json();
  if (!created.spreadsheetId) {
    console.error('[google] sheet create failed:', JSON.stringify(created));
    throw new Error('Could not create the Google Sheet.');
  }

  const values = [header, ...rows];
  const range = `Reconciliation!A1:${colLetter(header.length)}${values.length}`;
  const upd = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) },
  );
  if (!upd.ok) {
    console.error('[google] sheet values write failed:', await upd.text().catch(() => ''));
    await deleteFile(created.spreadsheetId, accessToken); // remove the orphan empty sheet
    throw new Error('Could not write data to the Google Sheet.');
  }

  return { url: created.spreadsheetUrl, spreadsheetId: created.spreadsheetId, owner };
}

function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s || 'A';
}
