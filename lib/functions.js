// Per-function metadata shared across the portal. Each function has a simple
// "How it works" Google Doc (for low-level VAs). status: 'live' (fully working),
// 'wiring' (engine exists, portal controls being added), 'planned' (new logic).
export const FUNCTIONS = {
  'auto-responder': {
    title: 'Auto-responder', cadence: 'daily', status: 'live',
    blurb: 'Drafts and sends replies to routine tenant & applicant emails from the Knowledgebase.',
    howItWorksUrl: 'https://docs.google.com/document/d/1hzN61G4ObjEQ7HQdMJbf2DAg3u9a2tI0sqHc8Y9Hf2U/edit',
    engineNote: 'Engine lives in a separate project (../Auto Responder). Being wired into the portal.',
  },
  'knowledgebase': {
    title: 'Knowledgebase', cadence: 'daily', status: 'live',
    blurb: 'The single source of truth the bots answer from — auto-refreshed nightly.',
    howItWorksUrl: 'https://docs.google.com/document/d/1mGhBSYatsG8hflMhuzgXctgNEp4xr7KQMrDOPY3OscQ/edit',
    engineNote: 'New: the nightly repo-sync + search logic needs to be built.',
  },
  'summit-scan-checks': {
    title: 'Summit Scan Checks', cadence: 'daily', status: 'live',
    blurb: 'Scans Summit records for issues and flags anything that needs a human.',
    howItWorksUrl: 'https://docs.google.com/document/d/1Gst1ebGe9fNlPJRmnlXIcKLJw0uDZ-OSMGPOLOVErbQ/edit',
    engineNote: 'New: the scan rules need to be defined + built.',
  },
  'utility-bills': {
    title: 'Summit Utility Bills', cadence: 'monthly', status: 'live',
    blurb: 'Turn the 4 VCS PDFs into reconciled electric & water charges, with a review gate.',
    howItWorksUrl: 'https://docs.google.com/document/d/1Vr8mI06RpQ9bFMB8ZpCzBn3uSQ9_eYNutWE1yizUD2c/edit',
  },
  'upload-statements': {
    title: 'Summit Upload Statements', cadence: 'monthly', status: 'live',
    blurb: 'Files each resident’s statement into AppFolio and shares it with the tenants.',
    howItWorksUrl: 'https://docs.google.com/document/d/1sXb8-enFtS4uOZnw1IJ9yN-fmDIKh6aYs8l2Z6_jxEA/edit',
    engineNote: 'Engine exists (src/upload_statements.js). Portal controls being added.',
  },
  'application-review': {
    title: 'Application Daily Review', cadence: 'daily', status: 'planned',
    blurb: 'Reviews new rental applications each morning and summarizes decisions & follow-ups.',
    howItWorksUrl: 'https://docs.google.com/document/d/1SXV9kZNTgd3s1lFqYAwhtCy_eId5XXI5u5vjRH7IPyA/edit',
    engineNote: 'New: the daily review logic needs to be built.',
  },
  'browser': {
    title: 'Browser (Ad-hoc)', cadence: 'on-demand', status: 'planned',
    blurb: 'Give it any one-off task — like filling out the THP — and it finds options and does it.',
    howItWorksUrl: 'https://docs.google.com/document/d/1GGh9c9KLVjxLj2oCBJfN4M71BqMyx9bPWT6s79Xw3Ys/edit',
    engineNote: 'New: the ad-hoc agent (Claude + browser) needs to be built.',
  },
};

export const cadenceClass = (c) => (c === 'on-demand' ? 'ondemand' : c);
