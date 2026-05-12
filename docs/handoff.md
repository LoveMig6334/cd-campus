# Handoff to next Claude Code session

This document is the deep briefing the next session reads after the short hand-off prompt. Phases 0 through 4 are shipped; **Phase 5a — Realtime + Storage + Portfolio create** also shipped (12 task commits on `main`). The active phase is **Phase 5b — Cleanup + Polish** (scope TBD by the user, candidate list below).

---

You're picking up the **CD Smart Campus** project — a Next.js 16 + React 19 + Supabase prototype for the Chitralada 2026 smart-campus app. Phases 0 (foundation), 1 (shells), 2 (static page port — sub-phases 2a–2e), the full Supabase migration (**3a auth foundation, 3b schema, 3c read swap, 3d minimum write set**), **Phase 4 — full write surface**, and **Phase 5a — Realtime + Storage + Portfolio create** are merged on `main`. The app is fully interactive, has live updates on three pages, supports image uploads on two editors, and the `+ Add Project` button is wired. Phase 5b is the cleanup-and-polish pass.

## Read first, before doing anything

1. `CLAUDE.md` (auto-loaded — imports `AGENTS.md`) — Next 16 / React 19 traps, project conventions, don'ts.
2. `docs/superpowers/specs/2026-05-12-supabase-migration-design.md` — the Supabase migration design. §Write pattern + §RLS policy summary apply verbatim.
3. `docs/superpowers/specs/2026-05-12-phase-4-full-writes.md` — Phase 4 design + decisions log. The full write surface lives here.
4. `docs/superpowers/specs/2026-05-12-phase-5a-features-design.md` — Phase 5a design (Realtime + Storage + Portfolio create + tag editor).
5. `docs/superpowers/plans/2026-05-12-phase-5a-features.md` — the Phase 5a plan that just shipped. 12 tasks, per-task commits on `main`.
6. `docs/migration-plan.md` — original phased plan + route map (Phase 3 and the original Phase 4–5 are superseded; read the route map and architecture for context).
7. `docs/design-system.md` — color tokens, typography, halftone patterns, bilingual rules.
8. `docs/deployment.md` — Vercel deployment runbook (env vars, Supabase Auth URL config, rollback). Read before doing anything deploy-related.
9. `prototype/cd-smart-campus.html` — source-of-truth visual prototype. When in doubt, match the prototype.

## Critical: Next.js 16 has breaking changes

