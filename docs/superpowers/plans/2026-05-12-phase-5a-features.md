# Phase 5a Implementation Plan — Realtime, Storage, Portfolio create

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 5a — live updates on three pages via Supabase Realtime, image uploads on two editors via Supabase Storage, and an admin-typed create flow + tag editor for portfolio.

**Architecture:** Spec at `docs/superpowers/specs/2026-05-12-phase-5a-features-design.md`. Three additive concerns: a Realtime client leaf that calls `router.refresh()` on Postgres changes, a single public Storage bucket `assets` with public-read / admin-write RLS, and a new admin route + tag editor leaf for portfolio. No new npm deps; `@supabase/supabase-js` already ships both modules.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Supabase (Postgres + Realtime + Storage), TypeScript.

**Testing note:** The repo has no automated test runner — verification is per-task manual smoke in the browser + a full exit-criteria walkthrough at the end (see Final Verification at the bottom). Adding a test runner is out of scope per the spec.

**Branch policy:** Each task lands as one commit on `main` after manual smoke. No PR per task — same cadence as Phase 4.

---

## File structure summary

**New files (5):**

- `supabase/migrations/0004_phase5a_storage_realtime.sql` — columns, bucket, RLS, Realtime publication.
- `components/RealtimeRefresh.tsx` — shared `'use client'` leaf, mounted in 3 places.
- `lib/storage.ts` — `getAssetUrl(path)` helper (sync, no client).
- `components/admin/PortfolioTagsField.tsx` — `'use client'` tag editor.
- `app/admin/portfolio/new/page.tsx` — admin-typed create form.

**Modified files (~14):**

- `next.config.ts` — `images.remotePatterns` for Supabase storage URLs.
- `lib/supabase/database.types.ts` — regenerated.
- `lib/ui/portfolio.ts` — add `TAG_SWATCHES` + `TagSwatchId`.
- `app/student/sport/page.tsx`, `app/admin/carelin/page.tsx`, `app/admin/bookings/page.tsx` — mount `<RealtimeRefresh>`.
- `app/admin/pshare/actions.ts` — image upload in `saveDraft` / `publishPost`; storage cleanup in `deletePost`.
- `components/admin/PshareEditor.tsx` — file input row + current-image preview; widen `Defaults` type.
- `app/admin/pshare/[id]/edit/page.tsx` — pass `art_image_path` into `Defaults`; select it in the query.
- `app/student/pshare/[slug]/page.tsx` — render image hero when `art_image_path` is set.
- `app/admin/portfolio/actions.ts` — extend `parseProject` with tags; image upload in `updateProject` + new `createProject`; storage cleanup in `deleteProject`.
- `app/admin/portfolio/[id]/edit/page.tsx` — file input + `<PortfolioTagsField>`; drop "Tags managed in Phase 5" note.
- `app/admin/portfolio/page.tsx` — wire `+ Add Project` to `/admin/portfolio/new`.
- `components/admin/PortfolioAdminTable.tsx` — render thumbnail when `image_path` is set.
- `lib/queries/projects.ts` — return `image_path` from `getAdminPortfolioRows`; extend `PortfolioAdminRow` type accordingly.
- `lib/types.ts` — add optional `imagePath?: string` to `PortfolioAdminRow`.

---

## Task 1 — Migration + database types

**Files:**

- Create: `supabase/migrations/0004_phase5a_storage_realtime.sql`
- Modify (regenerated): `lib/supabase/database.types.ts`

**Why this is first:** Every subsequent task touches the new columns, the bucket, or the Realtime publication.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_phase5a_storage_realtime.sql`:

```sql
-- 0004_phase5a_storage_realtime.sql
-- Phase 5a — image columns, public `assets` bucket, Realtime publication.

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

- [ ] **Step 2: Apply the migration to the linked Supabase project**

This is destructive on the remote project. **Confirm with the user before running.**

Run: `npx supabase db push`

Expected: migration applied without errors. If the `assets` bucket already exists from earlier dashboard experimentation, the `on conflict do nothing` clause makes the bucket creation idempotent; the RLS policy creates will fail if they already exist — drop pre-existing policies via the dashboard before retrying, or wrap them in `drop policy if exists ... on storage.objects;` lines (do not commit the drops; they're a recovery action only).

- [ ] **Step 3: Regenerate database types**

Run: `npm run gen:types`

Expected: `lib/supabase/database.types.ts` rewritten with no errors.

- [ ] **Step 4: Verify the new columns are present**

Run: `grep -n "art_image_path\|image_path" lib/supabase/database.types.ts`

Expected: at least 6 matches (Row, Insert, Update for both columns).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_phase5a_storage_realtime.sql lib/supabase/database.types.ts
git commit -m "migration: phase 5a — image columns, assets bucket, realtime publication"
```

---

## Task 2 — RealtimeRefresh shared client leaf

**Files:**

- Create: `components/RealtimeRefresh.tsx`

- [ ] **Step 1: Create the component**

Create `components/RealtimeRefresh.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Tables to watch for postgres_changes. */
  tables: readonly string[];
  /** Stable channel name. */
  channelKey: string;
};

/**
 * Subscribes to postgres_changes on the given tables and calls
 * router.refresh() (debounced) on each event. Returns null — pure side-effect
 * leaf. RLS on the underlying tables is the gate for which events arrive.
 */
