# Simply Leased Automations — Portal

A web portal that lets the Simply Leased team run and monitor their automations from one place, with Google login, per-user audit logging, and role-based permissions.

- **Live:** https://simply-leased-automations-production.up.railway.app (login + dashboard + scaffolds)
- **Full functionality:** runs locally on the office machine (`npm run dev` → http://localhost:3000), where the tenant data + AppFolio session live.

---

## Architecture (important)

The system is two halves:

1. **The portal** (this Next.js app) — login, dashboard, per-function pages, chat, status. Deploys to **Railway** from GitHub.
2. **The engine** — the existing Node scripts in the parent project (`../` = `ENGINE_DIR`) that drive AppFolio (Playwright), reconcile PDFs, send SMS, etc. Plus the **secrets** (Google token, Anthropic key, AppFolio session) in `../secrets/`.

The engine + tenant data + secrets stay **on the office machine**, never in the cloud (privacy). So the deployed Railway site shows **"engine offline"** for the data/run features; the **local** dev server has everything. `ENGINE_DIR` (env, default `..`) points the portal at the engine; it's absent on Railway, which is how the portal degrades gracefully.

---

## Auth & permissions

- **Login:** Google (Clerk), restricted to **verified** `@version.so` and `@simply-leased.com` emails. Deny-by-default middleware; per-route domain checks via `lib/user.js` `getAllowedUser()`.
- **Privileged actions** (remove charges, add vendors, approve payouts, post live charges, send live SMS, live uploads): **only `glen@simply-leased.com` and `christian@simply-leased.com`** (`PRIVILEGED_USERS` / `getPrivilegedUser()`). Everyone else gets 403 on those.
- **Audit:** every meaningful action is appended (durably) to `../logs/portal_audit.jsonl` with `{ts, userId, email, action, details}`. Viewable per-function, and globally at **/activity** (privileged only).

## The functions

| Page | Status | Notes |
|---|---|---|
| `/utility-bills` | **Live** | Upload 4 PDFs → extract (`pdftotext`) → reconcile → review Google Sheet → dry-run/live charges (live = privileged) → downloads |
| `/upload-statements` | **Live** | Wraps `src/upload_statements.js` (dry/smoke/space/live; live = privileged) |
| `/auto-responder` | **Live** | Wraps `../Auto Responder` (`node src/index.js [--dry-run]`; live SMS = privileged); Send Log link |
| `/summit-scan-checks` | **Live** | Read-only anomaly scan over reconciliation + exceptions → findings + Sheet export |
| `/knowledgebase` | **Live** | Claude Q&A over project facts (`lib/claude.js`, model `claude-sonnet-4-6`) |
| `/browser` | **Live (v1)** | Claude task-planner (plans; execution deferred) |
| `/application-review` | **Scaffold** | Needs a new AppFolio application-scraping engine (no local data source yet) |

Each function follows the same template: a **📄 How it works** VA guide (Google Doc), a live **activity stream** while running, **downloads**, and per-user audit logging.

## Run locally

```bash
npm install
# .env.local (gitignored) needs:
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
#   CLERK_SECRET_KEY=...
#   ENGINE_DIR=C:/AppFolio Projects/Summit Utility Bills   (the parent project)
npm run dev   # http://localhost:3000
```

The run features shell out to the engine scripts in `ENGINE_DIR` and read `ENGINE_DIR/secrets/*`. `pdftotext` must be on PATH (Utility Bills input).

## Deploy

Push to `main` → Railway auto-builds. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Railway variables (exact names — `NEXT_PUBLIC_` is baked at build time). The cloud deploy shows "engine offline" for data/run features by design.

## Key files

- `lib/user.js` — auth + roles (`getAllowedUser`, `getPrivilegedUser`, `canManageFinancials`)
- `lib/engine.js` — reads the local reconciliation data; `ENGINE_DIR` resolution + `engineAvailable`
- `lib/audit.js` — durable per-user JSONL audit log
- `lib/google.js` / `lib/claude.js` / `lib/status.js` / `lib/scan.js` / `lib/autoresponder.js` — integrations
- `lib/functions.js` — per-function metadata (title, cadence, status, how-it-works doc)
- `middleware.js` — deny-by-default Clerk auth
- `app/_components/FunctionPage.js` — shared scaffold shell
- `AGENTS.md` — this is **Next.js 16**; read `node_modules/next/dist/docs/` before changing Next code

## Known next steps

- Build the **Application Daily Review** engine (AppFolio application scraping).
- Move the engine to always-on cloud infra (Browserbase for the AppFolio session) so everything runs online — see the plan in project memory.
- Production Clerk instance (removes the dev banner) + own Google branding.
- Add a charge-date override in Utility Bills (reconcile defaults to first-of-next-month; historically hand-corrected).
