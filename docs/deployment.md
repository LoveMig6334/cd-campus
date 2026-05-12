# Vercel deployment runbook

Step-by-step for deploying CD Smart Campus to Vercel with auto-deploy on `main`. Run the steps in order — most failure modes come from missing env vars or unconfigured Supabase Auth URLs, both addressed below.

## Prereqs

- GitHub repo at `https://github.com/LoveMig6334/cd-campus` (already pushed).
- Supabase project set up (linked locally; the 3 env vars from `.env.example` are populated in `.env.local`).
- Vercel account that can access the repo's GitHub org.

## First-time setup

### 1. Import the repo into Vercel

- Visit <https://vercel.com/new>.
- "Import Git Repository" → select `LoveMig6334/cd-campus`.
- Framework Preset: auto-detected as **Next.js** — leave as-is.
- Root Directory: `.` (default).
- Build & Output Settings: leave defaults (Vercel uses `next build` and `.next`).
- **Do not click Deploy yet** — set env vars first (step 2).

### 2. Set environment variables — BEFORE the first deploy

In the Vercel project's **Settings → Environment Variables**, add the following for **Production + Preview + Development** (tick all three checkboxes for each var):

| Name                            | Value                                | Notes                                                                                            |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://<your-project>.supabase.co` | Project URL from Supabase Settings → API                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<your-anon-public-key>`             | Anon key from Supabase Settings → API                                                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | `<your-service-role-secret>`         | Service-role key from Supabase Settings → API. Server-only — never prefixed with `NEXT_PUBLIC_`. |

**Critical:** `next.config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` at build time (to derive `images.remotePatterns` for the Supabase storage host) and throws if missing. Set the var **before** the first deploy or the build fails immediately with `NEXT_PUBLIC_SUPABASE_URL is required at build/dev time`.

**Do NOT set `SUPABASE_ALLOW_SEED=1`** on Vercel — that flag is for local seeding only. On Vercel it would let the seed script run in build, which we don't want.

### 3. Deploy

- Click "Deploy". Vercel runs `npm install` + `npm run build`.
- First deploy takes ~2 min. Subsequent deploys ~1 min (build cache).
- Vercel assigns a URL like `cd-campus-<hash>.vercel.app` and a primary `cd-campus.vercel.app` if available.

### 4. Update Supabase Auth allowed URLs

Once Vercel assigns a URL, configure Supabase so admin login works:

- Supabase Dashboard → **Authentication → URL Configuration**.
- **Site URL:** set to your primary Vercel URL, e.g. `https://cd-campus.vercel.app`.
- **Redirect URLs:** add `https://cd-campus.vercel.app/**` (the wildcard covers `/login` and any `?next=` redirect target).
- If you'll use preview deployments, also add `https://cd-campus-*.vercel.app/**` (Vercel supports wildcards in Supabase's redirect-URL allowlist).
- Save.

Without this step, the admin magic-link login flow at `/login` will redirect-fail with "URL not allowed" after Supabase issues the link.

### 5. Verify

Open the production URL and walk through:

1. `/student` renders (anon, no auth required).
2. `/admin` redirects to `/login?next=%2Fadmin` (the gate in `proxy.ts` is working).
3. Log in as a root admin → lands on `/admin`.
4. Run the Phase 5a manual smoke (8 steps in `docs/superpowers/plans/2026-05-12-phase-5a-features.md` → "Final verification") against the production URL.
5. Open the production URL on an actual phone — full-bleed UI (no mock phone bezels). On desktop, the phone mockup still renders.

## Ongoing

- **Auto-deploy:** pushes to `main` trigger production deploys automatically.
- **Preview deploys:** open a PR → Vercel comments with a `cd-campus-pr-<n>-<hash>.vercel.app` URL. Preview deploys share the same env vars (and therefore the same Supabase project) as production — be cautious with destructive actions in previews until preview env vars are split (Phase 5b candidate).
- **Logs:** Vercel dashboard → Project → Logs (runtime), or Project → Deployments → click a build → Build Logs.
- **Build failures:** usually env-var-missing, Supabase schema drift (a migration applied locally but not pushed), or a TypeScript error that escaped `npx tsc --noEmit` locally.

## Rollback

If a deploy ships a regression:

- Vercel dashboard → Deployments → find the last-known-good deployment → "⋯" menu → **Promote to Production**.
- Instant cutover; no rebuild required.
- The bad commit is still in `main` — fix or revert it in git separately, then push again.

## Known limits at deploy time

- **Hardcoded date anchor `2026-05-12`** in `getAdminTodayEvents`, `lib/queries/bookings.ts`, `MAY_DATES` in `app/student/booking/page.tsx`. The deployed app's "today" is fixed at 2026-05-12. Acceptable for the prototype demo; refactor before any real-school usage.
- **No automated tests in CI.** Vercel runs the build only. Type errors that escape local `tsc --noEmit` would block the build; behavior bugs ship without a test gate.
- **Preview deploys hit production Supabase.** Until preview env vars are split into a separate Supabase project (Phase 5b candidate), every preview shares the prod DB.
- **No rate limiting on anon writes.** `postCarelinRequest` and `bookRoom` are open to the internet behind a hand-rolled validator only. See Phase 5b candidate #3 if abuse becomes a concern.
- **Supabase storage CORS:** the `assets` bucket is public-read, so cross-origin GETs work for image rendering. Uploads happen server-side through Server Actions (same-origin), so no upload-CORS issue. If you ever upload from the client directly, configure CORS in Supabase Settings → Storage.

## Custom domain (optional — skip if a `.vercel.app` URL is fine)

If you later want a custom domain (e.g. `campus.cd.ac.th`):

1. Vercel → Project → Settings → Domains → Add domain → enter the hostname.
2. Vercel shows DNS records to add (CNAME or A/AAAA).
3. Add the records at your DNS provider; wait for verification (usually <5 min).
4. **Re-do step 4** above: add the new domain to Supabase Auth allowed URLs.
5. Set the new domain as the primary in Vercel; older `.vercel.app` URLs keep working but redirect.