export function RealtimeRefresh({ tables, channelKey }: Props) {
  const router = useRouter();
  const tablesKey = tables.join("|");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelKey);
    for (const table of tablesKey.split("|")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 250);
        },
      );
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, tablesKey, router]);

  return null;
}
```

Note: `tablesKey` is the join-string in the deps array because arrays compare by reference; without this, the effect would re-subscribe on every parent render.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors related to `components/RealtimeRefresh.tsx`. (Pre-existing errors elsewhere are unrelated — verify the diff is clean.)

- [ ] **Step 3: Commit**

Manual smoke deferred to Task 3 (first mount point).

```bash
git add components/RealtimeRefresh.tsx
git commit -m "add: RealtimeRefresh shared client leaf"
```

---

## Task 3 — Mount RealtimeRefresh on `/student/sport`

**Files:**

- Modify: `app/student/sport/page.tsx`

- [ ] **Step 1: Add import + mount**

Modify `app/student/sport/page.tsx` — add the import and place `<RealtimeRefresh>` inside the outer fragment (it renders `null`, so placement doesn't affect layout):

```tsx
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
// ... existing imports

export default async function StudentSport() {
  const [leaderboard, liveResults, upcoming] = await Promise.all([
    getLeaderboard(),
    getStudentLiveResults(),
    getStudentUpcomingSport(),
  ]);
  return (
    <>
      <RealtimeRefresh tables={["sport_results"]} channelKey="rt-sport" />
      <PageHead
      /* ... unchanged */
      />
      {/* ... rest unchanged */}
    </>
  );
}
```

- [ ] **Step 2: Manual smoke**

Run: `npm run dev`

Steps:

1. Open `/student/sport` in browser tab A.
2. As an admin in tab B (or via Supabase dashboard SQL editor), `update sport_results set <some field> = <new value> where id = <some id>`.
3. Within ~1 second tab A reflects the change without manual refresh.

If the update doesn't propagate: check the browser dev-tools network tab for the Realtime websocket connection (should be `wss://<project>.supabase.co/realtime/v1/websocket?...`). Confirm Task 1's `alter publication supabase_realtime add table sport_results` was applied.

- [ ] **Step 3: Commit**

```bash
git add app/student/sport/page.tsx
git commit -m "add: realtime refresh on /student/sport"
```

---

## Task 4 — Mount RealtimeRefresh on `/admin/carelin`

**Files:**

- Modify: `app/admin/carelin/page.tsx`

- [ ] **Step 1: Add import + mount**

Modify `app/admin/carelin/page.tsx`:

```tsx
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
// ... existing imports

export default async function AdminCarelin() {
  // ... existing await Promise.all ...
  return (
    <>
      <RealtimeRefresh tables={["carelin_requests"]} channelKey="rt-carelin" />
      <AdminTopbar
      /* ... unchanged */
      />
      {/* ... rest unchanged */}
    </>
  );
}
```

- [ ] **Step 2: Manual smoke**

Steps:

1. Open `/admin/carelin` in tab A (signed in as admin).
2. In tab B (incognito, anon), submit a Carelin request via `/student/carelin/new`.
3. Within ~1 second tab A's desk table updates without manual refresh.

If nothing happens: this requires admin SELECT RLS on `carelin_requests`. Inspect `supabase/migrations/0002_rls.sql` to confirm a `carelin_requests_select_admin` policy exists. The admin desk already renders rows, so the policy must already exist — but if it's missing, that's a Realtime-blocking bug to fix.

- [ ] **Step 3: Commit**

```bash
git add app/admin/carelin/page.tsx
git commit -m "add: realtime refresh on /admin/carelin"
```

---

## Task 5 — Mount RealtimeRefresh on `/admin/bookings`

**Files:**

- Modify: `app/admin/bookings/page.tsx`

- [ ] **Step 1: Add import + mount**

Modify `app/admin/bookings/page.tsx`:

```tsx
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
// ... existing imports

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  // ... existing logic ...
  return (
    <>
      <RealtimeRefresh tables={["bookings"]} channelKey="rt-bookings" />
      <AdminTopbar
      /* ... unchanged */
      />
      {/* ... rest unchanged */}
    </>
  );
}
```

- [ ] **Step 2: Manual smoke**

Steps:

1. Open `/admin/bookings` in tab A.
2. In tab B (incognito), book a room anonymously via `/student/booking` (any room, today's date, midday).
3. Within ~1 second tab A's Gantt + today's-bookings table reflect the new row.

- [ ] **Step 3: Commit**

```bash
git add app/admin/bookings/page.tsx
git commit -m "add: realtime refresh on /admin/bookings"
```

---

## Task 6 — Storage helper + next.config images

**Files:**

- Create: `lib/storage.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Create `lib/storage.ts`**

```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Public URL for an object in the `assets` bucket. Synchronous — does not
 * construct a Supabase client. Safe in server and client components.
 */
export function getAssetUrl(path: string): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
}
```

- [ ] **Step 2: Modify `next.config.ts`**

Replace the existing empty config:

```ts
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required at build/dev time");
}
const supabaseHost = new URL(supabaseUrl).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Restart dev server + smoke**

Run: `npm run dev` (kill the previous server first; `next.config.ts` changes require a restart).

Expected: server starts without errors. No visible UI change yet — exercised in Task 7+.

