# Phase 5a — Realtime, Storage, and Portfolio create

**Status:** design.
**Predecessor:** Phase 4 (`docs/superpowers/specs/2026-05-12-phase-4-full-writes.md`) — shipped.
**Companion:** Phase 5b — Cleanup + Polish (separate spec, written after 5a ships).

## Motivation

Phase 4 closed every remaining inert prototype button. Phase 5 splits into two cycles. **5a** adds three user-visible feature surfaces deferred from Phase 4: live updates on three pages, image uploads on two editors, and an admin-typed create flow for the only remaining "deferred" button (`+ Add Project` on `/admin/portfolio`). **5b** handles cleanup + a11y polish in a separate spec.

## In scope

| # (handoff) | Item                      | Surface                                               |
| ----------- | ------------------------- | ----------------------------------------------------- |
| 1           | Supabase Realtime         | `/student/sport`, `/admin/carelin`, `/admin/bookings` |
| 2           | Supabase Storage          | P'share post header art + portfolio project thumbs    |
| 5           | Portfolio create-new flow | `/admin/portfolio/new` (admin-typed proxy)            |
| 7           | Portfolio tag editor      | `/admin/portfolio/new` + `/admin/portfolio/[id]/edit` |

## Out of scope (deferred to Phase 5b)

Admin profile photos (handoff #2 third sub-item, explicitly skipped), candidates #3 (rate limiting), #4 (`admin_greeting` cleanup), #6 (Btn submit backfill on 3d forms), #8 (anon bookings RLS hardening), #9 (booking conflict race window), #10 (anon success-UX unification), #11 (dead exports in `lib/ui/booking.ts`), #12 (constants consolidation — except partial: `TAG_SWATCHES` lands in 5a because we're already editing `lib/ui/portfolio.ts`), #13 (a11y + responsive polish), #14 (seed cleanup).

Student-driven portfolio submission is also out — Phase 5a uses an **admin-typed proxy form**, so no new anon-write surface is opened. Carelin (3d) and bookings (Phase 4) remain the only two anon-write surfaces.

## Architecture

Three additive concerns layered onto Phase 4. No changes to RSC-by-default, no caching, no new npm dependencies (`@supabase/supabase-js` already ships both `storage` and `realtime` modules).

### Realtime — `router.refresh()` pattern

A small `'use client'` leaf per affected page subscribes to `postgres_changes` and calls `router.refresh()` (debounced) on each event. The page stays an RSC; Next 16 re-runs the route on the server, React diffs the new HTML. No client-side state duplication, no merge logic.

Trade-off considered: in-client state merge avoids a server round-trip but duplicates the row shape in client memory and complicates UPDATE/DELETE handling. Refresh is the cheaper, more correct pattern for prototype scale.

### Storage — single public bucket, two folders

One bucket `assets` (public read, admin write) with folders `pshare/` and `portfolio/`. File paths are deterministic per row id: `pshare/<post-id>.<ext>`, `portfolio/<project-id>.<ext>`. Stored verbatim in the new `art_image_path` / `image_path` columns.

Trade-off considered: per-surface buckets are cleaner conceptually but triple the RLS policy surface. One bucket + folder convention is the Supabase docs' recommended starting point.

### Portfolio create — admin proxy

`/admin/portfolio/new` mirrors the existing `[id]/edit` form. The new `PortfolioTagsField` is a shared `'use client'` leaf used by both create and edit.

Trade-off considered: anon student submission would expand the public-write surface (currently Carelin + bookings) and require an approval workflow. The prototype's story doesn't need this — admin-typed proxy is simpler and faster.

## Schema + migration

`supabase/migrations/0004_phase5a_storage_realtime.sql`:

```sql
-- 1. Storage path columns (nullable, no backfill).
alter table pshare_posts add column art_image_path text;
alter table projects     add column image_path     text;

-- 2. Storage bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 3. Storage RLS — reuses public.is_admin() from 0002_rls.sql.
create policy "assets_public_read"
  on storage.objects for select
  using (bucket_id = 'assets');

create policy "assets_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and public.is_admin());

create policy "assets_admin_update"
  on storage.objects for update to authenticated
  using      (bucket_id = 'assets' and public.is_admin())
  with check (bucket_id = 'assets' and public.is_admin());

create policy "assets_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and public.is_admin());

-- 4. Realtime publication.
alter publication supabase_realtime add table sport_results;
alter publication supabase_realtime add table carelin_requests;
alter publication supabase_realtime add table bookings;
```

After the migration: `npm run gen:types` regenerates `lib/supabase/database.types.ts`. Committed in the same logical change as the migration.

`0002_rls.sql` already exposes `public.is_admin()` (a `security definer` helper with `auth_user_id = auth.uid()` + `is_active`). Storage policies reuse it — no inline `exists` needed.

## Realtime

### Shared component

`components/RealtimeRefresh.tsx` (`'use client'`):

```ts
type Props = {
  tables: readonly string[];
  channelKey: string;
};
```

Behavior:

- `useEffect` mounts: create browser Supabase client → `channel(channelKey)` → for each table, `.on('postgres_changes', { event: '*', schema: 'public', table }, debouncedRefresh)` → `.subscribe()`.
- `debouncedRefresh` calls `router.refresh()` at most once per ~250 ms (bursts collapse to a single refresh).
- Cleanup: `supabase.removeChannel(channel)` on unmount.
- Returns `null` — pure side-effect leaf.

### Mount points

| Page                          | tables                 | channelKey    |
| ----------------------------- | ---------------------- | ------------- |
| `app/student/sport/page.tsx`  | `["sport_results"]`    | `rt-sport`    |
| `app/admin/carelin/page.tsx`  | `["carelin_requests"]` | `rt-carelin`  |
| `app/admin/bookings/page.tsx` | `["bookings"]`         | `rt-bookings` |

Each page adds one line near its existing children: `<RealtimeRefresh tables={[...]} channelKey="..." />`.

### RLS interaction

Supabase Realtime respects RLS — events only reach a client when the client can `SELECT` the affected row. `sport_results` is public-read, so events broadcast to anonymous students. `carelin_requests` and `bookings` events only reach authenticated admins (the existing SELECT policies are the gate). No extra Realtime-specific RLS is needed.

**Open verification:** confirm SELECT policies exist for admin reads of `carelin_requests` and `bookings`. The admin pages already render those rows, so the policies must already exist — but verify before assuming.

### Failure mode

If the channel fails to subscribe, the leaf is silent — no toast, no error boundary. The page keeps rendering with stale data; manual refresh still works. Realtime is enhancement, not load-bearing.

## Storage

### Helper module

`lib/storage.ts`:

```ts
export function getAssetUrl(path: string): string;
```

Wraps `supabase.storage.from('assets').getPublicUrl(path).data.publicUrl`. Called from `PshareReader` and the portfolio table to render `<Image src={getAssetUrl(path)} ... />`.

### Server-side validation

In each action that accepts an image, validate before upload:

- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`.
- Size cap: 5 MB.
- Empty file (`file.size === 0`) means "no upload this submit" — preserve existing `image_path` / `art_image_path` value.

Invalid uploads silently early-return on validation failure (the `<input accept="image/*">` shadows the common path). Real upload failures (network, RLS rejection) throw — Next error boundary handles them.

### Upload mechanics

**Create flow** (`createProject`):

1. Validate text fields + image.
2. `INSERT INTO projects (...) RETURNING id`.
3. If image: `storage.from('assets').upload('portfolio/' + id + '.' + ext, file, { upsert: true, contentType: file.type })` → on success `UPDATE projects SET image_path = path WHERE id = id`.
4. `revalidatePath('/admin/portfolio')`, `redirect('/admin/portfolio')`.

**Edit flow** (`updateProject`, `publishPost`, `saveDraft`):

1. Validate fields + image.
2. If new image provided: `upload` at `<table>/<id>.<ext>` with `upsert: true` (overwrites old object — same path).
3. `UPDATE` row. Include `image_path = path` (or `art_image_path = path`) only when a new file was uploaded; otherwise leave the column unchanged.
4. `revalidatePath`, `redirect`.

**Delete flow** (`deleteProject`, `deletePost`):

1. `SELECT image_path` (or `art_image_path`) before delete.
2. `DELETE` row (RLS-gated, unchanged).
3. If path was non-null: `storage.from('assets').remove([path])` — fire-and-forget; storage delete failure does not fail the action.

### Editor UI

- `components/admin/PshareEditor.tsx` (`'use client'`): new `<input type="file" name="image" accept="image/jpeg,image/png,image/webp" />` row. If `post.art_image_path` exists, show a current-image thumbnail + "Replace" affordance.
- `app/admin/portfolio/[id]/edit/page.tsx` (RSC): same input shape. Current thumbnail rendered server-side if `project.image_path` exists.
- `app/admin/portfolio/new/page.tsx` (RSC, new): same input shape, no current-image thumbnail.

### Reader UI

- `components/student/PshareReader.tsx`: if `post.art_image_path`, render `<Image src={getAssetUrl(path)} alt="" width={1200} height={630} />` above the markdown body. Otherwise the existing halftone header stays as the fallback.
- `app/admin/portfolio/page.tsx` (the table): row layout gains a small thumbnail (40×40) to the left of the project title when `image_path` is present. Rows without an image render the existing layout unchanged.

### `next.config.ts`

Add `images.remotePatterns` with the Supabase project hostname (derived at module load from `process.env.NEXT_PUBLIC_SUPABASE_URL`):

```ts
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
};
```

Required because `next/image` blocks remote hosts by default in Next 16.

### Form encoding

Forms with file inputs need `encType="multipart/form-data"`. Next/React handles this automatically when a `<form action={fn}>` contains a file input. **Open verification:** test on the first form (`/admin/portfolio/new`); if it doesn't, set `encType` explicitly on all four forms.

## Portfolio create + tag editor

### New route

`app/admin/portfolio/new/page.tsx` (RSC) — mirrors `app/admin/portfolio/[id]/edit/page.tsx`:

- `await requireAdmin()` at the top.
- Fields mirror the existing edit form: `title_en` (required), `title_th`, `author_line`, `klass`, `desc_long`, `icon_key`, `thumb_bg`, `status` (`Published | Under Review | Draft`), `submitted_at`, tags (via `PortfolioTagsField`), image (file input).
- Form `action={createProject}`. Single `<Btn type="submit" variant="primary">Create</Btn>`.

### Tag editor leaf

`components/admin/PortfolioTagsField.tsx` (`'use client'`):

- Props: `initialTags: PortfolioTagPill[]`.
- Internal state: `useState<PortfolioTagPill[]>(initialTags)`.
- Renders one row per tag: text input for label + 5-button swatch picker + ✕ remove button. "+ Add tag" button below the list.
- Hidden field: `<input type="hidden" name="tags" value={JSON.stringify(state)} />` — server parses this single value.
- Yellow swatch auto-attaches `textColor: var(--color-ink)`; other swatches do not set `textColor`.

### Shared module

`lib/ui/portfolio.ts` gains `TAG_SWATCHES`:

```ts
export const TAG_SWATCHES = [
  { id: "blue", background: "var(--color-blue)" },
  {
    id: "yellow",
    background: "var(--color-yellow)",
    textColor: "var(--color-ink)",
  },
  { id: "green", background: "var(--color-house-green)" },
  { id: "purple", background: "var(--color-house-purple)" },
  { id: "orange", background: "var(--color-house-orange)" },
] as const;
export type TagSwatchId = (typeof TAG_SWATCHES)[number]["id"];
```

Consumed by the client leaf (rendering swatch buttons) and the server actions (validating that each tag's `background` matches a known swatch — drops unknown swatches silently and reduces the saved `tags` array to the valid subset).

### Server action

`createProject(formData: FormData): Promise<void>` in `app/admin/portfolio/actions.ts`:

1. `await requireAdmin()`.
2. Validate (mirrors existing `updateProject` field set, all reused via shared `parseProject` helper):
   - `title_en` required, ≤ 120 chars.
   - `status` ∈ `{"Published","Under Review","Draft"}`.
   - `title_th`, `author_line`, `klass`, `desc_long`, `icon_key`, `thumb_bg`, `submitted_at` — optional, trimmed-or-null pattern (matches existing actions).
   - `tags` parsed from JSON, each entry validated against `TAG_SWATCHES.background`. Invalid entries dropped silently.
   - `image` (optional) — MIME + size validation.
3. `INSERT INTO projects (...) RETURNING id`.
4. If image: upload at `portfolio/<id>.<ext>`, then `UPDATE projects SET image_path = path`.
5. `revalidatePath('/admin/portfolio')`, `revalidatePath('/student/portfolio')`, `redirect('/admin/portfolio')`.

### Existing `updateProject` change

Currently `updateProject` preserves `tags` untouched. Phase 5a updates it to also accept + write the `tags` array, using the same validation as `createProject`. Same path for `image_path`.

### Edit page update

`app/admin/portfolio/[id]/edit/page.tsx` replaces the current static tag-pill display with `<PortfolioTagsField initialTags={project.tags} />` and adds the file input.

## Action signature convention

Carried verbatim from Phase 4 — no new signature types in 5a:

- `createProject`, `updateProject`, `deleteProject`, `publishPost`, `saveDraft`, `deletePost` are all plain `(formData) => Promise<void>` Server Actions. Validation early-returns silently on shadow-able errors; real failures throw.
- No new `useActionState` consumers in 5a (the two existing — `postCarelinRequest` and `bookRoom` — are untouched in 5a; their success-UX divergence is Phase 5b candidate #10).

## Error handling

| Failure                                | Behavior                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Storage upload after row INSERT/UPDATE | Action throws → Next error boundary. Row stays in table without an image; admin can edit + re-upload. No transactional rollback. |
| Storage delete during row delete       | Fire-and-forget. Row is gone; orphan file in bucket is acceptable for prototype.                                                 |
| Realtime channel subscription fails    | Silent. Page keeps rendering with stale data; manual refresh works.                                                              |
| Realtime publication missing a table   | Channel subscribes but receives zero events. Caught at manual-test time (exit checklist).                                        |
| Tag JSON malformed                     | Server-side `JSON.parse` throws → Next error boundary. Client always emits valid JSON.                                           |
| Image MIME / size invalid              | Action early-returns silently. Client-side `accept` shadows the common case.                                                     |

## Testing approach

No automated test infra exists in the repo. Adding a runner is out of scope for 5a. Verification is a manual walkthrough at the end of the phase, similar in shape to Phase 4's exit-criteria checklist:

### Exit-criteria checklist

1. As anon: open `/student/sport`. In a second window, as admin, edit a sport result. Confirm the student window updates within ~1 second without refresh.
2. As admin: open `/admin/carelin`. In a second window, post a Carelin request anonymously. Confirm the new request appears in the desk list without refresh.
3. As admin: open `/admin/bookings`. In a second window, post a booking anonymously (or as another admin, create a booking). Confirm the today list / week grid updates without refresh.
4. As admin: upload a P'share post header image via the editor; publish; open `/student/pshare/<slug>`; confirm the image renders above the markdown body. Replace the image; confirm the new image renders (cache-busted via `upsert`).
5. As admin: create a new portfolio project via `+ Add Project`. Add 3 tags (one yellow to verify the `textColor: ink` auto-attach). Upload a thumbnail. Save. Confirm the project appears in `/admin/portfolio` with thumbnail and tags. Open `/student/portfolio`; confirm it appears there too.
6. As admin: edit the same project. Change one tag's swatch. Replace the thumbnail. Save. Confirm changes survive refresh.
7. As admin: delete the project. Confirm both the row and the storage object are gone (object inspection via Supabase dashboard is acceptable).
8. End-to-end smoke: rerun Phase 4's exit checklist top-to-bottom; confirm no regressions.

## File-by-file summary

**New files:**

- `supabase/migrations/0004_phase5a_storage_realtime.sql`
- `components/RealtimeRefresh.tsx`
- `components/admin/PortfolioTagsField.tsx`
- `lib/storage.ts`
- `app/admin/portfolio/new/page.tsx`

**Modified files:**

- `next.config.ts` (`images.remotePatterns`)
- `lib/supabase/database.types.ts` (regenerated)
- `lib/ui/portfolio.ts` (add `TAG_SWATCHES`, `TagSwatchId`)
- `lib/types.ts` (optional: `art_image_path?: string`, `image_path?: string` on the row types if not already inferred from `database.types.ts`)
- `app/student/sport/page.tsx` (mount `<RealtimeRefresh>`)
- `app/admin/carelin/page.tsx` (mount `<RealtimeRefresh>`)
- `app/admin/bookings/page.tsx` (mount `<RealtimeRefresh>`)
- `app/admin/portfolio/page.tsx` (thumbnails on rows)
- `app/admin/portfolio/[id]/edit/page.tsx` (file input + tag editor)
- `app/admin/portfolio/actions.ts` (add `createProject`; extend `updateProject` to write tags + image; extend `deleteProject` to remove storage object)
- `app/admin/pshare/actions.ts` (extend `publishPost`/`saveDraft` to upload, extend `deletePost` to remove storage object)
- `components/admin/PshareEditor.tsx` (file input)
- `components/student/PshareReader.tsx` (header image render)
- `lib/queries/projects.ts` (return `image_path` from project queries)
- `lib/queries/pshare.ts` (return `art_image_path` from pshare queries)

Estimated 10–14 task commits, similar shape and per-task cadence to Phase 4.

## Open verification items (handled at implementation time)

1. Do SELECT RLS policies exist for admin reads of `carelin_requests` and `bookings`? Required for Realtime to deliver events to admin clients. (Almost certainly yes — those pages already render the rows.)
2. Does `<form action={fn}>` with a file input automatically encode as multipart in React 19? Test once on `/admin/portfolio/new`; if not, set `encType="multipart/form-data"` on all four forms with file inputs.
3. Does the existing `PshareEditor` need to lift to `'use client'`? It's already a plain function component imported from a server boundary, so it currently renders server-side. If we add a pre-submit file preview thumbnail, it gains client state — split into a small `'use client'` preview leaf rather than lifting the whole editor.

## Don'ts (re-statement of project conventions, scoped to 5a)

- Don't import from `@/supabase/seed/data/` in `app/` or `components/`.
- Don't import `lib/supabase/serviceRole.ts` from client code. Storage uploads in 5a use the **server-side** Supabase client (`lib/supabase/server.ts`), not service-role — the admin's session cookies authorize the write via RLS.
- Don't add `'use cache'` / `cacheLife()` in 5a. The pages stay dynamic.
- Don't expand the anon-write surface. Portfolio create is admin-only.
- Don't recreate `middleware.ts`. `proxy.ts` is the convention.
- Don't add automated test infra in 5a — manual walkthrough is the verification gate.

## References

- Phase 4 spec: `docs/superpowers/specs/2026-05-12-phase-4-full-writes.md`
- Phase 4 plan: `docs/superpowers/plans/2026-05-12-phase-4-full-writes.md`
- Supabase migration design: `docs/superpowers/specs/2026-05-12-supabase-migration-design.md`
- Handoff: `docs/handoff.md` (Phase 5 candidate list)
- Original phased plan + route map: `docs/migration-plan.md`
- Design system: `docs/design-system.md`
- Prototype: `prototype/cd-smart-campus.html`
