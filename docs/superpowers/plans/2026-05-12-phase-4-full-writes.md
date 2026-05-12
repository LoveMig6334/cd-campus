# Phase 4 — Full write surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every remaining inert prototype button to a real Server Action, add one RLS migration to permit anonymous room bookings, and ship the `/student/pshare/[slug]` reader so the publish→read loop closes. After Phase 4 the prototype is fully interactive end-to-end and every change survives refresh.

**Architecture:** Reuses Phase 3d's pattern wholesale — hand-rolled validation, no Zod / `react-hook-form`, Server Actions co-located with the page that owns them. Two action shapes: `(formData) => Promise<void>` for `<form action={fn}>` (the majority), and `(prev, formData) => Promise<ActionResult>` for the one new `useActionState`-backed form (`bookRoom`). Auth via the existing `requireAdmin()` / `requireRootAdmin()` helpers. Service-role usage extends from 2 → 3 functions (adds `deleteCarelinRequest`). One schema migration (`0003_phase4_anon_bookings.sql`) adds anon INSERT to `bookings` plus identity columns mirroring `carelin_requests`.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState` + `useFormStatus`), `@supabase/ssr` server client + `@supabase/supabase-js` service-role client, generated `Database` types, `react-markdown` + `remark-gfm` (already in `package.json`).

**Spec:** [`docs/superpowers/specs/2026-05-12-phase-4-full-writes.md`](../specs/2026-05-12-phase-4-full-writes.md).

---

## Departures from skill defaults

**No automated tests.** Same rationale as 3a–3d. Verification per task is `npm run lint && npm run build`; final verification is the spec's exit-criteria walkthrough (manual page exercise covering anon bookings, calendar edit, sport result recording, portfolio toggle, site_config edit, root-only carelin delete, P'share reader, admin bookings CRUD).

**Per-task commits on `main`.** No feature branch, no PR. Each task ends with one commit. Commit messages follow the lowercase imperative style established by recent history ("add: …", "fix: …", "update: …", "docs: …"). No `Co-Authored-By` trailer.

**No caching.** Phase 4 stays uncached. Every consuming route is dynamic because the Supabase server client reads `cookies()`. `revalidatePath` still runs after every write to flush the per-navigation Router cache.

---

## Action contract (carried from 3d)

```ts
// lib/actions.ts — exists, untouched in Phase 4
export type ActionResult = { ok: true } | { ok: false; error: string };
```

Two signature shapes used in Phase 4:

```ts
// (A) useActionState-backed — used by bookRoom only
(prev: ActionResult, formData: FormData) => Promise<ActionResult>

// (B) Plain server action — used by every other action in Phase 4
(formData: FormData) => Promise<void>
```

Shape (B) early-returns silently on validation failure (client-side `required` / `pattern` shadow them), `throw new Error(msg)` on real DB failures (surfaces in Next's error boundary), calls `revalidatePath(...)` and then `redirect(...)` on success.

---

## Auth helpers (carried from 3d)

`lib/auth.ts` already exports `requireAdmin()` and `requireRootAdmin()`. Both `throw new Error(...)` on failure. Phase 4 reuses them as-is; no new auth helpers are needed. **There is no `requireStudent()` helper** — anonymous writes (Carelin + bookings) use the anon Supabase client + DB-level check constraints + hand-rolled validators in the action.

---

## Revalidate matrix

Use this when implementing each task. Routes that depend on each entity:

| Action                                                   | revalidatePath calls                                                                  | Then                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `deleteCarelinRequest`                                   | `/admin/carelin`, `/admin/carelin/[id]` (use literal of id)                           | `redirect('/admin/carelin')`                                                     |
| `updateEvent`                                            | `/admin/calendar`, `/student/calendar`, `/admin`, `/student`                          | `redirect('/admin/calendar')`                                                    |
| `deleteEvent`                                            | same as updateEvent                                                                   | `redirect('/admin/calendar')`                                                    |
| `recordSportResult`                                      | `/admin/sport`, `/student/sport`                                                      | `redirect('/admin/sport')`                                                       |
| `updateSportResult`                                      | same                                                                                  | `redirect('/admin/sport')`                                                       |
| `deleteSportResult`                                      | same                                                                                  | `redirect('/admin/sport')`                                                       |
| `setProjectStatus`                                       | `/admin/portfolio`, `/student/portfolio`                                              | (no redirect — caller is already on `/admin/portfolio`)                          |
| `updateProject`                                          | same                                                                                  | `redirect('/admin/portfolio')`                                                   |
| `deleteProject`                                          | same                                                                                  | `redirect('/admin/portfolio')`                                                   |
| `updateSiteConfig` (`home_hero`)                         | `/student`, `/admin/config`, `/admin/config/home_hero/edit`                           | `redirect('/admin/config')`                                                      |
| `updateSiteConfig` (`overview_kpis`, `trend_chart`)      | `/admin`, `/admin/config`, `/admin/config/[key]/edit`                                 | `redirect('/admin/config')`                                                      |
| `updateSiteConfig` (`portfolio_kpis`, `portfolio_stats`) | `/admin/portfolio`, `/student/portfolio`, `/admin/config`, `/admin/config/[key]/edit` | `redirect('/admin/config')`                                                      |
| `updateSiteConfig` (`carelin_kpis`)                      | `/admin/carelin`, `/admin/config`, `/admin/config/[key]/edit`                         | `redirect('/admin/config')`                                                      |
| `createBooking`                                          | `/admin/bookings`, `/student/booking`, `/admin`                                       | `redirect('/admin/bookings')`                                                    |
| `updateBooking`                                          | same                                                                                  | `redirect('/admin/bookings')`                                                    |
| `cancelBooking` (DELETE)                                 | same                                                                                  | `redirect('/admin/bookings')`                                                    |
| `bookRoom` (anon)                                        | `/student/booking`, `/admin/bookings`, `/admin`                                       | returns `{ok:true}`; client form calls `router.replace('/student/booking?ok=1')` |

---

## Constants

- **Today (prototype):** `2026-05-12`.
- **Anchor timezone:** Asia/Bangkok (`+07:00`).
- **`booking_status` enum:** `'Confirmed' | 'Pending' | 'Review'`. **No `Cancelled`** — `cancelBooking` performs a hard DELETE.
- **`project_status` enum:** `'Published' | 'Under Review' | 'Draft'`.
- **`sport_result_category` enum:** `'Track' | 'Team'`.
- **`event_category` enum:** `'sport' | 'tradition' | 'music' | 'admin' | 'academic'`.
- **Period IDs (new):** `'morning' | 'midday' | 'evening'`.

---

## Form input styling

Reused across every new admin form in Phase 4 (matches `app/admin/admins/page.tsx` from 3d). Save typing — keep this snippet handy:

```tsx
className =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";
```

Label wrapper:

```tsx
className =
  "flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700";
```

Submit button: use `<Btn variant="primary">…→</Btn>` from `components/admin/Btn.tsx`. Second submit on same form: use plain `<button type="submit" formAction={fn}>` (`Btn` hardcodes `type="button"` — confirmed in 3d).

---

## Tasks

### Task 1: `deleteCarelinRequest` (root-only, service-role)

Smallest item — extends an existing actions file, gates the new row control to root in a server-resolved prop, and exercises the service-role escape hatch pattern one more time.

**Files:**

- Modify: `app/admin/carelin/actions.ts`
- Modify: `components/admin/CarelinDeskTable.tsx`
- Modify: `app/admin/carelin/page.tsx`

- [ ] **Step 1: Read current state**

```bash
cat app/admin/carelin/actions.ts
cat components/admin/CarelinDeskTable.tsx
cat app/admin/carelin/page.tsx
```

Note the existing actions (`replyToCarelin`, `markAnswered`), the current `⋯` column (if any) in the table, and how the page calls `requireAdmin()`.

- [ ] **Step 2: Add `deleteCarelinRequest` to `app/admin/carelin/actions.ts`**

Append to the existing file (do not rewrite the existing actions):

```ts
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { requireRootAdmin } from "@/lib/auth";

// …existing replyToCarelin and markAnswered above…

export async function deleteCarelinRequest(formData: FormData): Promise<void> {
  await requireRootAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const svc = getSupabaseServiceRole();
  const { error } = await svc.from("carelin_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${id}`);
  redirect("/admin/carelin");
}
```

The existing `revalidatePath` + `redirect` + `createClient` imports are already at the top of the file from 3d — only add `getSupabaseServiceRole` and `requireRootAdmin` if not already imported.

- [ ] **Step 3: Pass an `isRoot` prop into `CarelinDeskTable`**

Modify `app/admin/carelin/page.tsx`. Replace the `requireAdmin()` call (or add alongside) so the page resolves the caller's tier once:

```tsx
import { requireAdmin } from "@/lib/auth";
// …
const admin = await requireAdmin();
const isRoot = admin.tier === "root";
// …pass to the table component:
<CarelinDeskTable rows={rows} isRoot={isRoot} />;
```

If the existing page already calls `requireAdmin()`, just keep its result and add `const isRoot = admin.tier === "root";`. Do not call `requireRootAdmin()` here — normal admins must still see the page.

- [ ] **Step 4: Render the Delete button in `CarelinDeskTable.tsx`**

Modify `components/admin/CarelinDeskTable.tsx`. Add the new prop and render a small per-row form in the existing `⋯` cell (or add a trailing column if no `⋯` cell exists yet):

```tsx
import { deleteCarelinRequest } from "@/app/admin/carelin/actions";

type Props = {
  rows: CarelinDeskRow[];
  isRoot: boolean;
};