- [ ] **Step 4: Commit**

```bash
git add lib/storage.ts next.config.ts
git commit -m "add: getAssetUrl helper + next images remotePatterns for supabase storage"
```

---

## Task 7 — P'share image upload (editor field, save/publish, delete cleanup)

**Files:**

- Modify: `components/admin/PshareEditor.tsx`
- Modify: `app/admin/pshare/actions.ts`
- Modify: `app/admin/pshare/[id]/edit/page.tsx`

**Strategy:** Add a file input to the editor with a server-rendered preview of the existing image when present. The two action entry points (`saveDraft`, `publishPost`) both parse + upload the image; `deletePost` removes the storage object after the row delete.

- [ ] **Step 1: Modify `components/admin/PshareEditor.tsx`**

Widen the `Defaults` type to include `art_image_path`, add an `<img>` preview block + file input row, and import the asset URL helper:

```tsx
import Image from "next/image";
import { getAssetUrl } from "@/lib/storage";
import { Card, CardTitle } from "@/components/admin/Card";
import { saveDraft, publishPost } from "@/app/admin/pshare/actions";

type Defaults = {
  id?: string;
  slug?: string;
  title?: string;
  num_label?: string | null;
  snippet?: string | null;
  body_md?: string | null;
  author_alias?: string | null;
  art_halftone?: string | null;
  art_bg?: string | null;
  art_num_color?: string | null;
  art_image_path?: string | null;
  tags?: string[];
};
```

In the `<form>` element, switch to multipart explicitly (file inputs):

```tsx
<form
  className="grid grid-cols-1 gap-3 md:grid-cols-2"
  encType="multipart/form-data"
>
```

Add a new field row just before the Tags row (last `<label>` row before the submit buttons):

```tsx
<div className="md:col-span-2">
  <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
    Header image (optional, jpg/png/webp, ≤5 MB)
  </span>
  {d.art_image_path && (
    <div className="border-line bg-paper mt-1 aspect-[5/3] overflow-hidden border-[1.5px]">
      <Image
        src={getAssetUrl(d.art_image_path)}
        alt=""
        width={600}
        height={360}
        className="h-full w-full object-cover"
      />
    </div>
  )}
  <input
    name="image"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
  />
  {d.art_image_path && (
    <p className="text-mute-500 mt-1 font-mono text-[10px]">
      Leave empty to keep current image.
    </p>
  )}
</div>
```

- [ ] **Step 2: Modify `app/admin/pshare/actions.ts`**

Add storage helpers at the top of the file (under the existing imports):

```ts
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

async function uploadPshareImage(
  formData: FormData,
  postId: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = `pshare/${postId}.${ext}`;
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`pshare upload: ${error.message}`);
  return path;
}
```

Update `saveDraft` to upload the image (note: `RETURNING id` is needed when inserting so we have an id for the path):

```ts
export async function saveDraft(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();
  let rowId = id;

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({ ...parsed.data, status: "draft" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db
      .from("pshare_posts")
      .insert({
        ...parsed.data,
        status: "draft",
        created_by_admin_id: admin.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    rowId = data.id;
  }

  const newPath = await uploadPshareImage(formData, rowId);
  if (newPath) {
    const { error } = await db
      .from("pshare_posts")
      .update({ art_image_path: newPath })
      .eq("id", rowId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
```

Update `publishPost` with the same pattern (image upload after INSERT/UPDATE, only if a new file was provided):

```ts
export async function publishPost(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();
  const publishedAt = new Date().toISOString();
  let rowId = id;

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({
        ...parsed.data,
        status: "published",
        published_at: publishedAt,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db
      .from("pshare_posts")
      .insert({
        ...parsed.data,
        status: "published",
        published_at: publishedAt,
        created_by_admin_id: admin.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    rowId = data.id;
  }

  const newPath = await uploadPshareImage(formData, rowId);
  if (newPath) {
    const { error } = await db
      .from("pshare_posts")
      .update({ art_image_path: newPath })
      .eq("id", rowId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
```

Update `deletePost` to remove the storage object after the row delete (fire-and-forget):

```ts
export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();

  const { data: row } = await db
    .from("pshare_posts")
    .select("art_image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("pshare_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (row?.art_image_path) {
    await db.storage.from("assets").remove([row.art_image_path]);
    // Ignore storage delete failures — row is gone, orphan acceptable.
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
```

- [ ] **Step 3: Modify `app/admin/pshare/[id]/edit/page.tsx`**

Add `art_image_path` to the SELECT and to the `defaults` passed to `<PshareEditor>`:

```tsx
const { data, error } = await db
  .from("pshare_posts")
  .select(
    "id, slug, title, num_label, snippet, body_md, author_alias, art_halftone, art_bg, art_num_color, art_image_path, tags",
  )
  .eq("id", id)
  .single();
if (error || !data) notFound();
```

```tsx
<PshareEditor
  defaults={{
    id: data.id,
    slug: data.slug,
    title: data.title,
    num_label: data.num_label,
    snippet: data.snippet,
    body_md: data.body_md,
    author_alias: data.author_alias,
    art_halftone: data.art_halftone,
    art_bg: data.art_bg,
    art_num_color: data.art_num_color,
    art_image_path: data.art_image_path,
    tags: data.tags ?? [],
  }}
/>
```

