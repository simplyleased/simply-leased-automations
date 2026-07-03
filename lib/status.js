// Real connectivity checks for the dashboard status tracker. Cheap + no AI cost:
// Google = actually refresh the token; Claude = key present; AppFolio = saved
// browser session exists. These live locally, so on the cloud they read as
// not-configured (accurate — the engine runs on the office machine).
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

async function checkGoogle() {
  try {
    const p = path.join(engineDir(), 'secrets', 'google-token.json');
    if (!fs.existsSync(p)) return { state: 'down', detail: 'Not connected' };
    const tok = JSON.parse(fs.readFileSync(p, 'utf8'));
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: tok.client_id, client_secret: tok.client_secret }),
    });
    const j = await r.json();
    return j.access_token
      ? { state: 'ok', detail: tok.authorized_email ? `Connected (${tok.authorized_email})` : 'Connected' }
      : { state: 'down', detail: 'Token invalid' };
  } catch { return { state: 'down', detail: 'Error' }; }
}

function checkClaude() {
  try {
    const txt = fs.readFileSync(path.join(engineDir(), 'secrets', 'anthropic.txt'), 'utf8');
    return /sk-ant-[\w-]+/.test(txt) ? { state: 'ok', detail: 'Key configured' } : { state: 'down', detail: 'No key' };
  } catch { return { state: 'down', detail: 'Not configured' }; }
}

function checkAppfolio() {
  try {
    const prof = path.join(engineDir(), 'data', 'playwright-profile');
    return fs.existsSync(prof) ? { state: 'ok', detail: 'Session saved' } : { state: 'warn', detail: 'Needs sign-in' };
  } catch { return { state: 'warn', detail: 'Unknown' }; }
}

export async function checkStatus() {
  const google = await checkGoogle();
  return { claude: checkClaude(), google, appfolio: checkAppfolio(), checkedAt: new Date().toISOString() };
}