export function CarelinDeskTable({ rows, isRoot }: Props) {
  // …existing markup…

  // Trailing cell per row:
  <td className={td}>
    {isRoot && (
      <form action={deleteCarelinRequest}>
        <input type="hidden" name="id" value={row.id} />
        <button
          type="submit"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </form>
    )}
  </td>
```

If the table already has a `⋯` column header, change its label to empty string `""` and replace the cell content as above. If it does not, add `""` to the headers array and append the cell to each row.

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 6: Manual verify**

```bash
npm run dev
```

1. Sign in as the root admin → `/admin/carelin` → confirm each row has a Delete control.
2. Click Delete on one open request → row disappears; the dynamic Open/Answered tab counts on `getCarelinTabCounts` (from 3d) update.
3. Sign in as a normal admin (created via `/admin/admins` in 3d) → Delete control is absent.

- [ ] **Step 7: Commit**

```bash
git add app/admin/carelin/actions.ts components/admin/CarelinDeskTable.tsx app/admin/carelin/page.tsx
git commit -m "add: deleteCarelinRequest root-only action + row control"
```

---

### Task 2: `/student/pshare/[slug]` reader

Closes the publish→read loop from 3d. Single new page + one new query helper. Read-only.

**Files:**

- Modify: `lib/queries/pshare.ts`
- Create: `app/student/pshare/[slug]/page.tsx`
- Create: `components/student/PshareReader.tsx`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/pshare.ts
cat components/student/PshareCard.tsx
```

Confirm `PshareCard` already links to `/student/pshare/${post.slug}` (it does — verified in brainstorming). If not, fix the href.

- [ ] **Step 2: Add `getPsharePostBySlug` to `lib/queries/pshare.ts`**

Append after the existing exports:

```ts
import type { Database } from "@/lib/supabase/database.types";

export type PsharePostFull =
  Database["public"]["Tables"]["pshare_posts"]["Row"];

export async function getPsharePostBySlug(
  slug: string,
): Promise<PsharePostFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`getPsharePostBySlug: ${error.message}`);
  return data;
}
```

The `status = 'published'` filter is belt-and-suspenders — anon RLS already restricts SELECT to published rows, but the filter makes intent obvious and lets logged-in admins reuse the helper without leaking drafts.

- [ ] **Step 3: Create the markdown reader leaf**

Create `components/student/PshareReader.tsx`:

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PshareReader({ body }: { body: string }) {
  return (
    <div className="prose prose-sm text-ink [&_h1]:font-display [&_h2]:font-display max-w-none font-sans text-[14px] leading-[1.7] [&_a]:underline [&_h1]:text-[22px] [&_h1]:italic [&_h2]:text-[18px] [&_h2]:italic">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
```

`react-markdown` is a client-only library (uses `useState` internally for code highlighting refs) — keep this leaf as `"use client"`. The surrounding page stays RSC.

- [ ] **Step 4: Create the reader page**

Create `app/student/pshare/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { IconButton } from "@/components/ui/IconButton";
import { PshareReader } from "@/components/student/PshareReader";
import { getPsharePostBySlug } from "@/lib/queries/pshare";

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
        action={
          <Link href="/student/pshare">
            <IconButton label="Back · กลับ">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </IconButton>
          </Link>
        }
      />
      <MobileBody className="space-y-3.5">
        <div
          className={`${halftoneClass} border-ink grid aspect-[5/3] place-items-center border-[1.5px]`}
          style={{
            background: post.art_bg ?? "var(--color-cream)",
          }}
        >
          <span
            className="font-display text-[64px] leading-none italic"
            style={{ color: post.art_num_color ?? "var(--color-ink)" }}
          >
            {post.num_label ?? "·"}
          </span>
        </div>

        <header className="space-y-1.5">
          <p className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
            {post.author_alias ?? ""}
          </p>
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

        {post.tags && post.tags.length > 0 && (
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

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 6: Manual verify**

```bash
npm run dev
```

1. As anon → `/student/pshare` → click any card → reader renders with art panel, title, snippet, body, tags.
2. Type a non-existent slug into the URL → 404 page.
3. As admin, publish a new post via `/admin/pshare/new` → visit the slug → renders.
4. Demote a published post to `draft` via the editor → visit the slug → 404 (RLS hides it).

- [ ] **Step 7: Commit**

```bash
git add lib/queries/pshare.ts app/student/pshare/[slug]/page.tsx components/student/PshareReader.tsx
git commit -m "add: /student/pshare/[slug] reader page"
```

---

### Task 3: Migration `0003_phase4_anon_bookings.sql` + regenerated types

Schema-only task. Lands before any bookings feature work so subsequent tasks have the columns and policy available. Additive change only — no existing row breaks.

**Files:**

- Create: `supabase/migrations/0003_phase4_anon_bookings.sql`
- Modify: `lib/supabase/database.types.ts` (regenerated; committed verbatim)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0003_phase4_anon_bookings.sql`:

```sql
-- Phase 4: enable anonymous student bookings.
-- Mirrors the carelin_requests anon-INSERT contract: hand-rolled DB-level check
-- on a 4-digit student_id_4 column, plus an RLS policy granting INSERT to anon.
-- Existing admin-created bookings continue to work; the new columns are nullable
-- and the constraint only fires when student_id_4 is non-null.

alter table bookings
  add column student_id_4 text,
  add column klass        text;

alter table bookings
  add constraint bookings_student_id_4_format
  check (student_id_4 is null or student_id_4 ~ '^[0-9]{4}$');

-- Anon INSERT — mirrors carelin_requests policy from 0002.
create policy "bookings_anon_insert"
  on bookings for insert to anon
  with check (
    user_label is not null
    and length(trim(user_label)) > 0
    and student_id_4 ~ '^[0-9]{4}$'
    and starts_at < ends_at
  );
```

- [ ] **Step 2: Push the migration**

```bash
supabase db push
```

Expected: migration applies. If `supabase` CLI is not linked, run `supabase login && supabase link --project-ref <ref>` first (one-time; project ref is in the existing `.env.local`).

- [ ] **Step 3: Regenerate types**

```bash
npm run gen:types
```

(That script wraps `supabase gen types typescript --linked > lib/supabase/database.types.ts` per the existing `package.json`.)

- [ ] **Step 4: Verify the types changed**

```bash
git diff lib/supabase/database.types.ts | head -40
```

Expected: `bookings` table's `Row`, `Insert`, and `Update` interfaces now include `student_id_4: string | null` and `klass: string | null`.

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass. No app code touches the new columns yet, so the regeneration is a pure additive type change.

- [ ] **Step 6: Spot-check the RLS policy in Supabase Studio**

In the Supabase Studio dashboard, open **Authentication → Policies → bookings** and confirm `bookings_anon_insert` is present with role `anon`. (No automated assertion — visual sanity check.)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0003_phase4_anon_bookings.sql lib/supabase/database.types.ts
git commit -m "add: migration 0003 — anon bookings INSERT policy + identity columns"
```

---

### Task 4: Calendar edit/delete + side-rail event list

Side-rail right of `BigCalGrid` listing this month's events with per-row Edit link + Delete button. BigCal cells remain non-interactive.

**Files:**

- Modify: `lib/queries/events.ts`
- Modify: `app/admin/calendar/actions.ts`
- Modify: `app/admin/calendar/page.tsx`
- Create: `app/admin/calendar/[id]/edit/page.tsx`
- Create: `components/admin/AdminCalendarEventList.tsx`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/events.ts
cat app/admin/calendar/actions.ts
cat app/admin/calendar/page.tsx
cat app/admin/calendar/new/page.tsx
```

Note the existing `addEvent` action, the field set in the New Event page (it becomes the template for the Edit page), and the existing `getAdminMonth` query.

- [ ] **Step 2: Add `getAdminMonthEventList` and `getEventById` to `lib/queries/events.ts`**

Append to the existing file:

```ts
export type AdminCalendarRow = {
  id: string;
  starts_at: string;
  title_th: string;
  title_en: string | null;
  tag: string | null;
  category: Database["public"]["Enums"]["event_category"];
  location: string | null;
  highlight: boolean;
};

export async function getAdminMonthEventList(
  year: number,
  month: number, // 1-indexed
): Promise<AdminCalendarRow[]> {
  const db = await createClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  const { data, error } = await db
    .from("events")
    .select(
      "id, starts_at, title_th, title_en, tag, category, location, highlight",
    )
    .gte("starts_at", start)
    .lt("starts_at", next)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminMonthEventList: ${error.message}`);
  return (data ?? []) as AdminCalendarRow[];
}

export async function getEventById(
  id: string,
): Promise<AdminCalendarRow | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select(
      "id, starts_at, title_th, title_en, tag, category, location, highlight",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getEventById: ${error.message}`);
  return data as AdminCalendarRow | null;
}
```

Add `import type { Database } from "@/lib/supabase/database.types";` to the top of the file if it isn't already there.

- [ ] **Step 3: Add `updateEvent` and `deleteEvent` to `app/admin/calendar/actions.ts`**

Append to the existing file (keep the existing `addEvent` untouched):

```ts
export async function updateEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const tag_raw = String(formData.get("tag") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const starts_at_local = String(formData.get("starts_at") ?? "").trim();
  const location_raw = String(formData.get("location") ?? "").trim();
  const highlight = formData.get("highlight") === "on";

  if (!title_th) return;
  if (!isCategory(category)) return;
  if (!starts_at_local) return;

  const starts_at = `${starts_at_local}:00+07:00`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(starts_at)) return;

  const db = await createClient();
  const { error } = await db
    .from("events")
    .update({
      title_th,
      title_en: title_en_raw || null,
      tag: tag_raw || null,
      category,
      starts_at,
      location: location_raw || null,
      highlight,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}
```

`isCategory` already exists in the file from 3d.

- [ ] **Step 4: Create the side-rail component**

Create `components/admin/AdminCalendarEventList.tsx`:

```tsx
import Link from "next/link";
import { CATEGORY_COLOR } from "@/lib/types";
import type { AdminCalendarRow } from "@/lib/queries/events";
import { deleteEvent } from "@/app/admin/calendar/actions";

function formatDateTime(ts: string): { date: string; time: string } {
  // "2026-05-13T11:30:00+07:00" → { date: "13 May", time: "11:30" }
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!m) return { date: ts.slice(0, 10), time: ts.slice(11, 16) };
  const monthMap: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  return {
    date: `${parseInt(m[3], 10)} ${monthMap[m[2]] ?? m[2]}`,
    time: m[4],
  };
}

export function AdminCalendarEventList({ rows }: { rows: AdminCalendarRow[] }) {
  return (
    <div className="border-ink bg-paper border-[1.5px]">
      <div className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase">
        This month · {rows.length} events
      </div>
      <ul>
        {rows.length === 0 && (
          <li className="text-mute-500 px-3 py-3 font-mono text-[12px]">
            No events this month.
          </li>
        )}
        {rows.map((row, i) => {
          const { date, time } = formatDateTime(row.starts_at);
          const dot = CATEGORY_COLOR[row.category];
          const border =
            i < rows.length - 1 ? "border-b border-dashed border-mute-200" : "";
          return (
            <li
              key={row.id}
              className={`flex items-center gap-3 px-3 py-2.5 ${border}`}
            >
              <span
                className="border-ink h-2 w-2 shrink-0 border"
                style={{ background: dot }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-mute-500 font-mono text-[10px] tracking-[0.14em] uppercase">
                    {date} · {time}
                  </span>
                  {row.highlight && (
                    <span className="font-mono text-[9px] tracking-[0.14em] text-yellow-700 uppercase">
                      ★ briefing
                    </span>
                  )}
                </div>
                <div className="font-display truncate text-[14px] italic">
                  {row.title_th}
                </div>
                {row.tag && (
                  <div className="text-mute-500 truncate font-mono text-[10px]">
                    {row.tag}
                  </div>
                )}
              </div>
              <Link
                href={`/admin/calendar/${row.id}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="font-mono text-[10px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
                >
                  Delete
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Wire the side rail into `/admin/calendar`**

Modify `app/admin/calendar/page.tsx`:

```tsx
import { AdminCalendarEventList } from "@/components/admin/AdminCalendarEventList";
import { getAdminMonth, getAdminMonthEventList } from "@/lib/queries/events";
// …

export default async function AdminCalendar() {
  const [days, list] = await Promise.all([
    getAdminMonth(2026, 5),
    getAdminMonthEventList(2026, 5),
  ]);
  return (
    <>
      <AdminTopbar /* …unchanged… */ />
      <CalendarLegend />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <BigCalGrid days={days} />
        <AdminCalendarEventList rows={list} />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Create the edit page**

Create `app/admin/calendar/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getEventById } from "@/lib/queries/events";
import { deleteEvent, updateEvent } from "../../actions";

const CATEGORIES = [
  "sport",
  "tradition",
  "music",
  "admin",
  "academic",
] as const;

function toDateTimeLocal(iso: string): string {
  // "2026-05-13T11:30:00+07:00" → "2026-05-13T11:30"
  const m = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return m ? m[1] : "";
}

export default async function AdminCalendarEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขกิจกรรม"
        eyebrow={`Calendar · edit · ${event.title_th}`}
      />
      <Card>
        <CardTitle th="แก้ไขกิจกรรม" en="Edit event" />
        <form
          action={updateEvent}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={event.id} />

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase md:col-span-2">
            Title TH · ชื่อกิจกรรม
            <input
              name="title_th"
              type="text"
              required
              defaultValue={event.title_th}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Title EN (optional)
            <input
              name="title_en"
              type="text"
              defaultValue={event.title_en ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Tag (e.g. "Sport · Stadium")
            <input
              name="tag"
              type="text"
              defaultValue={event.tag ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Category
            <select
              name="category"
              defaultValue={event.category}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Starts at
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(event.starts_at)}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Location (optional)
            <input
              name="location"
              type="text"
              defaultValue={event.location ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <label className="text-mute-700 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase md:col-span-2">
            <input
              name="highlight"
              type="checkbox"
              defaultChecked={event.highlight}
            />
            Highlight (yellow briefing chip)
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn variant="primary">Save changes →</Btn>
            <button
              type="submit"
              formAction={deleteEvent}
              className="border-line bg-paper border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-red-700 uppercase hover:bg-red-50"
            >
              Delete event
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
```

The Delete control is a second submit on the same form (3d's two-submit pattern, used in `PshareEditor`).

- [ ] **Step 7: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Manual verify**

```bash
npm run dev
```

1. Sign in as admin → `/admin/calendar` → side rail shows every May 2026 event.
2. Click **Edit** on a row → edit page loads pre-filled.
3. Change the title, save → redirect back; side-rail row reflects the change; `/student/calendar` reflects it too.
4. Click **Delete event** on the edit page → row disappears.
5. Click **Delete** directly from the side rail → row disappears.
6. BigCal cells remain non-interactive (no hover cursor change).

- [ ] **Step 9: Commit**

```bash
git add lib/queries/events.ts app/admin/calendar/actions.ts app/admin/calendar/page.tsx app/admin/calendar/[id]/edit/page.tsx components/admin/AdminCalendarEventList.tsx
git commit -m "add: calendar edit/delete + month-event side rail"
```

---

### Task 5: Sport result CRUD

Three new actions, two new pages, row-`⋯` column on the existing results table, and a button rename.

**Files:**

- Modify: `lib/queries/sportResults.ts`
- Modify: `app/admin/sport/actions.ts`
- Modify: `app/admin/sport/page.tsx`
- Modify: `components/admin/EventResultsTable.tsx`
- Create: `app/admin/sport/result/new/page.tsx`
- Create: `app/admin/sport/result/[id]/edit/page.tsx`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/sportResults.ts
cat app/admin/sport/actions.ts
cat components/admin/EventResultsTable.tsx
cat lib/queries/houses.ts
```

Note the existing `getAdminSportResults`, the `EventResultsTable` columns, and the four `houses` rows (id 1–4) used as placement values.

- [ ] **Step 2: Add `getSportResultById` to `lib/queries/sportResults.ts`**

Append:

```ts
export type SportResultRowFull =
  Database["public"]["Tables"]["sport_results"]["Row"];

export async function getSportResultById(
  id: string,
): Promise<SportResultRowFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSportResultById: ${error.message}`);
  return data;
}
```

Also export the row shape consumers will need — make sure `import type { Database } from "@/lib/supabase/database.types";` exists at the top.

- [ ] **Step 3: Add three actions to `app/admin/sport/actions.ts`**

Append to the existing file (keep `editScoreboard` untouched):

```ts
const SPORT_CATEGORIES = ["Track", "Team"] as const;
type SportCategory = (typeof SPORT_CATEGORIES)[number];

function isSportCategory(v: string): v is SportCategory {
  return (SPORT_CATEGORIES as readonly string[]).includes(v);
}

function parsePlacements(formData: FormData): number[] | null {
  const out: number[] = [];
  for (const slot of ["p1", "p2", "p3", "p4"] as const) {
    const raw = String(formData.get(slot) ?? "");
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 4) return null;
    if (out.includes(n)) return null; // disallow duplicates
    out.push(n);
  }
  return out;
}

function parseResult(formData: FormData):
  | {
      ok: true;
      data: {
        title_th: string;
        title_en: string | null;
        category: SportCategory;
        placements: number[];
        time_label: string | null;
      };
    }
  | { ok: false } {
  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const time_label_raw = String(formData.get("time_label") ?? "").trim();
  const placements = parsePlacements(formData);

  if (!title_th) return { ok: false };
  if (!isSportCategory(category)) return { ok: false };
  if (!placements) return { ok: false };

  return {
    ok: true,
    data: {
      title_th,
      title_en: title_en_raw || null,
      category,
      placements,
      time_label: time_label_raw || null,
    },
  };
}

export async function recordSportResult(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseResult(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db
    .from("sport_results")
    .insert({ ...parsed.data, created_by_admin_id: admin.id });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}

export async function updateSportResult(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parsed = parseResult(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db
    .from("sport_results")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}

export async function deleteSportResult(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("sport_results").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}
```

- [ ] **Step 4: Create the result-recording page**

Create `app/admin/sport/result/new/page.tsx`:

```tsx
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { recordSportResult } from "../../actions";

const HOUSES = [
  { id: 1, label: "Green · เขียว" },
  { id: 2, label: "Purple · ม่วง" },
  { id: 3, label: "Orange · ส้ม" },
  { id: 4, label: "Pink · ชมพู" },
];

export default function AdminSportResultNew() {
  return (
    <>
      <AdminTopbar
        titleTh="บันทึกผลการแข่งขัน"
        eyebrow="Sport · record result"
      />
      <Card>
        <CardTitle th="บันทึกผลใหม่" en="New result" />
        <form
          action={recordSportResult}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase md:col-span-2">
            Title TH · ชื่อรายการ
            <input
              name="title_th"
              type="text"
              required
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Title EN (optional)
            <input
              name="title_en"
              type="text"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Category
            <select
              name="category"
              defaultValue="Track"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              <option value="Track">Track</option>
              <option value="Team">Team</option>
            </select>
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Time label (optional, e.g. "10:42")
            <input
              name="time_label"
              type="text"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          {(["p1", "p2", "p3", "p4"] as const).map((slot, i) => (
            <label
              key={slot}
              className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              {`${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} place`}
              <select
                name={slot}
                required
                className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
              >
                <option value="">—</option>
                {HOUSES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="md:col-span-2">
            <Btn variant="primary">Record result →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 5: Create the result-edit page**

Create `app/admin/sport/result/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getSportResultById } from "@/lib/queries/sportResults";
import { deleteSportResult, updateSportResult } from "../../../actions";

const HOUSES = [
  { id: 1, label: "Green · เขียว" },
  { id: 2, label: "Purple · ม่วง" },
  { id: 3, label: "Orange · ส้ม" },
  { id: 4, label: "Pink · ชมพู" },
];

export default async function AdminSportResultEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getSportResultById(id);
  if (!row) notFound();

  const placements = (row.placements ?? []) as number[];

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขผล"
        eyebrow={`Sport · edit · ${row.title_th}`}
      />
      <Card>
        <CardTitle th="แก้ไขผลการแข่งขัน" en="Edit result" />
        <form
          action={updateSportResult}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase md:col-span-2">
            Title TH
            <input
              name="title_th"
              type="text"
              required
              defaultValue={row.title_th}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Title EN
            <input
              name="title_en"
              type="text"
              defaultValue={row.title_en ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Category
            <select
              name="category"
              defaultValue={row.category}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              <option value="Track">Track</option>
              <option value="Team">Team</option>
            </select>
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Time label
            <input
              name="time_label"
              type="text"
              defaultValue={row.time_label ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          {(["p1", "p2", "p3", "p4"] as const).map((slot, i) => (
            <label
              key={slot}
              className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              {`${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} place`}
              <select
                name={slot}
                required
                defaultValue={String(placements[i] ?? "")}
                className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
              >
                <option value="">—</option>
                {HOUSES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-center gap-3 md:col-span-2">
            <Btn variant="primary">Save result →</Btn>
            <button
              type="submit"
              formAction={deleteSportResult}
              className="border-line bg-paper border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-red-700 uppercase hover:bg-red-50"
            >
              Delete result
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 6: Add a row-edit column to `EventResultsTable.tsx`**

Modify `components/admin/EventResultsTable.tsx`. The component currently takes `rows: SportResultRow[]` where `SportResultRow` has no `id`. We need each row to carry its id so the edit link can be built.

(a) Add an `id?: string` field to `SportResultRow` in `lib/types.ts`:

```ts
export type SportResultRow = {
  id?: string; // optional for backwards compat — populated by the admin query
  titleTh: string;
  titleEn: string;
  category: "Track" | "Team";
  placements: House[];
  time: string;
};
```

(b) Update `lib/queries/sportResults.ts` `getAdminSportResults` (already exists) to populate `id` on each row. Look for the existing `.select(...)` call and ensure it includes `id`; map it through in the returned object.

(c) Add a trailing header `""` and a per-row trailing cell to `EventResultsTable.tsx`:

```tsx
<td className={td}>
  {row.id && (
    <Link
      href={`/admin/sport/result/${row.id}/edit`}
      className="text-mute-700 hover:text-ink font-mono text-[10px] tracking-[0.14em] uppercase"
    >
      Edit
    </Link>
  )}
</td>
```

Import `Link` from `next/link` at the top if not already.

- [ ] **Step 7: Rename and wire the `+ Add event` topbar button**

Modify `app/admin/sport/page.tsx`. Replace the existing button:

```tsx
import Link from "next/link";
// …
<AdminTopbar
  titleTh="กีฬาสี"
  eyebrow="Sport Day · Day 2 of 3 · Live"
  actions={
    <>
      <LiveIndicator label="Broadcasting live" />
      <Btn>Export</Btn>
      <Link
        href="/admin/sport/result/new"
        className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
      >
        + Record result
      </Link>
    </>
  }
/>;
```

The Link styling matches the `+ Add Event` button on `/admin/calendar` from 3d for visual parity.

- [ ] **Step 8: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 9: Manual verify**

```bash
npm run dev
```

1. `/admin/sport` → topbar shows **+ Record result**.
2. Click it → form → fill bilingual titles, pick all 4 unique houses, submit.
3. Redirect back; new row appears in **Event results** table; `/student/sport` reflects it.
4. Click **Edit** on the new row → form pre-fills; change category to Team, save → row updates.
5. Click **Delete result** in the editor → row disappears.

- [ ] **Step 10: Commit**

```bash
git add lib/queries/sportResults.ts app/admin/sport/actions.ts app/admin/sport/page.tsx app/admin/sport/result/new/page.tsx app/admin/sport/result/[id]/edit/page.tsx components/admin/EventResultsTable.tsx lib/types.ts
git commit -m "add: sport result record/update/delete + edit route"
```

---

### Task 6: Portfolio CRUD (status toggle + edit + delete; defer create)

Three actions, one edit page, status submenu in the existing `⋯` cell. `+ Add Project` stays inert with a flagged comment.

**Files:**

- Modify: `lib/queries/projects.ts`
- Create: `app/admin/portfolio/actions.ts`
- Create: `app/admin/portfolio/[id]/edit/page.tsx`
- Modify: `app/admin/portfolio/page.tsx`
- Modify: `components/admin/PortfolioAdminTable.tsx`
- Modify: `lib/types.ts`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/projects.ts
cat components/admin/PortfolioAdminTable.tsx
cat app/admin/portfolio/page.tsx
```

Note the existing decorative `⋯` cell on each row (`PortfolioAdminTable.tsx:88-92`) and the lack of `id` on `PortfolioAdminRow`.

- [ ] **Step 2: Add `id` to `PortfolioAdminRow` and populate it**

In `lib/types.ts`, add `id` to the type:

```ts
export type PortfolioAdminRow = {
  id: string;
  thumb: { iconKey: PortfolioThumbIcon; bg?: string };
  // …rest unchanged
};
```

In `lib/queries/projects.ts`, update `getAdminPortfolioRows` to select and return `id`:

```ts
const { data, error } = await db
  .from("projects")
  .select(
    "id, title_en, title_th, author_line, klass, icon_key, thumb_bg, tags, submitted_at, status",
  )
  .order("created_at", { ascending: true });
// …
return (data ?? []).map<PortfolioAdminRow>((p) => ({
  id: p.id,
  thumb: {
    /* unchanged */
  },
  // …rest unchanged
}));
```

Add `getProjectById`:

```ts
export type ProjectFull = Database["public"]["Tables"]["projects"]["Row"];

export async function getProjectById(id: string): Promise<ProjectFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProjectById: ${error.message}`);
  return data;
}
```

- [ ] **Step 3: Create `app/admin/portfolio/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const STATUSES = ["Published", "Under Review", "Draft"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(v: string): v is Status {
  return (STATUSES as readonly string[]).includes(v);
}

function revalidatePortfolio() {
  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
}

export async function setProjectStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isStatus(status)) return;

  const db = await createClient();
  const { error } = await db.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePortfolio();
  // No redirect — caller stays on /admin/portfolio.
}

export async function updateProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const title_en = String(formData.get("title_en") ?? "").trim();
  const title_th_raw = String(formData.get("title_th") ?? "").trim();
  const author_line_raw = String(formData.get("author_line") ?? "").trim();
  const klass_raw = String(formData.get("klass") ?? "").trim();
  const desc_long_raw = String(formData.get("desc_long") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const icon_key_raw = String(formData.get("icon_key") ?? "").trim();
  const thumb_bg_raw = String(formData.get("thumb_bg") ?? "").trim();
  const submitted_at_raw = String(formData.get("submitted_at") ?? "").trim();

  if (!title_en) return;
  if (!isStatus(status)) return;

  const db = await createClient();
  const { error } = await db
    .from("projects")
    .update({
      title_en,
      title_th: title_th_raw || null,
      author_line: author_line_raw || null,
      klass: klass_raw || null,
      desc_long: desc_long_raw || null,
      status,
      icon_key: icon_key_raw || null,
      thumb_bg: thumb_bg_raw || null,
      submitted_at: submitted_at_raw || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePortfolio();
  redirect("/admin/portfolio");
}

export async function deleteProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePortfolio();
  redirect("/admin/portfolio");
}
```

Note: this task does not edit `tags` (the JSONB shape is non-trivial — Phase 4 keeps existing tag arrays intact via partial update). Editing tags is a Phase 5 concern.

- [ ] **Step 4: Replace the `⋯` cell with the status submenu**

Modify `components/admin/PortfolioAdminTable.tsx`. Replace the trailing `<td>` content:

```tsx
import Link from "next/link";
import { setProjectStatus } from "@/app/admin/portfolio/actions";
// …

const STATUS_OPTIONS: PortfolioAdminRow["status"][] = [
  "Published",
  "Under Review",
  "Draft",
];

// In the row map, replace the trailing td:
<td className={td}>
  <div className="flex items-center gap-2">
    <form action={setProjectStatus} className="flex items-center gap-1">
      <input type="hidden" name="id" value={row.id} />
      {STATUS_OPTIONS.filter((s) => s !== row.status).map((s) => (
        <button
          key={s}
          type="submit"
          name="status"
          value={s}
          title={`Set to ${s}`}
          className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase"
        >
          {s === "Published" ? "Pub" : s === "Under Review" ? "Rev" : "Drf"}
        </button>
      ))}
    </form>
    <Link
      href={`/admin/portfolio/${row.id}/edit`}
      className="text-mute-700 hover:text-ink font-mono text-[10px] tracking-[0.14em] uppercase"
    >
      Edit
    </Link>
  </div>
</td>;
```

The header for that column stays `""`.

- [ ] **Step 5: Add a `// deferred to Phase 5` comment to the `+ Add Project` button**

Modify `app/admin/portfolio/page.tsx`. Find the `<Btn variant="primary">+ Add Project</Btn>` line and prefix with a comment:

```tsx
{
  /* + Add Project: deferred to Phase 5 — needs student submission flow design. */
}
<Btn variant="primary">+ Add Project</Btn>;
```

- [ ] **Step 6: Create the edit page**

Create `app/admin/portfolio/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getProjectById } from "@/lib/queries/projects";
import { deleteProject, updateProject } from "../../actions";

const ICON_KEYS = [
  "trend",
  "sun",
  "wave",
  "cube",
  "calendar",
  "beakers",
  "crop",
  "solar",
  "shm",
];

export default async function AdminPortfolioEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโครงงาน"
        eyebrow={`Portfolio · edit · ${project.title_en}`}
      />
      <Card>
        <CardTitle th="แก้ไขโครงงาน" en="Edit project" />
        <form
          action={updateProject}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={project.id} />

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Title EN
            <input
              name="title_en"
              type="text"
              required
              defaultValue={project.title_en}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Title TH
            <input
              name="title_th"
              type="text"
              defaultValue={project.title_th ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase md:col-span-2">
            Description (long)
            <textarea
              name="desc_long"
              rows={4}
              defaultValue={project.desc_long ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Author line (e.g. "ธรรศ์ × นนท์ — Y9 / 2025")
            <input
              name="author_line"
              type="text"
              defaultValue={project.author_line ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Class (e.g. "Y9 / 2025")
            <input
              name="klass"
              type="text"
              defaultValue={project.klass ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Status
            <select
              name="status"
              defaultValue={project.status}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              <option value="Published">Published</option>
              <option value="Under Review">Under Review</option>
              <option value="Draft">Draft</option>
            </select>
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Icon key
            <select
              name="icon_key"
              defaultValue={project.icon_key ?? "trend"}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              {ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Thumb background (CSS color)
            <input
              name="thumb_bg"
              type="text"
              defaultValue={project.thumb_bg ?? ""}
              placeholder="var(--color-blue)"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Submitted at (YYYY-MM-DD)
            <input
              name="submitted_at"
              type="date"
              defaultValue={project.submitted_at ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <div className="flex items-center gap-3 md:col-span-2">
            <Btn variant="primary">Save project →</Btn>
            <button
              type="submit"
              formAction={deleteProject}
              className="border-line bg-paper border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-red-700 uppercase hover:bg-red-50"
            >
              Delete project
            </button>
          </div>
          <p className="text-mute-500 font-mono text-[10px] md:col-span-2">
            Tags are managed in Phase 5 — existing tags are preserved by this
            form.
          </p>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 7: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Manual verify**

```bash
npm run dev
```

1. `/admin/portfolio` → trailing cell shows 2 status-jump buttons + Edit link per row.
2. Click **Pub** on a Draft row → status flips; row's Status pill updates; `/student/portfolio` reflects the change.
3. Click **Edit** on a row → form pre-fills; change description, save → list reflects it.
4. Click **Delete project** in the editor → row disappears.
5. `+ Add Project` button stays present, click does nothing (no href / no action).

- [ ] **Step 9: Commit**

```bash
git add lib/types.ts lib/queries/projects.ts app/admin/portfolio/actions.ts app/admin/portfolio/page.tsx app/admin/portfolio/[id]/edit/page.tsx components/admin/PortfolioAdminTable.tsx
git commit -m "add: portfolio status/update/delete + edit route"
```

---

### Task 7: `site_config` editor (index + per-key forms)

Largest content surface. One generic `updateSiteConfig` action that key-dispatches; one index page; one `[key]/edit` route with six conditional form bodies.

**Files:**

- Modify: `lib/queries/siteConfig.ts`
- Create: `app/admin/config/page.tsx`
- Create: `app/admin/config/[key]/edit/page.tsx`
- Create: `app/admin/config/actions.ts`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/siteConfig.ts
cat supabase/seed/data/home-hero.ts
cat supabase/seed/data/admin-overview.ts
cat supabase/seed/data/admin-portfolio.ts
cat supabase/seed/data/portfolios.ts
cat supabase/seed/data/admin-carelin.ts
cat lib/types.ts | grep -A 10 "HomeHero\|AdminKpi\|PortfolioStats\|TrendChart"
```

Confirm the shapes: `HomeHero` has `eyebrow`, `titleLines[]`, `leading: {house, label, points}`, `whereTh`, `weather: {degrees, glyph}`. `AdminKpi[]` is a 4-item array of `{label, th, num, delta: {kind, text}}`. `PortfolioStats[]` is a 3-item array of `{num, label}`. `TrendChartData` is `{months[12], path, points[13]}`.

- [ ] **Step 2: Add `getConfigByKey` to `lib/queries/siteConfig.ts`**

Append:

```ts
export async function getConfigByKey<T>(key: string): Promise<T> {
  return getValue<T>(key);
}
```

`getValue` already exists at the top of the file; this is just a public re-export with a friendlier name.

- [ ] **Step 3: Create `app/admin/config/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

const EDITABLE_KEYS = [
  "home_hero",
  "overview_kpis",
  "trend_chart",
  "portfolio_stats",
  "portfolio_kpis",
  "carelin_kpis",
] as const;
type EditableKey = (typeof EDITABLE_KEYS)[number];

function isEditableKey(v: string): v is EditableKey {
  return (EDITABLE_KEYS as readonly string[]).includes(v);
}

function revalidateFor(key: EditableKey) {
  revalidatePath("/admin/config");
  revalidatePath(`/admin/config/${key}/edit`);
  if (key === "home_hero") revalidatePath("/student");
  if (key === "overview_kpis" || key === "trend_chart")
    revalidatePath("/admin");
  if (key === "portfolio_kpis" || key === "portfolio_stats") {
    revalidatePath("/admin/portfolio");
    revalidatePath("/student/portfolio");
  }
  if (key === "carelin_kpis") revalidatePath("/admin/carelin");
}

function parseHomeHero(fd: FormData): Json {
  const titleLinesRaw = String(fd.get("title_lines") ?? "");
  const titleLines = titleLinesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    eyebrow: String(fd.get("eyebrow") ?? "").trim(),
    titleLines,
    leading: {
      house: String(fd.get("leading_house") ?? "").trim(),
      label: String(fd.get("leading_label") ?? "").trim(),
      points: Number(fd.get("leading_points") ?? 0),
    },
    whereTh: String(fd.get("where_th") ?? "").trim(),
    weather: {
      degrees: Number(fd.get("weather_degrees") ?? 0),
      glyph: String(fd.get("weather_glyph") ?? "").trim(),
    },
  } as Json;
}

function parseKpiArray(fd: FormData): Json {
  // 4 KPIs, fields kpi_{i}_{field}
  const out: unknown[] = [];
  for (let i = 0; i < 4; i++) {
    out.push({
      label: String(fd.get(`kpi_${i}_label`) ?? "").trim(),
      th: String(fd.get(`kpi_${i}_th`) ?? "").trim(),
      num: String(fd.get(`kpi_${i}_num`) ?? "").trim(),
      delta: {
        kind: String(fd.get(`kpi_${i}_delta_kind`) ?? "flat").trim(),
        text: String(fd.get(`kpi_${i}_delta_text`) ?? "").trim(),
      },
    });
  }
  return out as Json;
}

function parsePortfolioStats(fd: FormData): Json {
  const out: unknown[] = [];
  // 3 stats
  for (let i = 0; i < 3; i++) {
    out.push({
      num: Number(fd.get(`stat_${i}_num`) ?? 0),
      label: String(fd.get(`stat_${i}_label`) ?? "").trim(),
    });
  }
  return out as Json;
}

function parseTrendChart(fd: FormData): Json {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(
      String(fd.get(`month_${i}`) ?? "")
        .trim()
        .toUpperCase(),
    );
  }
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 13; i++) {
    points.push({
      x: Number(fd.get(`point_${i}_x`) ?? 0),
      y: Number(fd.get(`point_${i}_y`) ?? 0),
    });
  }
  // Derive the SVG path from the points: "M{x0},{y0} L{x1},{y1} ..."
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return { months, path, points } as Json;
}

export async function updateSiteConfig(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  if (!isEditableKey(key)) return;

  let value: Json;
  switch (key) {
    case "home_hero":
      value = parseHomeHero(formData);
      break;
    case "overview_kpis":
    case "portfolio_kpis":
    case "carelin_kpis":
      value = parseKpiArray(formData);
      break;
    case "portfolio_stats":
      value = parsePortfolioStats(formData);
      break;
    case "trend_chart":
      value = parseTrendChart(formData);
      break;
  }

  const db = await createClient();
  const { error } = await db
    .from("site_config")
    .update({ value, updated_by_admin_id: admin.id })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidateFor(key);
  redirect("/admin/config");
}
```

- [ ] **Step 4: Create the index page**

Create `app/admin/config/page.tsx`:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";

const KEYS = [
  { key: "home_hero", th: "หน้าแรกของนักเรียน", en: "Student home hero" },
  { key: "overview_kpis", th: "KPI ภาพรวม", en: "Admin overview KPIs" },
  { key: "trend_chart", th: "กราฟแนวโน้ม", en: "12-month trend chart" },
  { key: "portfolio_stats", th: "สถิติ Portfolio", en: "Portfolio stats (3)" },
  { key: "portfolio_kpis", th: "KPI Portfolio", en: "Portfolio KPIs" },
  { key: "carelin_kpis", th: "KPI Carelin", en: "Carelin desk KPIs" },
];

export default function AdminConfigIndex() {
  return (
    <>
      <AdminTopbar titleTh="ตั้งค่าเนื้อหา" eyebrow="Site config · admin" />
      <Card>
        <CardTitle th="ค่าที่แก้ไขได้" en="Editable site_config keys" />
        <ul className="divide-mute-200 divide-y divide-dashed">
          {KEYS.map((k) => (
            <li
              key={k.key}
              className="flex items-center justify-between px-3 py-3"
            >
              <div>
                <div className="font-display text-[15px] italic">{k.en}</div>
                <div className="text-mute-500 font-mono text-[11px]">
                  {k.key} · {k.th}
                </div>
              </div>
              <Link
                href={`/admin/config/${k.key}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit →
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
```

- [ ] **Step 5: Create the per-key edit page**

Create `app/admin/config/[key]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getConfigByKey } from "@/lib/queries/siteConfig";
import { updateSiteConfig } from "../../actions";
import type { AdminKpi, HomeHero, PortfolioStats } from "@/lib/types";
import type { TrendChartData } from "@/lib/queries/siteConfig";

const VALID = new Set([
  "home_hero",
  "overview_kpis",
  "trend_chart",
  "portfolio_stats",
  "portfolio_kpis",
  "carelin_kpis",
]);

const INPUT_CLS =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";
const LABEL_CLS =
  "flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700";

export default async function AdminConfigEdit({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!VALID.has(key)) notFound();

  return (
    <>
      <AdminTopbar titleTh="แก้ไขค่า" eyebrow={`Site config · ${key}`} />
      <Card>
        <CardTitle th="แก้ไขค่า" en={`Edit ${key}`} />
        <form
          action={updateSiteConfig}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="key" value={key} />
          {key === "home_hero" && <HomeHeroFields />}
          {key === "overview_kpis" && (
            <KpiArrayFields configKey="overview_kpis" />
          )}
          {key === "portfolio_kpis" && (
            <KpiArrayFields configKey="portfolio_kpis" />
          )}
          {key === "carelin_kpis" && (
            <KpiArrayFields configKey="carelin_kpis" />
          )}
          {key === "portfolio_stats" && <PortfolioStatsFields />}
          {key === "trend_chart" && <TrendChartFields />}
          <div className="md:col-span-2">
            <Btn variant="primary">Save changes →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}

async function HomeHeroFields() {
  const v = await getConfigByKey<HomeHero>("home_hero");
  return (
    <>
      <label className={LABEL_CLS}>
        Eyebrow
        <input
          name="eyebrow"
          type="text"
          defaultValue={v.eyebrow}
          className={INPUT_CLS}
        />
      </label>
      <label className={LABEL_CLS}>
        Where TH
        <input
          name="where_th"
          type="text"
          defaultValue={v.whereTh}
          className={INPUT_CLS}
        />
      </label>
      <label className={`${LABEL_CLS} md:col-span-2`}>
        Title lines (one per line)
        <textarea
          name="title_lines"
          rows={3}
          defaultValue={v.titleLines.join("\n")}
          className={INPUT_CLS}
        />
      </label>
      <label className={LABEL_CLS}>
        Leading house
        <select
          name="leading_house"
          defaultValue={v.leading.house}
          className={INPUT_CLS}
        >
          {(["green", "purple", "orange", "pink"] as const).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLS}>
        Leading label
        <input
          name="leading_label"
          type="text"
          defaultValue={v.leading.label}
          className={INPUT_CLS}
        />
      </label>
      <label className={LABEL_CLS}>
        Leading points
        <input
          name="leading_points"
          type="number"
          min={0}
          max={100000}
          defaultValue={v.leading.points}
          className={INPUT_CLS}
        />
      </label>
      <label className={LABEL_CLS}>
        Weather degrees
        <input
          name="weather_degrees"
          type="number"
          defaultValue={v.weather.degrees}
          className={INPUT_CLS}
        />
      </label>
      <label className={LABEL_CLS}>
        Weather glyph (e.g. "☼")
        <input
          name="weather_glyph"
          type="text"
          defaultValue={v.weather.glyph}
          className={INPUT_CLS}
        />
      </label>
    </>
  );
}

async function KpiArrayFields({ configKey }: { configKey: string }) {
  const v = await getConfigByKey<AdminKpi[]>(configKey);
  const filled: AdminKpi[] = Array.from(
    { length: 4 },
    (_, i) =>
      v[i] ?? { label: "", th: "", num: "", delta: { kind: "flat", text: "" } },
  );
  return (
    <>
      {filled.map((kpi, i) => (
        <div
          key={i}
          className="border-line bg-paper grid grid-cols-1 gap-2 border-[1.5px] p-3 md:col-span-2 md:grid-cols-4"
        >
          <div className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase md:col-span-4">
            KPI {i + 1}
          </div>
          <label className={LABEL_CLS}>
            Label
            <input
              name={`kpi_${i}_label`}
              type="text"
              defaultValue={kpi.label}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            TH
            <input
              name={`kpi_${i}_th`}
              type="text"
              defaultValue={kpi.th}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Number (string)
            <input
              name={`kpi_${i}_num`}
              type="text"
              defaultValue={kpi.num}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Delta kind
            <select
              name={`kpi_${i}_delta_kind`}
              defaultValue={kpi.delta.kind}
              className={INPUT_CLS}
            >
              <option value="up">up</option>
              <option value="down">down</option>
              <option value="flat">flat</option>
            </select>
          </label>
          <label className={`${LABEL_CLS} md:col-span-4`}>
            Delta text
            <input
              name={`kpi_${i}_delta_text`}
              type="text"
              defaultValue={kpi.delta.text}
              className={INPUT_CLS}
            />
          </label>
        </div>
      ))}
    </>
  );
}

async function PortfolioStatsFields() {
  const v = await getConfigByKey<PortfolioStats[]>("portfolio_stats");
  const filled: PortfolioStats[] = Array.from(
    { length: 3 },
    (_, i) => v[i] ?? { num: 0, label: "" },
  );
  return (
    <>
      {filled.map((stat, i) => (
        <div
          key={i}
          className="border-line bg-paper grid grid-cols-1 gap-2 border-[1.5px] p-3 md:col-span-2 md:grid-cols-2"
        >
          <div className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase md:col-span-2">
            Stat {i + 1}
          </div>
          <label className={LABEL_CLS}>
            Number
            <input
              name={`stat_${i}_num`}
              type="number"
              defaultValue={stat.num}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Label
            <input
              name={`stat_${i}_label`}
              type="text"
              defaultValue={stat.label}
              className={INPUT_CLS}
            />
          </label>
        </div>
      ))}
    </>
  );
}

async function TrendChartFields() {
  const v = await getConfigByKey<TrendChartData>("trend_chart");
  return (
    <>
      <div className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase md:col-span-2">
        Months (12, mono caps)
      </div>
      {Array.from({ length: 12 }).map((_, i) => (
        <label key={`m${i}`} className={LABEL_CLS}>
          Month {i + 1}
          <input
            name={`month_${i}`}
            type="text"
            maxLength={4}
            defaultValue={v.months[i] ?? ""}
            className={INPUT_CLS}
          />
        </label>
      ))}
      <div className="text-mute-700 mt-3 font-mono text-[11px] tracking-[0.14em] uppercase md:col-span-2">
        Polyline points (13 × {`{x, y}`}). Server derives the SVG path string
        from these.
      </div>
      {Array.from({ length: 13 }).map((_, i) => (
        <div key={`p${i}`} className="grid grid-cols-2 gap-2 md:col-span-2">
          <label className={LABEL_CLS}>
            Point {i + 1} · x
            <input
              name={`point_${i}_x`}
              type="number"
              defaultValue={v.points[i]?.x ?? 0}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Point {i + 1} · y
            <input
              name={`point_${i}_y`}
              type="number"
              defaultValue={v.points[i]?.y ?? 0}
              className={INPUT_CLS}
            />
          </label>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 6: Lint + build**

```bash
npm run lint && npm run build
```

Note: the inline `async` field components are nested Server Components. Next 16 supports this; if the build complains about a particular nesting, hoist each component to a top-level `async function` (still in the same file).

- [ ] **Step 7: Manual verify**

```bash
npm run dev
```

1. `/admin/config` shows 6 editable rows (no `admin_greeting`).
2. Click **home_hero → Edit** → form pre-filled with current values; change eyebrow to "Today · Test"; save → redirect to `/admin/config`; visit `/student` → eyebrow updated.
3. Click **trend_chart → Edit** → 12 month inputs + 13 point pairs render. Change point 13's `y` from `20` to `60` and save → visit `/admin` → trend chart visibly drops on the right.
4. Click **carelin_kpis → Edit** → 4 KPI groups; change one `num` → `/admin/carelin` reflects it.
5. Visit `/admin/config/bogus/edit` → 404.

- [ ] **Step 8: Commit**

```bash
git add lib/queries/siteConfig.ts app/admin/config/page.tsx app/admin/config/[key]/edit/page.tsx app/admin/config/actions.ts
git commit -m "add: /admin/config index + per-key structured editors"
```

---

### Task 8: Admin bookings CRUD

Three actions, two new pages, row-edit column on `AdminTodayBookingsTable`, and the `+ New Booking` button wired up.

**Files:**

- Modify: `lib/queries/bookings.ts`
- Modify: `lib/types.ts`
- Modify: `lib/ui/booking.ts`
- Create: `app/admin/bookings/actions.ts`
- Create: `app/admin/bookings/new/page.tsx`
- Create: `app/admin/bookings/[id]/edit/page.tsx`
- Modify: `app/admin/bookings/page.tsx`
- Modify: `components/admin/AdminTodayBookingsTable.tsx`

- [ ] **Step 1: Read current state**

```bash
cat lib/queries/bookings.ts
cat components/admin/AdminTodayBookingsTable.tsx
cat app/admin/bookings/page.tsx
cat lib/ui/booking.ts
```

- [ ] **Step 2: Add `PERIOD_HOURS` to `lib/ui/booking.ts`**

Replace the existing `BOOKING_PERIODS` block with one that keys on a period id:

```ts
export const PERIOD_HOURS = {
  morning: { start: "08:00", end: "11:00" },
  midday: { start: "11:30", end: "14:30" },
  evening: { start: "15:00", end: "18:00" },
} as const;

export type PeriodId = keyof typeof PERIOD_HOURS;

export const BOOKING_PERIODS: (BookingPeriod & { id: PeriodId })[] = [
  {
    id: "morning",
    label: "Morning",
    time: "08:00 — 11:00",
    status: "available",
  },
  { id: "midday", label: "Midday", time: "11:30 — 14:30", status: "selected" },
  { id: "evening", label: "Evening", time: "15:00 — 18:00", status: "booked" },
];
```

Then update `lib/types.ts` `BookingPeriod` if it doesn't already have an `id` field — or keep `id` only on the intersection type used here. The existing `PeriodPicker` component will be reworked in Task 9; for now leaving the `id` field optional in the base type keeps Task 8 in isolation.

In `lib/types.ts`:

```ts
export type BookingPeriod = {
  id?: "morning" | "midday" | "evening"; // populated in Phase 4 task 8 onwards
  label: string;
  time: string;
  status: "available" | "selected" | "booked";
};
```

- [ ] **Step 3: Add `findConflictingBooking` and `getBookingById` to `lib/queries/bookings.ts`**

Append:

```ts
export async function findConflictingBooking(
  roomId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<boolean> {
  const db = await createClient();
  let q = db
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`findConflictingBooking: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export type BookingFull = Database["public"]["Tables"]["bookings"]["Row"];

export async function getBookingById(id: string): Promise<BookingFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBookingById: ${error.message}`);
  return data;
}
```

- [ ] **Step 4: Update `getAdminTodayBookings` to return row ids**

In `lib/queries/bookings.ts`, modify the existing `getAdminTodayBookings`:

```ts
.select("id, user_label, purpose, starts_at, ends_at, status, rooms!inner(name_en)")
```

…and add `id: b.id` to the returned `AdminTodayBookingRow`. Update the type in `lib/types.ts`:

```ts
export type AdminTodayBookingRow = {
  id: string;
  room: string;
  user: string;
  start: string;
  end: string;
  purpose: string;
  status: "Confirmed" | "Pending" | "Review";
};
```

- [ ] **Step 5: Create `app/admin/bookings/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { findConflictingBooking } from "@/lib/queries/bookings";
import { PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";

const STATUSES = ["Confirmed", "Pending", "Review"] as const;
type Status = (typeof STATUSES)[number];
function isStatus(v: string): v is Status {
  return (STATUSES as readonly string[]).includes(v);
}

const PERIOD_IDS = ["morning", "midday", "evening"] as const;
function isPeriod(v: string): v is PeriodId {
  return (PERIOD_IDS as readonly string[]).includes(v);
}

function deriveTimes(date: string, period: PeriodId) {
  const slot = PERIOD_HOURS[period];
  return {
    starts_at: `${date}T${slot.start}:00+07:00`,
    ends_at: `${date}T${slot.end}:00+07:00`,
  };
}

function revalidateBookings() {
  revalidatePath("/admin/bookings");
  revalidatePath("/student/booking");
  revalidatePath("/admin");
}

export async function createBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const room_id = String(formData.get("room_id") ?? "").trim();
  const user_label = String(formData.get("user_label") ?? "").trim();
  const purpose_raw = String(formData.get("purpose") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const status = String(formData.get("status") ?? "Confirmed").trim();

  if (!room_id || !user_label || !date) return;
  if (!isPeriod(period)) return;
  if (!isStatus(status)) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const { starts_at, ends_at } = deriveTimes(date, period);

  if (await findConflictingBooking(room_id, starts_at, ends_at)) {
    throw new Error("Room is already booked for that period.");
  }

  const db = await createClient();
  const { error } = await db.from("bookings").insert({
    room_id,
    user_label,
    purpose: purpose_raw || null,
    starts_at,
    ends_at,
    status,
  });
  if (error) throw new Error(error.message);

  revalidateBookings();
  redirect("/admin/bookings");
}

export async function updateBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const room_id = String(formData.get("room_id") ?? "").trim();
  const user_label = String(formData.get("user_label") ?? "").trim();
  const purpose_raw = String(formData.get("purpose") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const status = String(formData.get("status") ?? "Confirmed").trim();

  if (!room_id || !user_label || !date) return;
  if (!isPeriod(period)) return;
  if (!isStatus(status)) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const { starts_at, ends_at } = deriveTimes(date, period);

  if (await findConflictingBooking(room_id, starts_at, ends_at, id)) {
    throw new Error("Room is already booked for that period.");
  }

  const db = await createClient();
  const { error } = await db
    .from("bookings")
    .update({
      room_id,
      user_label,
      purpose: purpose_raw || null,
      starts_at,
      ends_at,
      status,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateBookings();
  redirect("/admin/bookings");
}

export async function cancelBooking(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateBookings();
  redirect("/admin/bookings");
}
```

- [ ] **Step 6: Create the new-booking page**

Create `app/admin/bookings/new/page.tsx`:

```tsx
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getMusicRooms } from "@/lib/queries/rooms";
import { createBooking } from "../actions";

const INPUT_CLS =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";
const LABEL_CLS =
  "flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700";

export default async function AdminBookingsNew() {
  const rooms = await getMusicRooms();
  return (
    <>
      <AdminTopbar titleTh="จองห้อง · ใหม่" eyebrow="Bookings · new" />
      <Card>
        <CardTitle th="จองห้องใหม่" en="New booking" />
        <form
          action={createBooking}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className={LABEL_CLS}>
            Room
            <select name="room_id" required className={INPUT_CLS}>
              <option value="">— select —</option>
              {rooms.map((r) => (
                <option key={r.nameEn} value={r.id ?? ""}>
                  {r.nameEn} · {r.nameTh}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLS}>
            Status
            <select
              name="status"
              defaultValue="Confirmed"
              required
              className={INPUT_CLS}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Review">Review</option>
            </select>
          </label>
          <label className={LABEL_CLS}>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue="2026-05-13"
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Period
            <select
              name="period"
              defaultValue="midday"
              required
              className={INPUT_CLS}
            >
              <option value="morning">Morning · 08:00–11:00</option>
              <option value="midday">Midday · 11:30–14:30</option>
              <option value="evening">Evening · 15:00–18:00</option>
            </select>
          </label>
          <label className={LABEL_CLS}>
            User label (name or club)
            <input
              name="user_label"
              type="text"
              required
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Purpose (optional)
            <input name="purpose" type="text" className={INPUT_CLS} />
          </label>
          <div className="md:col-span-2">
            <Btn variant="primary">Create booking →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
```

This page uses `getMusicRooms` which currently returns rooms shaped as `Room` (no `id`). Update `lib/queries/rooms.ts` if needed so the helper returns `{ id, nameEn, nameTh, status, kind }`. The booking form needs the `id` to insert. Verify by reading `lib/queries/rooms.ts` first; if `id` is missing, add it to the SELECT and to the `Room` type in `lib/types.ts` (`id: string`).

- [ ] **Step 7: Create the edit page**

Create `app/admin/bookings/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getBookingById } from "@/lib/queries/bookings";
import { getMusicRooms } from "@/lib/queries/rooms";
import { cancelBooking, updateBooking } from "../../actions";
import { PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";

const INPUT_CLS =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";
const LABEL_CLS =
  "flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700";

function inferPeriod(startsAt: string): PeriodId {
  const m = startsAt.match(/T(\d{2}:\d{2})/);
  const hhmm = m ? m[1] : "11:30";
  if (hhmm === PERIOD_HOURS.morning.start) return "morning";
  if (hhmm === PERIOD_HOURS.evening.start) return "evening";
  return "midday";
}

function dateFromTimestamp(ts: string): string {
  return ts.slice(0, 10);
}

export default async function AdminBookingsEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, rooms] = await Promise.all([
    getBookingById(id),
    getMusicRooms(),
  ]);
  if (!booking) notFound();

  const period = inferPeriod(booking.starts_at);
  const date = dateFromTimestamp(booking.starts_at);

  return (
    <>
      <AdminTopbar titleTh="แก้ไขการจอง" eyebrow={`Bookings · edit`} />
      <Card>
        <CardTitle th="แก้ไขการจอง" en="Edit booking" />
        <form
          action={updateBooking}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={booking.id} />
          <label className={LABEL_CLS}>
            Room
            <select
              name="room_id"
              required
              defaultValue={booking.room_id}
              className={INPUT_CLS}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameEn} · {r.nameTh}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLS}>
            Status
            <select
              name="status"
              defaultValue={booking.status}
              required
              className={INPUT_CLS}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Review">Review</option>
            </select>
          </label>
          <label className={LABEL_CLS}>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={date}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Period
            <select
              name="period"
              defaultValue={period}
              required
              className={INPUT_CLS}
            >
              <option value="morning">Morning · 08:00–11:00</option>
              <option value="midday">Midday · 11:30–14:30</option>
              <option value="evening">Evening · 15:00–18:00</option>
            </select>
          </label>
          <label className={LABEL_CLS}>
            User label
            <input
              name="user_label"
              type="text"
              required
              defaultValue={booking.user_label}
              className={INPUT_CLS}
            />
          </label>
          <label className={LABEL_CLS}>
            Purpose
            <input
              name="purpose"
              type="text"
              defaultValue={booking.purpose ?? ""}
              className={INPUT_CLS}
            />
          </label>
          <div className="flex items-center gap-3 md:col-span-2">
            <Btn variant="primary">Save booking →</Btn>
            <button
              type="submit"
              formAction={cancelBooking}
              className="border-line bg-paper border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-red-700 uppercase hover:bg-red-50"
            >
              Cancel booking (delete)
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 8: Wire `+ New Booking` and add row-edit column to `AdminTodayBookingsTable`**

Modify `app/admin/bookings/page.tsx` — replace the existing `<Btn variant="primary">+ New Booking</Btn>` with a `Link`:

```tsx
import Link from "next/link";
// …
<Link
  href="/admin/bookings/new"
  className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
>
  + New Booking
</Link>;
```

Modify `components/admin/AdminTodayBookingsTable.tsx` — add a trailing `""` header and a per-row Edit link:

```tsx
import Link from "next/link";
// …existing imports + props…

// Headers array: add ""
{["Room", "User", "Start", "End", "Purpose", "Status", ""].map(...)}

// Trailing cell per row:
<td className={td}>
  <Link
    href={`/admin/bookings/${row.id}/edit`}
    className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700 hover:text-ink"
  >
    Edit
  </Link>
</td>
```

- [ ] **Step 9: Lint + build**

```bash
npm run lint && npm run build
```

If TypeScript complains about `Room` lacking `id`, finish the small `lib/queries/rooms.ts` + `lib/types.ts` adjustment from Step 6.

- [ ] **Step 10: Manual verify**

```bash
npm run dev
```

1. `/admin/bookings` → topbar `+ New Booking` links to `/admin/bookings/new`.
2. Submit a Music Room 1 / 2026-05-14 / midday booking — redirect; the today bookings table doesn't show it (different date) but the Gantt re-renders for `2026-05-12` data.
3. Submit a 2026-05-12 / midday / Music Room 1 booking → today bookings table gains a row; `/student/booking` reflects it.
4. Click **Edit** on a today row → form pre-fills; change room → save; row reflects.
5. Submit a new booking that conflicts with an existing one (same room + period) → action throws → Next error boundary shows "Room is already booked for that period."
6. Click **Cancel booking (delete)** on the edit form → row vanishes from today's table.

- [ ] **Step 11: Commit**

```bash
git add lib/queries/bookings.ts lib/queries/rooms.ts lib/types.ts lib/ui/booking.ts app/admin/bookings/actions.ts app/admin/bookings/new/page.tsx app/admin/bookings/[id]/edit/page.tsx app/admin/bookings/page.tsx components/admin/AdminTodayBookingsTable.tsx
git commit -m "add: admin bookings create/update/cancel + edit route"
```

---

### Task 9: Student bookings — anon `bookRoom` + URL-param pickers

Largest task. Rewrites `/student/booking` to URL-driven selection, adds an inline form leaf using `useActionState`, and ships the `bookRoom` action under the new RLS policy from Task 3.

**Files:**

- Modify: `app/student/booking/page.tsx`
- Create: `app/student/booking/actions.ts`
- Create: `components/student/BookingConfirmForm.tsx`
- Modify: `components/student/CalendarGrid.tsx`
- Modify: `components/student/PeriodPicker.tsx`
- Modify: `components/student/RoomList.tsx`

- [ ] **Step 1: Read current state**

```bash
cat app/student/booking/page.tsx
cat components/student/CalendarGrid.tsx
cat components/student/PeriodPicker.tsx
cat components/student/RoomList.tsx
cat components/student/BookingTabs.tsx
cat components/ui/CtaButton.tsx
```

Note: each picker currently renders static markup. We'll turn the day cells, period buttons, and room rows into `<Link>`s that update URL params. The existing CSS classes for selected/closed states are reused.

- [ ] **Step 2: Implement `bookRoom`**

Create `app/student/booking/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findConflictingBooking } from "@/lib/queries/bookings";
import { PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";
import type { ActionResult } from "@/lib/actions";

const ID_RE = /^[0-9]{4}$/;
const PERIOD_IDS = ["morning", "midday", "evening"] as const;
function isPeriod(v: string): v is PeriodId {
  return (PERIOD_IDS as readonly string[]).includes(v);
}

export async function bookRoom(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const room_id = String(formData.get("room") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const student_id_4 = String(formData.get("student_id_4") ?? "").trim();
  const klassRaw = String(formData.get("klass") ?? "").trim();
  const purposeRaw = String(formData.get("purpose") ?? "").trim();

  if (!room_id) return { ok: false, error: "Please choose a room." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false, error: "Please choose a date." };
  if (!isPeriod(period))
    return { ok: false, error: "Please choose a time period." };
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!ID_RE.test(student_id_4))
    return { ok: false, error: "Student ID must be 4 digits." };

  const slot = PERIOD_HOURS[period];
  const starts_at = `${date}T${slot.start}:00+07:00`;
  const ends_at = `${date}T${slot.end}:00+07:00`;

  if (await findConflictingBooking(room_id, starts_at, ends_at)) {
    return { ok: false, error: "That room is already taken for that period." };
  }

  const db = await createClient();
  const { error } = await db.from("bookings").insert({
    room_id,
    user_label: name,
    purpose: purposeRaw || null,
    student_id_4,
    klass: klassRaw || null,
    starts_at,
    ends_at,
    status: "Pending",
    bar_variant: "default",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/booking");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true };
}
```

The action uses the anon Supabase server client (no `requireAdmin`) — the RLS policy from Task 3 gates it.

- [ ] **Step 3: Create the client form leaf**

Create `components/student/BookingConfirmForm.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CtaButton } from "@/components/ui/CtaButton";
import { bookRoom } from "@/app/student/booking/actions";
import type { ActionResult } from "@/lib/actions";

const INPUT_CLS =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";

type Props = {
  date: string;
  period: string;
  room: string;
  eyebrow: string;
};

// Module-level sentinel so reference equality distinguishes "never submitted"
// from "submitted and got back {ok: true}". useActionState only swaps the state
// reference when the action returns, so `state !== INITIAL && state.ok` is a
// reliable fresh-success check.
const INITIAL: ActionResult = { ok: true };

export function BookingConfirmForm({ date, period, room, eyebrow }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(bookRoom, INITIAL);

  useEffect(() => {
    if (state !== INITIAL && state.ok) {
      // Drop ?date/?period/?room; the page reads ?ok=1 and renders the banner.
      router.replace("/student/booking?ok=1");
    }
  }, [state, router]);

  const disabled = !date || !period || !room;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="room" value={room} />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          Name · ชื่อ
          <input name="name" type="text" required className={INPUT_CLS} />
        </label>
        <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          Student ID (4 digits)
          <input
            name="student_id_4"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            required
            className={INPUT_CLS}
          />
        </label>
        <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          Class · ชั้น (optional)
          <input name="klass" type="text" className={INPUT_CLS} />
        </label>
        <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          Purpose (optional)
          <input name="purpose" type="text" className={INPUT_CLS} />
        </label>
      </div>

      {!state.ok && (
        <p className="border-[1.5px] border-red-600 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-700">
          {state.error}
        </p>
      )}

      <CtaButton eyebrow={eyebrow} disabled={disabled}>
        Confirm Booking →
      </CtaButton>
    </form>
  );
}
```

If `CtaButton` doesn't accept `disabled`, fall back to wrapping a plain `<button type="submit">` with the same border / box-shadow classes. Read `components/ui/CtaButton.tsx` first.

The success banner is rendered by the **page** (Step 4) when `?ok=1` is in the URL — not by this form. Splitting it that way means the banner survives a manual refresh of `/student/booking?ok=1` and there's no duplicated banner.

- [ ] **Step 4: Rewrite `app/student/booking/page.tsx` with URL params**

```tsx
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { BookingTabs } from "@/components/student/BookingTabs";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { PeriodPicker } from "@/components/student/PeriodPicker";
import { RoomList } from "@/components/student/RoomList";
import { BookingConfirmForm } from "@/components/student/BookingConfirmForm";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getMusicRooms, getMeetingRooms } from "@/lib/queries/rooms";
import {
  BOOKING_MAY_DAYS,
  BOOKING_PERIODS,
  BOOKING_TABS,
  PERIOD_HOURS,
  type PeriodId,
} from "@/lib/ui/booking";

const TABS = ["music", "meeting"] as const;
type TabId = (typeof TABS)[number];
function isTab(v: string): v is TabId {
  return (TABS as readonly string[]).includes(v);
}
function isPeriodId(v: string): v is PeriodId {
  return v === "morning" || v === "midday" || v === "evening";
}

const MAY_DATES = new Set(
  Array.from(
    { length: 31 },
    (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`,
  ),
);

function buildHref(
  current: Record<string, string>,
  patch: Record<string, string | undefined>,
): string {
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/student/booking?${qs}` : "/student/booking";
}

function periodLabel(p: PeriodId): string {
  return BOOKING_PERIODS.find((bp) => bp.id === p)?.label ?? "";
}

function roomLabel(
  rooms: { id: string; nameEn: string }[],
  id: string,
): string {
  return rooms.find((r) => r.id === id)?.nameEn ?? "";
}

function buildEyebrow(date: string, period: string, roomName: string): string {
  if (!date && !period && !roomName) return "";
  const day = date ? Number(date.slice(-2)) : "·";
  return `${day} MAY · ${period ? period.toUpperCase() : "·"} · ${roomName ? roomName.toUpperCase() : "·"}`;
}

export default async function StudentBooking({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tabRaw = String(sp.tab ?? "music");
  const tab: TabId = isTab(tabRaw) ? tabRaw : "music";
  const dateRaw = String(sp.date ?? "");
  const date = MAY_DATES.has(dateRaw) ? dateRaw : "";
  const periodRaw = String(sp.period ?? "");
  const period = isPeriodId(periodRaw) ? periodRaw : "";
  const room = String(sp.room ?? "");
  const ok = sp.ok === "1";

  const rooms =
    tab === "music" ? await getMusicRooms() : await getMeetingRooms();

  const currentParams: Record<string, string> = {};
  if (tab !== "music") currentParams.tab = tab;
  if (date) currentParams.date = date;
  if (period) currentParams.period = period;
  if (room) currentParams.room = room;

  const tabs = BOOKING_TABS.map((t) => ({
    ...t,
    href: buildHref(currentParams, {
      tab: t.id === "music" ? undefined : t.id,
      room: undefined,
    }),
  }));

  const days = BOOKING_MAY_DAYS.map((d) => {
    if (!d.inMonth || d.state === "closed") return d;
    const iso = `2026-05-${String(d.num).padStart(2, "0")}`;
    return {
      ...d,
      href: buildHref(currentParams, { date: iso }),
      state: iso === date ? ("selected" as const) : d.state,
    };
  });

  const periods = BOOKING_PERIODS.map((p) => ({
    ...p,
    href: buildHref(currentParams, { period: p.id }),
    status: p.id === period ? ("selected" as const) : "available",
  }));

  const roomList = rooms.map((r) => ({
    ...r,
    href: buildHref(currentParams, { room: r.id }),
    selected: r.id === room,
  }));

  const eyebrow = buildEyebrow(
    date,
    period && periodLabel(period),
    roomLabel(rooms, room),
  );

  return (
    <>
      <PageHead
        titleTh="จองห้อง"
        titleEn="Room Booking"
        action={<IconButton label="Help · ช่วย">?</IconButton>}
      />
      <MobileBody className="space-y-3.5">
        {ok && (
          <div className="border-ink bg-yellow text-ink border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.14em] uppercase">
            ✓ Booking submitted — admin will confirm shortly.
          </div>
        )}
        <BookingTabs tabs={tabs} activeId={tab} />

        <CalendarMonthRow titleTh="May 2026" subEn="เลือกวันที่จอง" compact />
        <CalendarGrid days={days} compact />

        <SectionDivider>★ Time period · ช่วงเวลา ★</SectionDivider>
        <PeriodPicker periods={periods} />

        <SectionDivider>★ Choose room · เลือกห้อง ★</SectionDivider>
        <RoomList rooms={roomList} />

        <SectionDivider>★ Confirm · ยืนยัน ★</SectionDivider>
        <BookingConfirmForm
          date={date}
          period={period}
          room={room}
          eyebrow={eyebrow}
        />
      </MobileBody>
    </>
  );
}
```

This page assumes `lib/queries/rooms.ts` exports a `getMeetingRooms()` helper. If it only exports `getMusicRooms()` today, add a sibling:

```ts
export async function getMeetingRooms() {
  const db = await createClient();
  const { data, error } = await db
    .from("rooms")
    .select("id, name_en, name_th, kind")
    .eq("kind", "meeting")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getMeetingRooms: ${error.message}`);
  return (data ?? []).map<Room & { id: string }>((r) => ({
    id: r.id,
    nameEn: r.name_en,
    nameTh: r.name_th,
    status: "free",
  }));
}
```

And make sure `getMusicRooms()` returns the same shape (with `id`).

- [ ] **Step 5: Update child components to consume `href` / `selected`**

Modify `components/student/CalendarGrid.tsx`. Day cells currently render as `<div>`s; change `<div>` to `<Link href={day.href}>` when `day.href` is set. Closed and non-month days stay non-link. Add `href?: string` to the `CalendarDay` type (it already takes `state`).

In `lib/types.ts`:

```ts
export type CalendarDay = {
  num: number;
  inMonth: boolean;
  state?: "today" | "selected" | "closed";
  dots?: string[];
  href?: string;
};
```

The CalendarGrid render:

```tsx
{
  day.href ? (
    <Link href={day.href} className={cellClasses}>
      {day.num}
      {dots}
    </Link>
  ) : (
    <div className={cellClasses}>
      {day.num}
      {dots}
    </div>
  );
}
```

Apply analogous changes to `PeriodPicker.tsx` (each period button → `<Link>` when `href` is set) and `RoomList.tsx` (each room row → `<Link>`). Update the `BookingPeriod` and `Room` types in `lib/types.ts` to include optional `href?: string` and `selected?: boolean`.

Also extend `BookingTabs.tsx` so each tab is a `<Link>` when `tab.href` is provided.

- [ ] **Step 6: Lint + build**

```bash
npm run lint && npm run build
```

If TypeScript complains about `BOOKING_PERIODS` lacking `status: "selected"` literal type, narrow the inferred type by casting or by widening the field in the page:

```ts
const periods: (BookingPeriod & { href: string })[] = BOOKING_PERIODS.map(...);
```

- [ ] **Step 7: Manual verify (anon)**

```bash
npm run dev
```

In an incognito window (anon — no admin session):

1. Visit `/student/booking` → tabs, calendar, periods, rooms render. None selected.
2. Click day 13 → URL updates to `?date=2026-05-13`; day 13 gets the **selected** state styling.
3. Click **Midday** → URL adds `&period=midday`; period gets **selected**.
4. Click Music Room 1 → URL adds `&room=<uuid>`; room shows selected.
5. Confirm form's eyebrow reads `13 MAY · MIDDAY · MUSIC ROOM 1`.
6. Type a name without a 4-digit ID → submit → inline error `"Student ID must be 4 digits."`
7. Fill ID `1234` + name → submit → success banner renders; row appears on `/admin/bookings` (signed in as admin in another browser).
8. Refresh `/student/booking` (still anon) → no leakage of submitted data (the new booking shows only via admin view).

- [ ] **Step 8: Manual verify (RLS)**

Open the Supabase dashboard (or `psql`) and try to anon-INSERT a booking with a bogus student_id_4:

```sql
-- via Supabase Studio SQL editor (with role = anon)
set role anon;
insert into bookings (room_id, user_label, student_id_4, starts_at, ends_at)
values ('<some-room-uuid>', 'Tester', 'abc', now(), now() + interval '1 hour');
-- expected: error — fails the check constraint OR the policy `with check`
```

Expected: rejected by the check constraint `bookings_student_id_4_format` and/or the policy.

- [ ] **Step 9: Commit**

```bash
git add app/student/booking/page.tsx app/student/booking/actions.ts components/student/BookingConfirmForm.tsx components/student/CalendarGrid.tsx components/student/PeriodPicker.tsx components/student/RoomList.tsx components/student/BookingTabs.tsx lib/queries/rooms.ts lib/types.ts
git commit -m "add: bookRoom anon action + URL-param booking flow"
```

---

### Task 10: Phase 4 sign-off — manual walkthrough + handoff notes

Final pass. No code changes unless the walkthrough surfaces a regression.

**Files:**

- (Optional) Modify: `docs/handoff.md`
- (Optional) Modify: `README.md`

- [ ] **Step 1: Run the full exit-criteria walkthrough from the spec**

In a single dev session:

1. Post a Carelin request anonymously → reply as admin → mark answered.
2. Post a booking anonymously (Music Room 2, 13 May, midday).
3. As admin: edit a calendar event via the side rail; delete another event.
4. As admin: record a new sport result via `+ Record result`; edit it; delete it.
5. As admin: toggle a portfolio project's status from the row buttons; edit it; delete it.
6. As admin: edit `home_hero` via `/admin/config/home_hero/edit`; confirm `/student` reflects the change.
7. As root: delete a Carelin request from the desk Delete button.
8. As anon: open `/student/pshare/<slug>` for a published post; markdown body renders.
9. As admin: create a booking via `+ New Booking`; edit it; cancel it.

Refresh after each. All changes persist.

- [ ] **Step 2: Verify the inert-button audit**

Grep the prototype-button surface for any remaining no-op handlers:

```bash
grep -RIn '"primary"' app/admin components/admin | grep -i 'btn'
grep -RIn 'IconButton' app/student components/student
```

Confirm every prototype button either has a wired action **or** carries an explicit `// deferred to Phase 5` comment. After Phase 4, the only intentional inert button is **`+ Add Project`** on `/admin/portfolio`.

- [ ] **Step 3: Verify service-role surface**

```bash
grep -RIn 'getSupabaseServiceRole' app/
```

Expected exactly three matches: `app/admin/admins/actions.ts` (`createAdmin`, `disableAdmin`) and `app/admin/carelin/actions.ts` (`deleteCarelinRequest`). No others.

- [ ] **Step 4: Verify lint + build one more time**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Row-count sanity check**

In Supabase Studio (or `psql`), record before/after counts. After the walkthrough, expected deltas:

| Table              | Δ rows                                                   |
| ------------------ | -------------------------------------------------------- |
| `bookings`         | +2 (one anon, one admin) − 1 (admin cancelled) = **+1**  |
| `events`           | +0 (one edit, one delete) — net depending on walkthrough |
| `sport_results`    | +1 (recorded), then −1 (deleted) = **0**                 |
| `projects`         | −1 (deleted)                                             |
| `carelin_requests` | +1 (anon) −1 (root-deleted) = **0**                      |
| `pshare_posts`     | 0                                                        |
| `site_config`      | 0 (1 row updated, not inserted)                          |

- [ ] **Step 6: Update `docs/handoff.md` for the next session**

Replace the "Your task — Phase 4 (Full write surface)" section with a Phase 4 "shipped" summary mirroring the format used by the existing "Phase 3a–3d shipped" sections. List the new actions, new routes, the migration, and the one remaining inert button (`+ Add Project`). Move "Phase 4 — Full write surface" to the shipped phases list. Replace the "Your task" body with the Phase 5 candidates the spec already flags (Realtime, Storage, rate limiting, `admin_greeting` cleanup, portfolio create-new flow).

- [ ] **Step 7: Commit**

```bash
git add docs/handoff.md
git commit -m "docs: phase 4 shipped — refresh handoff for phase 5"
```

- [ ] **Step 8: Stop for review**

Per the spec's exit criteria and the user's directive, **do not start Phase 5**. Surface to the user:

1. Total commits added in Phase 4.
2. Row-count deltas observed.
3. Any open items / risks that surfaced during the walkthrough.
4. Ready-to-ship-to-Vercel-or-move-to-Phase-5 status.

---

## Self-review summary

This plan covers every section of the spec:

- **Decisions log items 1–10** → mapped to Tasks 9 (anon bookings), 6 (portfolio breadth), 4 (calendar side rail), 7 (site_config), 5 (sport recording), 2 (P'share reader), 9 (URL-param state), 8+9 (conflict pre-check via `findConflictingBooking`), 8+9 (period mapping in `lib/ui/booking.ts`), 8 (cancel = DELETE).
- **Per-entity write set rows 1–8** → Tasks 1, 2, 4, 5, 6, 7, 8, 9.
- **Schema migration** → Task 3.
- **Revalidate matrix** → inlined as the table above; referenced from each task.
- **Bookings flow (selection + period mapping + conflict pre-check)** → Tasks 8 & 9.
- **Exit criteria walkthrough** → Task 10.
- **Open items / risks** — `admin_greeting` dead-code, `+ Add Project` deferred, rate limiting deferred — surfaced in Task 6 (Add Project comment) and Task 10 (handoff refresh).

No `TBD` / `TODO` placeholders. Type names (`ActionResult`, `PeriodId`, `AdminCalendarRow`, `BookingFull`, `ProjectFull`, `SportResultRowFull`, `PsharePostFull`, `TrendChartData`) are consistent across the tasks where they appear.