- [ ] **Step 4: Manual smoke**

1. Open `/admin/pshare/new`. Fill required fields. Pick a JPG/PNG. Click "Publish".
2. Confirm redirect to `/admin/pshare` and the new post appears in the list.
3. Click the new post's "Edit". Confirm the header-image preview thumbnail renders.
4. Replace the image with a different file. Save draft. Edit again — confirm the new image renders.
5. Delete the post via the delete card on the edit page. In the Supabase dashboard → Storage → assets → pshare/, confirm the object is gone.

- [ ] **Step 5: Commit**

```bash
git add components/admin/PshareEditor.tsx app/admin/pshare/actions.ts app/admin/pshare/\[id\]/edit/page.tsx
git commit -m "add: pshare image upload + storage cleanup on delete"
```

---

## Task 8 — P'share image rendering in the reader

**Files:**

- Modify: `app/student/pshare/[slug]/page.tsx`

- [ ] **Step 1: Conditionally render image hero**

The current hero is a halftone box with a big num character. When `post.art_image_path` is set, replace that hero with the uploaded image; otherwise keep the halftone.

Modify `app/student/pshare/[slug]/page.tsx`:

```tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { PshareReader } from "@/components/student/PshareReader";
import { getPsharePostBySlug } from "@/lib/queries/pshare";
import { getAssetUrl } from "@/lib/storage";
import { cn } from "@/lib/cn";

export default async function StudentPsharePost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPsharePostBySlug(slug);
  if (!post) notFound();

  const halftoneClass =
    post.art_halftone === "halftone-bl"
      ? "halftone-bl"
      : post.art_halftone === "halftone-bk"
        ? "halftone-bk"
        : "halftone-soft";

  return (
    <>
      <PageHead
        titleTh="พี่แชร์ น้องชัวร์"
        titleEn="P'share"
        backHref="/student/pshare"
      />
      <MobileBody className="space-y-3.5">
        {post.art_image_path ? (
          <div className="border-ink relative aspect-[5/3] overflow-hidden border-[1.5px]">
            <Image
              src={getAssetUrl(post.art_image_path)}
              alt={post.title}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              halftoneClass,
              "border-ink grid aspect-[5/3] place-items-center border-[1.5px]",
            )}
            style={{ background: post.art_bg ?? "var(--color-cream)" }}
          >
            <span
              className="font-display text-[64px] leading-none italic"
              style={{ color: post.art_num_color ?? "var(--color-ink)" }}
            >
              {post.num_label ?? "·"}
            </span>
          </div>
        )}

        {/* header, body, tags — unchanged */}
        <header className="space-y-1.5">
          {post.author_alias && (
            <p className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
              {post.author_alias}
            </p>
          )}
          <h1 className="font-display text-[26px] leading-tight italic">
            {post.title}
          </h1>
          {post.snippet && (
            <p className="text-mute-700 font-sans text-[14px]">
              {post.snippet}
            </p>
          )}
        </header>

        {post.body_md && <PshareReader body={post.body_md} />}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="border-line bg-paper text-mute-700 border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 2: Manual smoke**

1. Open `/student/pshare/<slug>` for a post that has `art_image_path` set (use one uploaded in Task 7). Confirm the image renders.
2. Open another post without `art_image_path`. Confirm the halftone+num hero still renders.

- [ ] **Step 3: Commit**

```bash
git add app/student/pshare/\[slug\]/page.tsx
git commit -m "add: pshare reader renders header image when present"
```

---

## Task 9 — TAG_SWATCHES + PortfolioTagsField client leaf

**Files:**

- Modify: `lib/ui/portfolio.ts`
- Create: `components/admin/PortfolioTagsField.tsx`

- [ ] **Step 1: Extend `lib/ui/portfolio.ts`**

Append (do not replace the existing tabs export):

```ts
import type { AdminTabItem, PortfolioTagPill } from "@/lib/types";

export const PORTFOLIO_TABS: AdminTabItem[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "review", label: "Under review" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
];

export const PORTFOLIO_ACTIVE_TAB = "all";

export const TAG_SWATCHES = [
  { id: "blue", label: "Blue", background: "var(--color-blue)" },
  {
    id: "yellow",
    label: "Yellow",
    background: "var(--color-yellow)",
    textColor: "var(--color-ink)",
  },
  { id: "green", label: "Green", background: "var(--color-house-green)" },
  { id: "purple", label: "Purple", background: "var(--color-house-purple)" },
  { id: "orange", label: "Orange", background: "var(--color-house-orange)" },
] as const;

export type TagSwatchId = (typeof TAG_SWATCHES)[number]["id"];

/**
 * Validate + normalize a parsed tags array. Drops entries whose background
 * isn't one of the known swatches. Yellow auto-attaches textColor: ink.
 */
export function normalizeTags(raw: unknown): PortfolioTagPill[] {
  if (!Array.isArray(raw)) return [];
  const out: PortfolioTagPill[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const label = String((entry as { label?: unknown }).label ?? "").trim();
    const background = String(
      (entry as { background?: unknown }).background ?? "",
    );
    if (!label) continue;
    const swatch = TAG_SWATCHES.find((s) => s.background === background);
    if (!swatch) continue;
    out.push(
      swatch.id === "yellow"
        ? { label, background, textColor: "var(--color-ink)" }
        : { label, background },
    );
  }
  return out;
}
```

- [ ] **Step 2: Create `components/admin/PortfolioTagsField.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { PortfolioTagPill } from "@/lib/types";
import { TAG_SWATCHES, type TagSwatchId } from "@/lib/ui/portfolio";

