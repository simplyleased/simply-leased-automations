import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getAllowedUser } from '@/lib/user';
import { engineAvailable, engineDir, getReconciliation } from '@/lib/engine';
import { logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// The 4 VCS documents -> the extracted text files reconcile.js reads.
const FIELDS = [
  { field: 'statements', out: 'bill.txt', label: 'All Resident Statements', required: true },
  { field: 'monthly', out: 'mgrp.txt', label: 'Monthly Report', required: true },
  { field: 'collection', out: 'clct.txt', label: 'Collection Report', required: true },
  { field: 'meter', out: 'mtrd.txt', label: 'Meter Reads', required: false },
];

function runProc(cmd, args, cwd) {
  return new Promise((resolve) => {
    let out = '', err = '';
    const p = spawn(cmd, args, { cwd, shell: false });
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
    p.on('error', (e) => resolve({ code: -1, out, err: String((e && e.message) || e) }));
  });
}

export async function POST(req) {
  const user = await getAllowedUser();
  if (!user) return new Response('Not authenticated', { status: 401 });
  if (!engineAvailable()) return new Response('Engine offline', { status: 409 });

  let form;
  try { form = await req.formData(); } catch { return new Response('Bad upload', { status: 400 }); }

  const dir = engineDir();
  const incoming = path.join(dir, 'incoming');
  const extracted = path.join(dir, 'extracted');
  try { fs.mkdirSync(incoming, { recursive: true }); fs.mkdirSync(extracted, { recursive: true }); } catch {}

  const files = [];
  for (const f of FIELDS) {
    const v = form.get(f.field);
    if (v && typeof v === 'object' && typeof v.arrayBuffer === 'function' && v.size > 0) files.push({ ...f, blob: v });
    else if (f.required) return new Response('Missing required file: ' + f.label, { status: 400 });
  }

  const clean = (s) => String(s).split(dir).join('.').split(dir.replace(/\//g, '\\')).join('.');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      try {
        send({ type: 'log', line: `Received ${files.length} file(s).` });
        for (const f of files) {
          const pdfPath = path.join(incoming, f.out.replace('.txt', '.pdf'));
          fs.writeFileSync(pdfPath, Buffer.from(await f.blob.arrayBuffer()));
          send({ type: 'log', line: `Extracting text from ${f.label}…` });
          const r = await runProc('pdftotext', ['-layout', pdfPath, path.join(extracted, f.out)], dir);
          if (r.code !== 0) {
            send({ type: 'log', line: `Could not read ${f.label} (${clean(r.err).slice(-160) || 'pdftotext not available'}).` });
            logEvent(user, 'utility_bills.process_failed', { step: 'extract', file: f.label });
            send({ type: 'result', ok: false });
            controller.close();
            return;
          }
        }

        send({ type: 'log', line: 'Reconciling the statements against the reports…' });
        const rec = await runProc(process.execPath, ['src/reconcile.js'], dir);
        for (const line of clean(rec.out || '').split('\n')) if (line.trim()) send({ type: 'log', line: line.trimEnd() });

        const ok = rec.code === 0;
        const recon = getReconciliation();
        const audited = logEvent(user, ok ? 'utility_bills.process' : 'utility_bills.process_failed', {
          step: 'reconcile', files: files.map((f) => f.label), okCount: recon.summary?.okCount, month: recon.summary?.month,
        });
        send({ type: 'log', line: ok ? `Done — ${recon.summary?.okCount} residents ready to charge.` : 'Reconciliation failed.' });
        send({ type: 'result', ok, okCount: recon.summary?.okCount, audited });
      } catch {
        send({ type: 'log', line: 'Something went wrong processing the upload.' });
        send({ type: 'result', ok: false });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
