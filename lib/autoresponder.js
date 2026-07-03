// The Auto-responder engine lives in a SEPARATE sibling project
// (../Auto Responder). These helpers locate it and its reviewable output.
import fs from 'node:fs';
import path from 'node:path';
import { engineDir } from './engine';

export function autoResponderDir() {
  return process.env.AUTO_RESPONDER_DIR || path.resolve(engineDir(), '..', 'Auto Responder');
}

export function autoResponderAvailable() {
  try { return fs.existsSync(path.join(autoResponderDir(), 'package.json')); } catch { return false; }
}

// The Send Log Google Sheet (one row per SMS / mark-inactive action).
export const SEND_LOG_URL = 'https://docs.google.com/spreadsheets/d/1emWeImRPYy0JFmkPxA59wcC2TlAPrA8STwIysa32Cq4/edit';