function pillFromSwatch(
  label: string,
  swatchId: TagSwatchId,
): PortfolioTagPill {
  const swatch = TAG_SWATCHES.find((s) => s.id === swatchId)!;
  return swatch.id === "yellow"
    ? {
        label,
        background: swatch.background,
        textColor: "var(--color-ink)",
      }
    : { label, background: swatch.background };
}

function swatchIdFromBackground(background: string): TagSwatchId {
  return (
    (TAG_SWATCHES.find((s) => s.background === background)
      ?.id as TagSwatchId) ?? "blue"
  );
}

export function PortfolioTagsField({
  initialTags,
}: {
  initialTags: PortfolioTagPill[];
}) {
  const [tags, setTags] = useState<PortfolioTagPill[]>(initialTags);

  const updateLabel = (i: number, label: string) => {
    setTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, label } : t)));
  };
  const updateSwatch = (i: number, swatchId: TagSwatchId) => {
    setTags((prev) =>
      prev.map((t, idx) => (idx === i ? pillFromSwatch(t.label, swatchId) : t)),
    );
  };
  const remove = (i: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== i));
  };
  const add = () => {
    setTags((prev) => [...prev, pillFromSwatch("", "blue")]);
  };

  return (
    <div className="md:col-span-2">
      <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
        Tags
      </span>
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <ul className="mt-1 space-y-1.5">
        {tags.map((t, i) => {
          const activeId = swatchIdFromBackground(t.background);
          return (
            <li
              key={i}
              className="border-line bg-paper flex items-center gap-2 border-[1.5px] px-2 py-1.5"
            >
              <input
                type="text"
                value={t.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                placeholder="Tag label"
                className="text-ink flex-1 bg-transparent px-1 py-1 font-sans text-[13px] outline-none"
              />
              <div className="flex items-center gap-1">
                {TAG_SWATCHES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateSwatch(i, s.id)}
                    aria-label={s.label}
                    aria-pressed={s.id === activeId}
                    className={
                      "h-5 w-5 border-[1.5px] " +
                      (s.id === activeId
                        ? "border-ink"
                        : "border-line opacity-60 hover:opacity-100")
                    }
                    style={{ background: s.background }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove tag"
                className="text-mute-500 hover:text-house-pink ml-1 font-mono text-[12px]"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={add}
        className="border-line bg-paper text-mute-700 hover:bg-cream mt-1.5 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
      >
        + Add tag
      </button>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors in the two new exports / file. (Pre-existing errors unrelated.)

- [ ] **Step 4: Commit**

(No UI to smoke yet — wired in Task 10.)

```bash
git add lib/ui/portfolio.ts components/admin/PortfolioTagsField.tsx
git commit -m "add: TAG_SWATCHES + PortfolioTagsField tag editor"
```

---

## Task 10 — Portfolio edit: file input + tag editor + action updates

**Files:**

- Modify: `app/admin/portfolio/[id]/edit/page.tsx`
- Modify: `app/admin/portfolio/actions.ts`

- [ ] **Step 1: Modify `app/admin/portfolio/actions.ts`**

Add storage helpers and extend the action set. The full updated file:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { normalizeTags } from "@/lib/ui/portfolio";

const PROJECT_STATUSES = ["Published", "Under Review", "Draft"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

function isProjectStatus(v: string): v is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

async function uploadProjectImage(
  formData: FormData,
  projectId: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = `portfolio/${projectId}.${ext}`;
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`project upload: ${error.message}`);
  return path;
}

export async function setProjectStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (!isProjectStatus(status)) return;

  const db = await createClient();
  const { error } = await db.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
}

type ProjectFields = {
  title_en: string;
  title_th: string | null;
  author_line: string | null;
  klass: string | null;
  desc_long: string | null;
  icon_key: string | null;
  thumb_bg: string | null;
  status: ProjectStatus;
  submitted_at: string | null;
  tags: ReturnType<typeof normalizeTags>;
};

function parseProject(
  formData: FormData,
): { ok: true; data: ProjectFields } | { ok: false } {
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) return { ok: false };

  const status = String(formData.get("status") ?? "");
  if (!isProjectStatus(status)) return { ok: false };

  const title_th = String(formData.get("title_th") ?? "").trim() || null;
  const author_line = String(formData.get("author_line") ?? "").trim() || null;
  const klass = String(formData.get("klass") ?? "").trim() || null;
  const desc_long = String(formData.get("desc_long") ?? "").trim() || null;
  const icon_key = String(formData.get("icon_key") ?? "").trim() || null;
  const thumb_bg = String(formData.get("thumb_bg") ?? "").trim() || null;
  const submitted_at_raw = String(formData.get("submitted_at") ?? "").trim();
  const submitted_at = submitted_at_raw || null;

  const tagsRaw = String(formData.get("tags") ?? "");
  let tagsParsed: unknown = [];
  if (tagsRaw) {
    try {
      tagsParsed = JSON.parse(tagsRaw);
    } catch {
      tagsParsed = [];
    }
  }
  const tags = normalizeTags(tagsParsed);

  return {
    ok: true,
    data: {
      title_en,
      title_th,
      author_line,
      klass,
      desc_long,
      icon_key,
      thumb_bg,
      status,
      submitted_at,
      tags,
    },
  };
}

export async function createProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const path = await uploadProjectImage(formData, data.id);
  if (path) {
    const { error: updErr } = await db
      .from("projects")
      .update({ image_path: path })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}

export async function updateProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db.from("projects").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);

  const path = await uploadProjectImage(formData, id);
  if (path) {
    const { error: updErr } = await db
      .from("projects")
      .update({ image_path: path })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}

export async function deleteProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();

  const { data: row } = await db
    .from("projects")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (row?.image_path) {
    await db.storage.from("assets").remove([row.image_path]);
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}
```

- [ ] **Step 2: Modify `app/admin/portfolio/[id]/edit/page.tsx`**

Wire in the tag editor + file input. Replace the trailing "Tags managed in Phase 5" `<p>` and the existing `<form>` body's tail. Key additions: `encType="multipart/form-data"` on the form, a new file-input row with optional current-image thumbnail, and `<PortfolioTagsField>` replacing the deferred note.

Full updated file:

```tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { PortfolioTagsField } from "@/components/admin/PortfolioTagsField";
import { getProjectById } from "@/lib/queries/projects";
import { getAssetUrl } from "@/lib/storage";
import type { PortfolioTagPill } from "@/lib/types";
import { deleteProject, updateProject } from "../../actions";

const STATUS_OPTIONS = [
  { value: "Published", label: "Published · เผยแพร่" },
  { value: "Under Review", label: "Under Review · กำลังตรวจ" },
  { value: "Draft", label: "Draft · ฉบับร่าง" },
];

const ICON_OPTIONS = [
  { value: "", label: "— (default trend)" },
  { value: "trend", label: "trend" },
  { value: "sun", label: "sun" },
  { value: "wave", label: "wave" },
  { value: "cube", label: "cube" },
  { value: "calendar", label: "calendar" },
  { value: "beakers", label: "beakers" },
];

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getProjectById(id);
  if (!row) notFound();

  const tags = ((row.tags as PortfolioTagPill[] | null) ??
    []) as PortfolioTagPill[];

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโปรเจกต์"
        eyebrow="Portfolio · edit project"
        actions={
          <Link
            href="/admin/portfolio"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดโปรเจกต์" en="Project details" />
        <form
          action={updateProject}
          encType="multipart/form-data"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
              defaultValue={row.title_en}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (optional)
            </span>
            <input
              name="title_th"
              type="text"
              maxLength={120}
              defaultValue={row.title_th ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author line · ผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
              defaultValue={row.author_line ?? ""}
              placeholder="e.g. ธรรศ์ × นนท์ — Y9 / 2025"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Class · ชั้นเรียน
            </span>
            <input
              name="klass"
              type="text"
              maxLength={32}
              defaultValue={row.klass ?? ""}
              placeholder="e.g. Y9"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Long description · รายละเอียด
            </span>
            <textarea
              name="desc_long"
              rows={4}
              maxLength={1200}
              defaultValue={row.desc_long ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Status · สถานะ
            </span>
            <select
              name="status"
              required
              defaultValue={row.status}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb icon
            </span>
            <select
              name="icon_key"
              defaultValue={row.icon_key ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb background CSS (optional, e.g. var(--color-blue))
            </span>
            <input
              name="thumb_bg"
              type="text"
              maxLength={120}
              defaultValue={row.thumb_bg ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[12px]"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Submitted at (YYYY-MM-DD)
            <input
              name="submitted_at"
              type="date"
              defaultValue={row.submitted_at ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Project thumbnail (optional, jpg/png/webp, ≤5 MB)
            </span>
            {row.image_path && (
              <div className="border-line bg-paper mt-1 grid h-20 w-20 place-items-center overflow-hidden border-[1.5px]">
                <Image
                  src={getAssetUrl(row.image_path)}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
            {row.image_path && (
              <p className="text-mute-500 mt-1 font-mono text-[10px]">
                Leave empty to keep current image.
              </p>
            )}
          </div>

          <PortfolioTagsField initialTags={tags} />

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Save project →
            </Btn>
            <button
              type="submit"
              formAction={deleteProject}
              className="font-mono text-[11px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
            >
              Delete project
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Manual smoke**

1. Open `/admin/portfolio/<id>/edit` for any seed project.
2. Confirm tags from the seed render in the editor with their swatches highlighted.
3. Change one tag's swatch (e.g. click yellow on a row currently blue). Save.
4. Open the edit page again — confirm the swatch persists.
5. Add a new tag with the "+ Add tag" button. Save. Reopen. Confirm new tag is present.
6. Remove the new tag with its ✕ button. Save. Reopen. Confirm gone.
7. Upload a thumbnail. Save. Reopen — confirm the 80×80 thumbnail renders above the file input.
8. Replace the thumbnail with a different image. Save. Reopen — confirm new image.
9. Delete the project. Confirm row is gone AND the storage object under `portfolio/` is gone (check via Supabase dashboard).

- [ ] **Step 4: Commit**

```bash
git add app/admin/portfolio/actions.ts app/admin/portfolio/\[id\]/edit/page.tsx
git commit -m "add: portfolio edit — tag editor + image upload + storage cleanup"
```

---

## Task 11 — Portfolio admin table thumbnails

**Files:**

- Modify: `lib/queries/projects.ts`
- Modify: `lib/types.ts`
- Modify: `components/admin/PortfolioAdminTable.tsx`

**Goal:** Surface the uploaded `image_path` in the admin portfolio table so each row's thumbnail tile uses the image (when present) instead of the icon fallback.

- [ ] **Step 1: Extend `PortfolioAdminRow` in `lib/types.ts`**

Find the existing `PortfolioAdminRow` type (around line 308). Add the optional field:

```ts
export type PortfolioAdminRow = {
  id: string;
  thumb: { iconKey: PortfolioThumbIcon; bg?: string };
  imagePath?: string | null;
  titleEn: string;
  titleTh: string;
  author: string;
  klass: string;
  tags: PortfolioTagPill[];
  submitted: string;
  status: "Published" | "Under Review" | "Draft";
};
```

- [ ] **Step 2: Project the new column in `lib/queries/projects.ts`**

Modify the existing `getAdminPortfolioRows` select + mapping:

```ts
export async function getAdminPortfolioRows(): Promise<PortfolioAdminRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select(
      "id, title_en, title_th, author_line, klass, icon_key, thumb_bg, image_path, tags, submitted_at, status",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAdminPortfolioRows: ${error.message}`);
  return (data ?? []).map<PortfolioAdminRow>((p) => ({
    id: p.id,
    thumb: {
      iconKey: (p.icon_key as PortfolioThumbIcon) ?? "trend",
      bg: p.thumb_bg ?? undefined,
    },
    imagePath: p.image_path,
    titleEn: p.title_en,
    titleTh: p.title_th ?? "",
    author: trimAuthor(p.author_line ?? ""),
    klass: p.klass ?? "",
    tags: ((p.tags as PortfolioTagPill[] | null) ?? []) as PortfolioTagPill[],
    submitted: fmtSubmitted(p.submitted_at),
    status: p.status as PortfolioAdminRow["status"],
  }));
}
```

- [ ] **Step 3: Render the thumbnail in `components/admin/PortfolioAdminTable.tsx`**

In the row map, replace the thumb `<td>` with a conditional: image if present, icon fallback otherwise.

```tsx
import Image from "next/image";
import { getAssetUrl } from "@/lib/storage";
// ... existing imports
```

Inside the row map (the existing first `<td>` containing the thumb div):

```tsx
<td className={td}>
  {row.imagePath ? (
    <div className="border-ink relative h-14 w-14 overflow-hidden border-[1.5px]">
      <Image
        src={getAssetUrl(row.imagePath)}
        alt=""
        fill
        sizes="56px"
        className="object-cover"
      />
    </div>
  ) : (
    <div
      className="border-ink text-yellow grid h-14 w-14 place-items-center border-[1.5px]"
      style={{ background: thumbBg }}
    >
      <PortfolioThumbIconRender icon={row.thumb.iconKey} />
    </div>
  )}
</td>
```

- [ ] **Step 4: Manual smoke**

1. Open `/admin/portfolio`. Rows without an image keep the icon-tile look. Rows with an `image_path` (uploaded in Task 10) show the image.
2. Use the row's existing Edit affordance; verify clicking it still navigates to `/admin/portfolio/<id>/edit` (regression check).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/queries/projects.ts components/admin/PortfolioAdminTable.tsx
git commit -m "add: portfolio admin table renders uploaded thumbnails"
```

---

## Task 12 — Portfolio create page + createProject wiring

**Files:**

- Create: `app/admin/portfolio/new/page.tsx`
- Modify: `app/admin/portfolio/page.tsx`

(`createProject` was added in Task 10 already.)

- [ ] **Step 1: Create `app/admin/portfolio/new/page.tsx`**

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { PortfolioTagsField } from "@/components/admin/PortfolioTagsField";
import { createProject } from "../actions";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft · ฉบับร่าง" },
  { value: "Under Review", label: "Under Review · กำลังตรวจ" },
  { value: "Published", label: "Published · เผยแพร่" },
];

const ICON_OPTIONS = [
  { value: "", label: "— (default trend)" },
  { value: "trend", label: "trend" },
  { value: "sun", label: "sun" },
  { value: "wave", label: "wave" },
  { value: "cube", label: "cube" },
  { value: "calendar", label: "calendar" },
  { value: "beakers", label: "beakers" },
];

export default function NewProjectPage() {
  return (
    <>
      <AdminTopbar
        titleTh="โปรเจกต์ใหม่"
        eyebrow="Portfolio · new project"
        actions={
          <Link
            href="/admin/portfolio"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดโปรเจกต์" en="Project details" />
        <form
          action={createProject}
          encType="multipart/form-data"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (optional)
            </span>
            <input
              name="title_th"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author line · ผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
              placeholder="e.g. ธรรศ์ × นนท์ — Y9 / 2025"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Class · ชั้นเรียน
            </span>
            <input
              name="klass"
              type="text"
              maxLength={32}
              placeholder="e.g. Y9"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Long description · รายละเอียด
            </span>
            <textarea
              name="desc_long"
              rows={4}
              maxLength={1200}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Status · สถานะ
            </span>
            <select
              name="status"
              required
              defaultValue="Draft"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb icon
            </span>
            <select
              name="icon_key"
              defaultValue=""
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb background CSS (optional, e.g. var(--color-blue))
            </span>
            <input
              name="thumb_bg"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[12px]"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Submitted at (YYYY-MM-DD)
            <input
              name="submitted_at"
              type="date"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Project thumbnail (optional, jpg/png/webp, ≤5 MB)
            </span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </div>

          <PortfolioTagsField initialTags={[]} />

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Create project →
            </Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Wire `+ Add Project` Btn to `/admin/portfolio/new`**

Modify `app/admin/portfolio/page.tsx` — replace the Btn + deferred comment with a Link styled as a button:

```tsx
import Link from "next/link";
// ... existing imports (Btn stays for the Export Btn)

export default async function AdminPortfolio() {
  const [kpis, rows] = await Promise.all([
    getPortfolioKpis(),
    getAdminPortfolioRows(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="จัดการ Portfolio"
        eyebrow="Portfolio Manager · รุ่นพี่"
        actions={
          <>
            <AdminSearch placeholder="🔍  Search projects, authors…" />
            <Btn>Export ↓</Btn>
            <Link
              href="/admin/portfolio/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + Add Project
            </Link>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <TabBar tabs={PORTFOLIO_TABS} activeId={PORTFOLIO_ACTIVE_TAB} />

      <Card className="!p-0">
        <PortfolioAdminTable rows={rows} />
      </Card>
    </>
  );
}
```

(The Link is styled to match the existing `+ New Booking` button in `app/admin/bookings/page.tsx:117` — same visual treatment as the previous Btn variant="primary".)

- [ ] **Step 3: Manual smoke**

1. Open `/admin/portfolio`. Click `+ Add Project`.
2. Fill title_en (required), status (Draft). Add 2 tags (one yellow to confirm `textColor: ink`). Upload a thumbnail. Click "Create project →".
3. Confirm redirect to `/admin/portfolio` and the new row appears with thumbnail and tags.
4. Try a submission with empty title_en — `required` on the input should block submission client-side.
5. Try a submission without a thumbnail or tags — should succeed.

- [ ] **Step 4: Commit**

```bash
git add app/admin/portfolio/new/page.tsx app/admin/portfolio/page.tsx
git commit -m "add: portfolio create-new flow at /admin/portfolio/new"
```

---

## Final verification — exit-criteria walkthrough

Before declaring Phase 5a complete, run the full checklist below end-to-end. Each step must work without manual refresh (except where noted), and every change must survive a full reload.

1. **Realtime — sport scoreboard:** open `/student/sport` in tab A, update a `sport_results` row in tab B (admin or dashboard), verify tab A updates within ~1 second.
2. **Realtime — Carelin desk:** open `/admin/carelin` in tab A, submit an anon Carelin request in tab B, verify tab A's desk list shows the new row within ~1 second.
3. **Realtime — admin bookings:** open `/admin/bookings` in tab A, book a room anonymously in tab B, verify tab A's Gantt + today's-bookings table update within ~1 second.
4. **Storage — P'share:** create a new P'share post via `/admin/pshare/new` with an uploaded header image. Publish. Open `/student/pshare/<slug>` — image renders above markdown body. Replace the image via edit — new image renders. Delete the post — storage object gone.
5. **Storage — Portfolio:** edit an existing project; upload a thumbnail. Confirm thumbnail renders in `/admin/portfolio` row. Replace thumbnail. Delete project — storage object gone.
6. **Tag editor:** edit a project; add 3 tags (mix swatches, include yellow to verify `textColor: ink`); save; reopen — all tags + swatches preserved. Remove one tag; save; reopen — tag is gone. Yellow tag's text remains readable on yellow.
7. **Portfolio create:** open `/admin/portfolio/new`. Create a fresh project with title_en, Draft status, 2 tags, thumbnail. Confirm it appears at `/admin/portfolio`. Confirm it appears at `/student/portfolio` only if you change status to Published.
8. **Phase 4 regression smoke:** rerun Phase 4's exit checklist from `docs/handoff.md` (Carelin anon post + reply + answered; admin booking create/edit/cancel; sport result record; calendar edit/delete; site_config edit). All must still work.

If all 8 pass, Phase 5a is shipped. Update `docs/handoff.md` to reflect the new state (and queue up the Phase 5b spec for cleanup + polish — handoff candidates #4, #6, #10, #11, #12, #13, #14, plus the residual #3, #8, #9 if desired).

---

## Self-review checklist (writer)

- [x] **Spec coverage:** every spec section maps to a task (migration → T1; RealtimeRefresh → T2; mounts → T3–5; storage helper + next config → T6; pshare upload + reader → T7–8; tag editor + portfolio create flow → T9–12).
- [x] **No placeholders:** every code block is concrete (no `TBD`, no "similar to Task N").
- [x] **Type consistency:** `art_image_path` / `image_path` / `imagePath` (the camel-cased UI prop on `PortfolioAdminRow`) are consistent across DB / SELECT / type / render. `TAG_SWATCHES` ids (`"blue" | "yellow" | "green" | "purple" | "orange"`) are consistent across the leaf + `normalizeTags`. Action signatures are all `(formData: FormData) => Promise<void>`.
- [x] **Scope:** 12 tasks, ~10–14 commits, matches Phase 4 cadence.