- App Router only — no `pages/`, no `_app.tsx`, no `_document.tsx`, no `getServerSideProps` / `getStaticProps`.
- `fetch()` is **not cached** by default in 16. Phase 3, 4, and 5a deliberately stay uncached.
- Dynamic route params arrive as `Promise<{...}>` — `await` them. Same for `searchParams`.
- Tailwind 4 is **CSS-first** — tokens in `@theme` inside `app/globals.css`. **Do not create `tailwind.config.js`.**
- `next/font/google` self-hosts fonts — no `<link>` tags.
- **`middleware.ts` is deprecated** — use `proxy.ts` with `export async function proxy(...)`. (Already migrated; don't recreate.)
- `next.config.ts` now declares `images.remotePatterns` for the Supabase storage hostname (added in Phase 5a). Don't remove it — `next/image` would reject the storage URLs.

## Already shipped (everything you can stand on)

### Phases 0–2 — Static prototype port

14 child routes (7 student + 7 admin) rendering prototype-faithful markup from typed arrays. All Server Components.

### Phase 3a — Supabase auth foundation

`@supabase/supabase-js`, `@supabase/ssr`, `server-only` installed. `.env.example` documents the four env vars. `lib/supabase/{server,client,serviceRole}.ts` clients. `proxy.ts` refreshes session + gates `/admin/**` (path-traversal-safe `?next=` redirect). `app/login/{page,actions}.tsx`, `app/auth/signout/actions.ts`. Real Supabase project + root admin invited via dashboard.

### Phase 3b — Supabase schema

`supabase/migrations/0001_init.sql` (9 enums + 11 tables) + `0002_rls.sql` (helper functions — `is_admin()`, `is_root_admin()`, `current_admin_id()` — and per-table policies). `supabase/seed.sql` — root admin bootstrap. `lib/supabase/database.types.ts` — generated (`npm run gen:types`). `supabase/seed/*.ts` — idempotent TS seed (`npm run seed`, gated on `SUPABASE_ALLOW_SEED=1`).

### Phase 3c — Read swap

`data/*.ts` moved to `supabase/seed/data/*.ts`; shared types in `lib/types.ts`. Static UI config in `lib/ui/{calendar,booking,pshare,portfolio,carelin,sport,admin}.ts`. 10 query helpers in `lib/queries/`. All 13 active pages swapped to Supabase queries.

### Phase 3d — Minimum write set

`lib/auth.ts` — `requireAdmin()` / `requireRootAdmin()` server helpers (throw on failure). `lib/actions.ts` — shared `ActionResult` type. New routes: `/admin/admins`, `/admin/calendar/new`, `/admin/carelin/[id]`, `/admin/pshare/new`, `/admin/pshare/[id]/edit`, `/admin/sport/edit`, `/student/carelin/new`. `postCarelinRequest` is the only **public** anon-write (gated by `student_id_4 ~ '^[0-9]{4}$'`). `AdminSidebar` gained an `extraItems` prop; `app/admin/layout.tsx` fetches the admin to gate the root-only "Admins" sidebar entry.

### Phase 4 — Full write surface

13 commits on `main`. Every remaining inert prototype button got a wired Server Action; only `+ Add Project` on `/admin/portfolio` stayed deferred (now resolved in Phase 5a). `bookings` table gained anon-INSERT policy + `student_id_4` (DB-checked) + `klass` columns via `0003_phase4_anon_bookings.sql`. New routes: `/student/pshare/[slug]`, `/admin/calendar/[id]/edit`, `/admin/sport/result/{new,[id]/edit}`, `/admin/portfolio/[id]/edit`, `/admin/config{,/[key]/edit}`, `/admin/bookings/{new,[id]/edit}`. Period→timestamp mapping (`PERIOD_HOURS` in `lib/ui/booking.ts`) is the single source of truth for booking actions. Selection state on `/student/booking` is URL-param-driven. Two anon `useActionState` consumers: `postCarelinRequest` (server `redirect()`) and `bookRoom` (client `router.replace('?ok=1')`).

### Phase 5a — Realtime + Storage + Portfolio create (just shipped)

12 commits on `main` plus a `chore: prettier format` cleanup. No new npm deps (`@supabase/supabase-js` already ships `storage` and `realtime`).

- **Migration:** `supabase/migrations/0004_phase5a_storage_realtime.sql` — adds `pshare_posts.art_image_path text`, `projects.image_path text`, the public `assets` bucket with 4 RLS policies (public read; admin insert/update/delete via `is_admin()`), and adds `sport_results`, `carelin_requests`, `bookings` to the `supabase_realtime` publication.
- **Realtime:** `components/RealtimeRefresh.tsx` is a small `'use client'` leaf returning `null`. It subscribes to `postgres_changes` on the given tables and calls `router.refresh()` (debounced ~250 ms). Mounted at three points: `/student/sport` (`channelKey="rt-sport"`, table `sport_results`), `/admin/carelin` (`rt-carelin`, `carelin_requests`), `/admin/bookings` (`rt-bookings`, `bookings`). RLS is the gate for which events arrive at each client — no Realtime-specific RLS was added.
- **Storage:** `lib/storage.ts` exports a synchronous `getAssetUrl(path: string): string` that returns `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/<path>` (no client construction). `next.config.ts` declares `images.remotePatterns` for the Supabase hostname. File paths are deterministic per row id: `pshare/<post-id>.<ext>` and `portfolio/<project-id>.<ext>`. The server Supabase client (cookies-authed) does the upload via `storage.from('assets').upload(path, file, { upsert: true, contentType })`. On row delete, the action does `storage.remove([path])` fire-and-forget (orphan acceptable). No transactional rollback on upload failure — row exists without image_path, admin re-uploads via edit.
- **Pshare image upload:** `PshareEditor.tsx` gained a file input + server-rendered preview. `Defaults` type widened with `art_image_path?: string | null`. The form is now `encType="multipart/form-data"`. Action helpers `IMAGE_MIMES`, `IMAGE_MAX_BYTES = 5 MB`, `extFromMime`, and `uploadPshareImage(formData, postId)` live in `app/admin/pshare/actions.ts`. Both `saveDraft` and `publishPost` now use `.insert(...).select("id").single()` to capture the row id, then upload + write `art_image_path` separately. `deletePost` SELECTs `art_image_path` before DELETE then removes the storage object. Reader (`app/student/pshare/[slug]/page.tsx`) conditionally renders `<Image fill>` from `getAssetUrl(post.art_image_path)` when set; otherwise the existing halftone+num hero stays as the fallback.
- **Portfolio image upload:** Same pattern, folder `portfolio/`. Helpers `uploadProjectImage` etc. in `app/admin/portfolio/actions.ts`. The edit page and the new create page both have `encType="multipart/form-data"` + a file input + (edit only) current-thumbnail preview. `getAdminPortfolioRows` now selects `image_path`; `PortfolioAdminRow` gained `imagePath?: string | null` in `lib/types.ts`; `PortfolioAdminTable.tsx` renders a 14×14 `<Image>` thumb when present, falling back to the icon tile.
- **Portfolio create-new flow:** New route `app/admin/portfolio/new/page.tsx` is admin-only (gated by `proxy.ts` for `/admin/**`); mirrors the edit form. The `+ Add Project` Btn at `/admin/portfolio` is now a `<Link href="/admin/portfolio/new">` styled like the booking primary button. New action `createProject` in `app/admin/portfolio/actions.ts` uses `.insert(...).select("id").single()` then conditionally uploads the image. `updateProject` also now writes tags + image (previously preserved tags untouched).
- **Tag editor:** `components/admin/PortfolioTagsField.tsx` is a `'use client'` leaf taking `initialTags: PortfolioTagPill[]`. Renders one row per tag with a label input + 5-button swatch picker + ✕ remove + a "+ Add tag" button. Hidden `<input type="hidden" name="tags" value={JSON.stringify(tags)}>` serializes state for the server. `lib/ui/portfolio.ts` exports `TAG_SWATCHES` (5 named swatches: blue/yellow/green/purple/orange, yellow auto-attaches `textColor: var(--color-ink)`), `TagSwatchId` type, and `normalizeTags(raw: unknown): PortfolioTagPill[]` which is called server-side from `parseProject`. Invalid swatches are dropped silently.

## Your task — Phase 5b (Cleanup + Polish + Hardening)

Phase 5a is shipped. Phase 5b scope is **open** — the user should pick which of the remaining candidates to bundle. Brainstorm with the user before writing any code.

### Phase 5b candidates (pick a subset; not all are required)

| #   | Candidate                                                    | Surface area                                                                                        | Notes                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | **Rate limiting on anon writes**                             | `bookRoom`, `postCarelinRequest`                                                                    | Two anon-write surfaces, no throttling. Simplest path: IP-based bucket in `proxy.ts` keyed by `request.ip`. Or Supabase Edge Function with Redis upstash.                                                                                                                                                 |
| 4   | **`admin_greeting` site_config cleanup**                     | `lib/queries/siteConfig.ts`, seed                                                                   | Still queried via `getAdminGreeting`, but the live greeting is derived from `admins.display_name`. Drop the row + helper.                                                                                                                                                                                 |
| 6   | **`Btn type="button"` backfill on 3d forms**                 | `app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx`, `components/admin/PshareEditor.tsx` | `Btn` defaults to `type="button"`. Phase 4 + 5a forms pass `type="submit"` explicitly; the 3d-era forms may not. Test by clicking Save (not Enter-in-input). Trivial fix if needed.                                                                                                                       |
| 8   | **Anon `bookings` policy hardening**                         | `supabase/migrations/0005_*.sql`                                                                    | The Task 3 (Phase 4) `bookings_anon_insert` policy doesn't constrain `created_by_admin_id`. Theoretical for the prototype; small migration.                                                                                                                                                               |
| 9   | **Conflict pre-check race window**                           | `findConflictingBooking`                                                                            | Server-side SELECT-then-INSERT has a race window. For multi-tenant load: add a Postgres `EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)` constraint. Needs `btree_gist`. Probably unnecessary for prototype.                                                                  |
| 10  | **Unify anon success UX paradigm**                           | `postCarelinRequest` vs `bookRoom`                                                                  | The two anon `useActionState` actions diverge: Carelin uses server `redirect()`; bookRoom returns `{ok:true}` and the client form does `router.replace('?ok=1')`. Pick one — most likely `redirect()`. Lets `BookingConfirmForm` drop its INITIAL sentinel.                                               |
| 11  | **Dead exports in `lib/ui/booking.ts`**                      | `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`                                                     | Both unused after Phase 4 (URL-derived now). Remove.                                                                                                                                                                                                                                                      |
| 12  | **Constants consolidation**                                  | `lib/ui/sport.ts`, `lib/ui/portfolio.ts`, new `lib/ui/siteConfig.ts`                                | Inline-duplicated across pages: `HOUSES` (sport new + edit), `STATUS_OPTIONS`/`STATUS_LABEL` (portfolio table + edit + **new**), `KEYS`/`EDITABLE_KEYS`/`VALID` (config index + edit + action). Phase 5a partially landed `TAG_SWATCHES` consolidation but `STATUS_OPTIONS` is now duplicated three ways. |
| 13  | **A11y + responsive polish**                                 | broad                                                                                               | Bilingual content, decorative bg-blue contrast against text-yellow on the mobile shell, focus rings on row controls. The "Delete" buttons across admin tables are bare red text with no visible focus ring.                                                                                               |
| 14  | **Seed cleanup**                                             | `supabase/seed/data/admin-portfolio.ts`, `admin-bookings.ts`                                        | `PortfolioSeedRow = Omit<...>` alias and stub `id: "seed-N"` strings are type-only workarounds added in Phase 4. Cleaner long-term: drop the `id` requirement from the seed-side types or delete the dead arrays.                                                                                         |
| 15  | **`uploadPshareImage` / `uploadProjectImage` consolidation** | `lib/storage.ts` or new `lib/uploads.ts`                                                            | Phase 5a added two near-identical upload helpers (only difference: folder name). Prototype-acceptable, but a single `uploadAsset(formData, folder, id)` would dedupe.                                                                                                                                     |
| 16  | **Storage delete observability**                             | `deletePost`, `deleteProject`                                                                       | Both ignore storage delete failures. For the prototype that's fine; if you start seeing orphan objects, instrument a log line.                                                                                                                                                                            |
| 17  | **Carelin/bookings RLS Realtime audit**                      | `0002_rls.sql`                                                                                      | Phase 5a relies on existing SELECT policies for admins to receive Realtime events on `carelin_requests` and `bookings`. Confirm these policies exist (they almost certainly do — admins already render the rows — but worth verifying explicitly).                                                        |

### Suggested execution mode

Same cadence as Phase 4 and 5a. Same skills, per-task commits on `main`.

1. `superpowers:brainstorming` — pin down which 5b candidates to bundle and in what order.
2. Write the spec at `docs/superpowers/specs/<date>-phase-5b-<focus>.md`.
3. `superpowers:writing-plans` → save to `docs/superpowers/plans/<date>-phase-5b-<focus>.md`.
4. `superpowers:subagent-driven-development` to execute. Per-task commits on `main`.

### Before-Phase-5b: Phase 5a manual sign-off walkthrough

If not yet done, run the Phase 5a exit-criteria walkthrough end-to-end (from `docs/superpowers/plans/2026-05-12-phase-5a-features.md`):

1. **Realtime — sport scoreboard:** edit a `sport_results` row in tab B; tab A's `/student/sport` updates within ~1 second.
2. **Realtime — Carelin desk:** submit a Carelin request in tab B; tab A's `/admin/carelin` updates.
3. **Realtime — admin bookings:** book a room in tab B; tab A's `/admin/bookings` updates.
4. **Storage — P'share:** create a new post via `/admin/pshare/new` with an uploaded header image; publish; `/student/pshare/<slug>` shows the image. Replace via edit. Delete → storage object gone.
5. **Storage — Portfolio:** edit a project; upload thumbnail. Thumbnail renders in `/admin/portfolio` row. Replace. Delete → object gone.
6. **Tag editor:** edit a project; add 3 tags including yellow (verify `textColor: ink`); save; reopen — all preserved. Remove → gone.
7. **Portfolio create:** `/admin/portfolio/new`; create a fresh project with title_en, Draft status, 2 tags, thumbnail. Appears at `/admin/portfolio` and at `/student/portfolio` (when Published).
8. **Phase 4 regression smoke:** rerun the Phase 4 exit checklist (Carelin anon post + reply + answered; admin booking create/edit/cancel; sport record; calendar edit/delete; site_config edit).

## Action signature convention (carried from 3d / 4 / 5a — do not re-derive)

- **`useActionState`-backed** (2 consumers, both anon): `postCarelinRequest` and `bookRoom`. Signature: `(prev: ActionResult, formData: FormData) => Promise<ActionResult>`. Phase 5a did NOT add new useActionState consumers. The success-UX divergence between the two remains — see Phase 5b candidate #10.
- **Plain Server Action**: `(formData: FormData) => Promise<void>` (required for React 19 `<form action={fn}>` typing). Validation early-returns silently; real DB failures `throw`; success calls `revalidatePath(...)` then `redirect(...)`.
- **Service-role usage (3 functions total, unchanged from Phase 4):** `createAdmin`, `disableAdmin` (3d), `deleteCarelinRequest` (Phase 4). All gated by `requireRootAdmin()`.
- **Btn submit gotcha:** `components/admin/Btn.tsx` hardcodes `type="button"` but spreads `{...rest}` after. To submit a form via `<Btn>`, pass `type="submit"` explicitly. Phase 4 + 5a forms do this; 3d forms may not — see Phase 5b candidate #6.

## Reusable patterns from 3d / 4 / 5a

- **Two submit buttons on one form**: primary `<Btn type="submit" variant="primary">`, second `<button type="submit" formAction={fn}>`. Used across calendar/portfolio/sport edit pages.
- **Detail pages await `params` as `Promise<{ id: string }>`**; on missing row, `notFound()`.
- **`searchParams` is also a `Promise`** in Next 16 — `app/student/booking/page.tsx`, `app/admin/bookings/page.tsx` (which also takes `?date=...` for the week view).
- **URL-param-driven picker state** keeps `'use client'` to a single leaf. Pickers become `<Link>` decorations. Pattern: `app/student/booking/page.tsx` + `components/student/BookingConfirmForm.tsx`. Generic helper: `buildHref(currentParams, patch)`.
- **`useActionState` success-state distinction:** module-level `INITIAL: ActionResult = { ok: true }` sentinel + `state !== INITIAL && state.ok` in `useEffect` (`BookingConfirmForm.tsx`). Note 5b candidate #10 may collapse this.
- **Dynamic counts**: SELECT only the discriminator column and count in JS. Pattern: `getCarelinTabCounts`.
- **Multi-submit status form** (one form, multiple submit buttons each with `name="status" value="..."`). Pattern: `PortfolioAdminTable`.
- **Server-resolved isRoot prop**: page calls `requireAdmin()`, derives `isRoot = admin.tier === "root"`, passes as prop to child tables. Pattern: `app/admin/carelin/page.tsx` → `CarelinDeskTable`.
- **Conflict pre-check**: `findConflictingBooking(roomId, startsAt, endsAt, excludeId?)`. Race-window-acceptable for prototype.
- **Period → timestamp mapping**: `PERIOD_HOURS` in `lib/ui/booking.ts`. Single source of truth for booking timestamps.
- **Realtime refresh leaf** (Phase 5a): `<RealtimeRefresh tables={[...]} channelKey="rt-..." />` mounted as a sibling in the page fragment. Returns null; subscribes to `postgres_changes` on the given tables and calls debounced `router.refresh()` on each event.
- **Image upload pattern** (Phase 5a): server-side helpers `IMAGE_MIMES` / `IMAGE_MAX_BYTES = 5 * 1024 * 1024` / `extFromMime` / `upload<Surface>Image(formData, rowId): Promise<string | null>`. Used in both `pshare/actions.ts` and `portfolio/actions.ts`. INSERT path uses `.insert(...).select("id").single()` to capture the new row id before upload. Delete path SELECTs the path before DELETE then `storage.remove([path])` fire-and-forget.
- **Asset URL**: synchronous `getAssetUrl(path: string): string` from `lib/storage.ts` — no client construction. Safe to call from RSC or client leaves.
- **Tag editor leaf** (Phase 5a): `PortfolioTagsField` accepts `initialTags: PortfolioTagPill[]`, holds them in `useState`, emits via a hidden `<input type="hidden" name="tags" value={JSON.stringify(tags)}>`. Server-side `normalizeTags(raw: unknown)` validates against `TAG_SWATCHES` and drops invalid entries. Yellow swatch auto-attaches `textColor: var(--color-ink)`.

## Open items / risks to flag if relevant

- **No rate limiting** on anon writes (Phase 4 doubled the surface to Carelin + bookings; Phase 5a kept the surface unchanged). See 5b candidate #3.
- **`getRecentBookings` hardcodes a `ROOM_TH_BY_EN` map** in `lib/queries/bookings.ts`. A join would be cleaner.
- **Date anchors** (`2026-05-12`) hardcoded in `getAdminTodayEvents`, `bookings.ts`, and `MAY_DATES` in `app/student/booking/page.tsx`. Prototype-acceptable.
- **Admin layout calls `requireAdmin` + most admin pages call it again** — two DB hits per render. Acceptable; could dedupe via `React.cache()` if it matters.
- **Seed-data stubs:** `CARELIN_DESK_ROWS` (3d) carries unused UUIDs; `ADMIN_TODAY_BOOKINGS` (Phase 4) has stub `id: "seed-N"`; `admin-portfolio.ts` uses `PortfolioSeedRow = Omit<...>`. All type-only. See 5b candidate #14.
- **`lib/ui/carelin.ts` exports `carelinDeskTabs(counts)`** (function form, not a constant array). Mirror this for similar count-driven tabs.
- **Dead exports in `lib/ui/booking.ts`** after Phase 4: `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`. See 5b candidate #11.
- **`Btn` `type="button"` default** — 5a forms pass `type="submit"` explicitly; the 3d-era forms (`/admin/calendar/new`, `/admin/admins`, `PshareEditor`) may not. Manual test on each before relying on click-to-submit. See 5b candidate #6.
- **Anon `bookings` policy** does not constrain `created_by_admin_id`. The action doesn't set it, so theoretical only. See 5b candidate #8.
- **`useActionState` success-UX paradigm divergence** between `postCarelinRequest` (server `redirect()`) and `bookRoom` (client `router.replace`). See 5b candidate #10.
- **Booking conflict pre-check** has a small race window between SELECT and INSERT. Acceptable for prototype. See 5b candidate #9 if abuse appears.
- **STATUS_OPTIONS triple-duplicated** after Phase 5a — same array now in `app/admin/portfolio/page.tsx` (no, wait — it's in the table component as `STATUS_OPTIONS`/`STATUS_LABEL`), `app/admin/portfolio/[id]/edit/page.tsx`, and `app/admin/portfolio/new/page.tsx`. See 5b candidate #12.
- **`uploadPshareImage` and `uploadProjectImage`** are near-identical helpers in two action files (folder name only). Could collapse to a single `uploadAsset(formData, folder, id)`. See 5b candidate #15.
- **Storage delete failures are silently swallowed** in `deletePost` / `deleteProject`. Orphan storage objects accumulate over time. Acceptable for prototype; instrument logging if you see growth. See 5b candidate #16.
- **Realtime relies on RLS** for delivery filtering. `sport_results` public-read so anon students get events. `carelin_requests` + `bookings` need admin SELECT policies (verified during 5a; flag #17 if you ever modify them).

## Deployment

Vercel, GitHub auto-deploy on `main`. Full runbook in `docs/deployment.md` — read that before doing anything deploy-related rather than re-deriving. Two gotchas to flag if the user mentions deployment:

- **Env vars must be set in Vercel BEFORE the first deploy.** `next.config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` at build time (it derives `images.remotePatterns` from the URL — added in Phase 5a) and throws if missing. The 3 vars are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **Never** set `SUPABASE_ALLOW_SEED` on Vercel — that's local-dev only.
- **Supabase Auth needs the Vercel URL added** to Site URL + Redirect URLs (`https://<domain>/**`) or the admin magic-link login redirects with "URL not allowed".

Preview deploys currently share the production Supabase project (Phase 5b candidate to split). PR previews can mutate prod data — review with care.

`PhoneShell` is responsive: full-bleed on real phones (<640px), 390×800 mockup on `sm+`. Don't revert that without an explicit design reason — the mockup-on-mobile was the prototype's biggest UX wart pre-deploy.

## Conventions (unchanged)

- Default to RSC; `'use client'` only at interactive leaves.
- Bilingual EN/TH everywhere user-visible.
- Class composition via `lib/cn.ts`.
- One logical change per commit. No `Co-Authored-By` trailer.
- After a write: `revalidatePath(...)` then optionally `redirect(...)`.
- Forms with file inputs: `encType="multipart/form-data"`.

## Don't

- Don't drop or recreate `proxy.ts`.
- Don't touch `lib/supabase/*` unless regenerating `database.types.ts`.
- Don't import `lib/supabase/serviceRole.ts` from anything client-side.
- Don't import from `@/supabase/seed/data/` in `app/` or `components/`.
- Don't add `lucide-react`, `zod`, `react-hook-form`, `swr`, or `@tanstack/react-query`.
- Don't add `'use cache'` / `cacheLife()` — Phase 4 + 5a stay uncached.
- Don't break the Carelin anon-write contract — `student_id_4 ~ '^[0-9]{4}$'` + hand-rolled validator is the entire public-write security model.
- Don't open a new anon-write surface in 5b without an explicit security design — Phase 5a deliberately chose admin-typed proxy over student submission for portfolio create.
- Don't remove `next.config.ts`'s `images.remotePatterns` — `next/image` requires the Supabase hostname declaration.
