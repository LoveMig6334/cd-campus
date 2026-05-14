# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate server-side auth waterfalls, ship a smaller client bundle, stream pages instead of blocking on data, and tighten realtime + write-path overhead — guided by the Vercel React Best Practices ruleset and the Next 16 / RSC patterns mandated by `AGENTS.md`.

**Architecture:** Three waves of change. **Phase A (Tasks 1–10)** is mechanical fixes that don't change route trees — wrap `requireAdmin` in `React.cache()`, drop a needless `"use client"` on the markdown reader, repair an inverted `ORDER BY`, parallelize two internally-sequential queries, replace a row-scan count with three head-counts, and a handful of low-risk cleanups. **Phase B (Tasks 11–17)** is structural — add `loading.tsx` route fallbacks, split the admin overview into `<Suspense>`-wrapped child server components, extract a tiny `<ActiveLink>` client wrapper so the two whole-file `"use client"` nav components revert to server components, gate long admin tables behind `content-visibility`, and move non-critical writes off the request hot path with `after()`. **Phase C (Task 18)** lengthens the `RealtimeRefresh` debounce so realtime traffic doesn't thrash the SSR pipeline.

No new dependencies. No new env vars. No database migrations.

**Tech Stack:** Next.js 16 App Router, React 19 (`cache()`, `Suspense`, `after()`), `@supabase/ssr`, Tailwind 4 (CSS-first `@theme`), `react-markdown` + `remark-gfm` (server-side from Phase A onward), `proxy.ts` (Next 16 convention — *not* `middleware.ts`).

**Source of findings:** Performance review conducted 2026-05-14, cross-referenced against `.agents/skills/vercel-react-best-practices/rules/*`. Each task cites the Vercel rule ID it implements.

---

## Departures from skill defaults

**No automated tests.** Same rationale as Phase 3a–3d and Phase 4: this prototype has no test framework (no `jest`/`vitest`/`playwright` in `package.json`; no `test` script). Adding a test harness for performance work would be a larger refactor than the work itself and contradicts the prototype's documented stance. Verification per task is a deterministic command (`npm run lint`, `npm run build`, a query check, or a `curl`/browser check on the dev server).

**Per-task commits on `main`.** Following the established repo style: lowercase imperative ("perf:", "fix:", "refactor:", "update:"), no `Co-Authored-By` trailer.

**Phase D (long-term caching) is deferred.** `AGENTS.md` forbids `'use cache'` / `cacheLife()` in Phase 3. That guidance is still in force. The post-Phase-3 caching wave (`site_config` reads, pshare detail page) is its own future plan.

---

## File structure

| File                                                      | Purpose                                                              | New / Modified | Phase |
| --------------------------------------------------------- | -------------------------------------------------------------------- | -------------- | ----- |
| `lib/auth.ts`                                             | Wrap `requireAdmin` / `requireRootAdmin` in `React.cache()`          | Modified       | A     |
| `components/student/PshareReader.tsx`                     | Drop `"use client"` — render markdown on the server                  | Modified       | A     |
| `lib/queries/bookings.ts`                                 | Fix `getRecentBookings` order; parallelize internal awaits           | Modified       | A     |
| `lib/queries/carelin.ts`                                  | Replace row-scan count with head-only counts; hoist regex            | Modified       | A     |
| `lib/queries/events.ts`                                   | Hoist regexes to module scope                                        | Modified       | A     |
| `lib/queries/projects.ts`                                 | Hoist regex to module scope                                          | Modified       | A     |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Delete — dead Next-template assets                       | Deleted        | A     |
| `next.config.ts`                                          | Add `images.formats = ["image/avif", "image/webp"]`                  | Modified       | A     |
| `lib/fonts.ts`                                            | Drop unused Plex Thai weights 300 and 700                            | Modified       | A     |
| `app/layout.tsx`                                          | `preconnect(SUPABASE_URL)` in the root server component              | Modified       | A     |
| `app/admin/loading.tsx`                                   | Route-level loading skeleton for admin                               | New            | B     |
| `app/student/loading.tsx`                                 | Route-level loading skeleton for student                             | New            | B     |
| `app/admin/page.tsx`                                      | Split into `<Suspense>`-wrapped async child server components        | Modified       | B     |
| `components/admin/cards/AdminOverviewCards.tsx`           | New file holding the four async children for `/admin`                | New            | B     |
| `components/layout/ActiveLink.tsx`                        | Tiny client wrapper deriving active state from `usePathname()`       | New            | B     |
| `components/layout/AdminSidebar.tsx`                      | Revert to server component; use `<ActiveLink>` per row               | Modified       | B     |
| `components/layout/StudentBottomNav.tsx`                  | Revert to server component; use `<ActiveLink>` per tab               | Modified       | B     |
| `app/globals.css`                                         | Add `.cv-row` utility for `content-visibility: auto`                 | Modified       | B     |
| `components/admin/PortfolioAdminTable.tsx`                | Apply `cv-row` to each `<tr>`                                        | Modified       | B     |
| `components/admin/AdminTodayBookingsTable.tsx`            | Apply `cv-row` to each `<tr>`                                        | Modified       | B     |
| `app/student/booking/actions.ts`                          | Move cross-role `revalidatePath` calls into `after()`                | Modified       | B     |
| `app/admin/pshare/actions.ts`                             | Move secondary `art_image_path` UPDATE into `after()`                | Modified       | B     |
| `components/RealtimeRefresh.tsx`                          | Lengthen debounce 250 ms → 1200 ms                                   | Modified       | C     |

---

## Phase A — Mechanical fixes

### Task 1: Wrap `requireAdmin` in React.cache()

**Vercel rule:** `server-cache-react` (deduplicates a function within a single request).

Today every admin page load runs `supabase.auth.getUser()` in three places (`proxy.ts`, `AdminLayout`, and any page that puts `requireAdmin()` in its top-level `Promise.all`). The proxy roundtrip is mandatory for cookie refresh. The layout and page calls are redundant within a single render — `React.cache()` collapses them.

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export const requireAdmin = cache(async (): Promise<AdminRow> => {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await db
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error("Not an active admin");
  return data;
});

export const requireRootAdmin = cache(async (): Promise<AdminRow> => {
  const admin = await requireAdmin();
  if (admin.tier !== "root") throw new Error("Root admin required");
  return admin;
});
```

- [ ] **Step 2: Verify type checking + lint**

Run: `npm run lint && npx tsc --noEmit`
Expected: no output (both pass).

- [ ] **Step 3: Verify behavior at runtime**

Run: `npm run dev`, sign in as an admin, open `/admin/carelin` (a route that previously called `requireAdmin()` twice — once in the layout, once in the page).

Open browser DevTools → Network → filter `auth/v1/user`. Hard-reload the page. **Expected: exactly 1 request to `/auth/v1/user`** (the `proxy.ts` call). Before this change there would be 3.

> **Why this works:** `cache()` keys by argument identity. Both helpers take zero args, so within one render React serves the first resolution to every subsequent caller. Across separate requests (including Server Actions), cache is empty — `server-auth-actions` requirement that every action revalidates auth is preserved.

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "perf: cache requireAdmin per request via React.cache()"
```

---

### Task 2: Server-render `PshareReader`

**Vercel rule:** `bundle-dynamic-imports` (keep heavy deps off the client) + `server-serialization` (only ship what the client needs — here, the rendered HTML).

`components/student/PshareReader.tsx` is `"use client"` despite having zero state, zero effects, and zero handlers. The result: every `/student/pshare/[slug]` page ships `react-markdown` + `remark-gfm` + the `unified`/`micromark`/`mdast` chain to the browser (~100–150 KB gzipped) just to render static text.

**Files:**
- Modify: `components/student/PshareReader.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PshareReader({ body }: { body: string }) {
  return (
    <div className="text-ink [&_h1]:font-display [&_h2]:font-display font-sans text-[14px] leading-[1.7] [&_a]:underline [&_h1]:text-[22px] [&_h1]:italic [&_h2]:text-[18px] [&_h2]:italic">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
```

(Difference from the current file: the `"use client"` directive at line 1 is removed. Everything else is identical.)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. In the per-route output table, `/student/pshare/[slug]`'s "First Load JS" should drop noticeably (verify it changed; the exact number depends on tree-shaking but should be at least 80 KB smaller).

- [ ] **Step 3: Verify rendering**

Run: `npm run dev`, open any published pshare slug. Confirm headings, bullet lists, bold/italic, links, and tables all render the same as before. Inspect the DOM — the `<div>` should contain real HTML, not a hydration boundary marker.

- [ ] **Step 4: Commit**

```bash
git add components/student/PshareReader.tsx
git commit -m "perf: render PshareReader on the server, drop client bundle of react-markdown"
```

---

### Task 3: Fix `getRecentBookings` ordering

**Bug — also a perf smell.** `getRecentBookings` is intended to return the most recent bookings (the admin overview's "Recent bookings" card). Today it orders ascending and limits, so it returns the *oldest* `limit` rows and forces the database to scan from the beginning of the index every time.

**Files:**
- Modify: `lib/queries/bookings.ts:267-269`

- [ ] **Step 1: Flip the order direction**

Find this block (around line 267):

```ts
    .order("starts_at", { ascending: true })
    .limit(limit);
```

Replace with:

```ts
    .order("starts_at", { ascending: false })
    .limit(limit);
```

- [ ] **Step 2: Verify behavior**

Run: `npm run dev`, sign in as admin, open `/admin`. The "Recent bookings" card should show the most recent `starts_at` rows at the top (latest dates first). Before this fix it showed the oldest seed rows.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/bookings.ts
git commit -m "fix: getRecentBookings returns most recent rows, not oldest"
```

---

### Task 4: Parallelize internal awaits in `getGanttRooms` and `getWeekBookings`

**Vercel rule:** `async-parallel` (CRITICAL — 2-10× improvement on independent operations).

Both helpers fetch bookings, then sequentially fetch the rooms list. The two queries have no dependency on each other and can run in parallel.

**Files:**
- Modify: `lib/queries/bookings.ts:126-195` (`getGanttRooms`) and `lib/queries/bookings.ts:197-241` (`getWeekBookings`)

- [ ] **Step 1: Rewrite `getGanttRooms`**

Replace the function body so the two `await db.from(...)` calls happen inside one `Promise.all`. The new function body:

```ts
export async function getGanttRooms(dateISO: string): Promise<GanttRoom[]> {
  const db = await createClient();
  const nextDay = addDays(dateISO, 1);

  const [bookingsRes, roomsRes] = await Promise.all([
    db
      .from("bookings")
      .select(
        "user_label, starts_at, ends_at, bar_variant, purpose, rooms!inner(name_en, name_th, sort_order)",
      )
      .gte("starts_at", `${dateISO}T00:00:00+07:00`)
      .lt("starts_at", `${nextDay}T00:00:00+07:00`)
      .order("starts_at", { ascending: true }),
    db
      .from("rooms")
      .select("name_en, name_th, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  if (bookingsRes.error) throw new Error(`getGanttRooms: ${bookingsRes.error.message}`);
  if (roomsRes.error) throw new Error(`getGanttRooms rooms: ${roomsRes.error.message}`);

  type Row = {
    user_label: string;
    starts_at: string;
    ends_at: string;
    bar_variant: GanttBarVariant;
    purpose: string | null;
    rooms: {
      name_en: string;
      name_th: string;
      sort_order: number | null;
    } | null;
  };
  const rows = (bookingsRes.data ?? []) as unknown as Row[];

  const byRoom = new Map<string, GanttRoom>();
  for (const r of rows) {
    if (!r.rooms) continue;
    const key = r.rooms.name_en;
    if (!byRoom.has(key)) {
      byRoom.set(key, {
        nameEn: r.rooms.name_en,
        nameTh: r.rooms.name_th,
        bars: [],
      });
    }
    const room = byRoom.get(key)!;
    const start = timeFromTimestamp(r.starts_at);
    const end = timeFromTimestamp(r.ends_at);
    const bar: GanttBar = {
      who: r.user_label,
      meta: `${start} — ${end}${r.purpose ? ` · ${r.purpose}` : ""}`,
      leftPct: ganttPctFromTime(start, "left"),
      widthPct: ganttPctFromTime(start, "width", end),
      variant: r.bar_variant === "default" ? undefined : r.bar_variant,
    };
    room.bars.push(bar);
  }

  for (const r of roomsRes.data ?? []) {
    if (!byRoom.has(r.name_en)) {
      byRoom.set(r.name_en, { nameEn: r.name_en, nameTh: r.name_th, bars: [] });
    }
  }
  const sortMap = new Map(
    (roomsRes.data ?? []).map((r) => [r.name_en, r.sort_order ?? 0]),
  );
  return [...byRoom.values()].sort(
    (a, b) => (sortMap.get(a.nameEn) ?? 0) - (sortMap.get(b.nameEn) ?? 0),
  );
}
```

- [ ] **Step 2: Rewrite `getWeekBookings`**

Replace the function so both `await` calls happen in one `Promise.all`:

```ts
export async function getWeekBookings(
  weekStart: string,
  weekEnd: string,
): Promise<{
  rooms: { id: string; nameEn: string; nameTh: string }[];
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
}> {
  const db = await createClient();
  const nextDay = addDays(weekEnd, 1);

  const [bookingsRes, roomsRes] = await Promise.all([
    db
      .from("bookings")
      .select("id, starts_at, bar_variant, room_id")
      .gte("starts_at", `${weekStart}T00:00:00+07:00`)
      .lt("starts_at", `${nextDay}T00:00:00+07:00`)
      .order("starts_at", { ascending: true }),
    db
      .from("rooms")
      .select("id, name_en, name_th, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (bookingsRes.error) throw new Error(`getWeekBookings: ${bookingsRes.error.message}`);
  if (roomsRes.error) throw new Error(`getWeekBookings rooms: ${roomsRes.error.message}`);

  const bookingsByRoomDay: Record<string, Record<string, WeekChip[]>> = {};
  for (const b of bookingsRes.data ?? []) {
    const dayISO = b.starts_at.slice(0, 10);
    const startHHMM = timeFromTimestamp(b.starts_at);
    const room = (bookingsByRoomDay[b.room_id] ??= {});
    (room[dayISO] ??= []).push({
      id: b.id,
      startHHMM,
      variant: b.bar_variant as GanttBarVariant,
    });
  }

  return {
    rooms: (roomsRes.data ?? []).map((r) => ({
      id: r.id,
      nameEn: r.name_en,
      nameTh: r.name_th,
    })),
    bookingsByRoomDay,
  };
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, open `/admin/bookings`. Visual output must match (week grid + gantt + day-list). Open DevTools → Network and verify the Server Component HTML still streams the same data.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/bookings.ts
git commit -m "perf: parallelize bookings + rooms fetches in getGanttRooms and getWeekBookings"
```

---

### Task 5: Replace `getCarelinTabCounts` row scan with three head counts

**Vercel rule:** `async-parallel`. Avoid scanning a table to count three numbers.

Today the function pulls every `carelin_requests` row to compute three counts in JS. As the table grows this is O(n) network and CPU. Three head-only count queries (parallel) move the work to Postgres and transfer only the counters.

**Files:**
- Modify: `lib/queries/carelin.ts:140-154`

- [ ] **Step 1: Replace the function**

Find the existing `getCarelinTabCounts` (around line 140) and replace with:

```ts
export async function getCarelinTabCounts(): Promise<{
  all: number;
  open: number;
  answered: number;
}> {
  const db = await createClient();
  const [allRes, openRes, answeredRes] = await Promise.all([
    db.from("carelin_requests").select("*", { count: "exact", head: true }),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "answered"),
  ]);
  if (allRes.error) throw new Error(`getCarelinTabCounts: ${allRes.error.message}`);
  if (openRes.error) throw new Error(`getCarelinTabCounts: ${openRes.error.message}`);
  if (answeredRes.error) {
    throw new Error(`getCarelinTabCounts: ${answeredRes.error.message}`);
  }
  return {
    all: allRes.count ?? 0,
    open: openRes.count ?? 0,
    answered: answeredRes.count ?? 0,
  };
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, open `/admin/carelin`. The tab bar shows three counts ("All N · Open N · Answered N"). They must match what's actually in the table (count the rows visually).

- [ ] **Step 3: Commit**

```bash
git add lib/queries/carelin.ts
git commit -m "perf: count carelin tabs server-side via head queries instead of row scan"
```

---

### Task 6: Delete dead Next-template SVGs

`public/` carries five SVG files from `create-next-app`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`. None are referenced anywhere in `app/` or `components/`.

**Files:**
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

- [ ] **Step 1: Confirm no references**

Run: `grep -rln "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" --include='*.tsx' --include='*.ts' --include='*.css' --include='*.md' app/ components/ lib/`
Expected: no matches.

- [ ] **Step 2: Delete the files**

Run: `git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg`

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: drop unused Next-template SVGs from public/"
```

---

### Task 7: Enable AVIF in `next/image`

**Vercel rule analog:** image-bytes-on-the-wire reduction. AVIF averages ~30% smaller than WebP for photographic content (P'share hero images served from Supabase storage).

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add `formats` to the `images` block**

Replace the `nextConfig` declaration with:

```ts
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run dev`. Open a pshare detail page that has an `art_image_path`. In DevTools → Network → click the image → Response Headers: `content-type: image/avif` (or `image/webp` if the browser doesn't accept AVIF). Before this change it was always `image/webp`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "perf: serve AVIF (then WebP) via next/image"
```

---

### Task 8: Hoist regexes to module scope

**Vercel rule:** `js-hoist-regexp`. RegExp literals inside hot functions are recompiled on every call. Hoisting is free and avoids the work on `router.refresh()`-driven re-renders.

**Files:**
- Modify: `lib/queries/events.ts`
- Modify: `lib/queries/bookings.ts`
- Modify: `lib/queries/carelin.ts`
- Modify: `lib/queries/projects.ts`

- [ ] **Step 1: events.ts — hoist `DAY_RE` and `TIME_RE`**

Find `dayOf` (around line 54) and `timeOf` (around line 61). Above them (after the `EventRow` type block, before `monthRange`), add:

```ts
const DAY_RE = /-\d{2}-(\d{2})T/;
const TIME_RE = /T(\d{2}:\d{2})/;
```

Then rewrite the two functions:

```ts
function dayOf(starts_at: string): number {
  const match = starts_at.match(DAY_RE);
  return match ? parseInt(match[1], 10) : 0;
}

function timeOf(starts_at: string): string {
  const match = starts_at.match(TIME_RE);
  return match ? match[1] : "00:00";
}
```

- [ ] **Step 2: bookings.ts — hoist `TIME_FROM_TS_RE`, `FORMAT_START_RE_A`, `FORMAT_START_RE_B`**

At the top of the file (just below the imports, before `BookingFull` type), add:

```ts
const TIME_FROM_TS_RE = /T(\d{2}:\d{2})/;
const FORMAT_START_TIME_RE = /-(\d{2})T(\d{2}:\d{2})/;
const FORMAT_START_DAY_RE = /-(\d{2})-(\d{2})T/;
```

Rewrite `timeFromTimestamp` (around line 41) and `formatStart` (around line 252):

```ts
function timeFromTimestamp(ts: string): string {
  const match = ts.match(TIME_FROM_TS_RE);
  return match ? match[1] : "00:00";
}

function formatStart(ts: string): string {
  const match = ts.match(FORMAT_START_TIME_RE);
  if (!match) return ts;
  const monthMap: Record<string, string> = { "05": "May" };
  const dayMatch = ts.match(FORMAT_START_DAY_RE);
  if (!dayMatch) return ts;
  return `${parseInt(dayMatch[2], 10)} ${monthMap[dayMatch[1]] ?? dayMatch[1]} · ${match[2]}`;
}
```

- [ ] **Step 3: carelin.ts — hoist `RELATIVE_WHEN_RE`**

At the top of `lib/queries/carelin.ts` (below the imports), add:

```ts
const RELATIVE_WHEN_RE = /-(\d{2})-(\d{2})T(\d{2}:\d{2})/;
```

Rewrite `relativeWhen` (around line 4):

```ts
function relativeWhen(ts: string): string {
  const m = ts.match(RELATIVE_WHEN_RE);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const hhmm = m[3];
  if (day === 12) return hhmm;
  if (day === 11) return "เมื่อวาน";
  return `${day} พ.ค.`;
}
```

- [ ] **Step 4: projects.ts — hoist `SUBMITTED_RE`**

At the top of `lib/queries/projects.ts` (below the imports), add:

```ts
const SUBMITTED_RE = /^(\d{4})-(\d{2})-(\d{2})/;
```

Rewrite `fmtSubmitted` (around line 19):

```ts
function fmtSubmitted(d: string | null): string {
  if (!d) return "—";
  const m = d.match(SUBMITTED_RE);
  if (!m) return d;
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
  return `${parseInt(m[3], 10)} ${monthMap[m[2]] ?? m[2]}`;
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, open `/admin/bookings`, `/admin/carelin`, `/admin/portfolio`, `/admin/calendar`. Visual output must be identical — these regexes are pure formatting.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/events.ts lib/queries/bookings.ts lib/queries/carelin.ts lib/queries/projects.ts
git commit -m "perf: hoist regex literals to module scope in query helpers"
```

---

### Task 9: Drop unused Plex Thai weights

A grep across `app/` and `components/` confirms `font-light` and `font-bold` are never used. `lib/fonts.ts` loads Plex Thai weights `["300", "400", "500", "600", "700"]`. Weights 300 and 700 are dead — dropping them removes two WOFF2 subsets (latin + thai) from the font payload.

**Files:**
- Modify: `lib/fonts.ts`

- [ ] **Step 1: Confirm nothing uses 300 or 700**

Run: `grep -rln "font-light\|font-thin\|font-extralight\|font-bold\|font-extrabold\|font-black" --include='*.tsx' --include='*.ts' app/ components/`
Expected: no matches.

- [ ] **Step 2: Trim the weight array**

Replace the `ibmPlexThai` declaration in `lib/fonts.ts`:

```ts
export const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  weight: ["400", "500", "600"],
  subsets: ["latin", "thai"],
  display: "swap",
});
```

(Difference: `weight` drops "300" and "700".)

- [ ] **Step 3: Verify**

Run: `npm run build && npm run dev`. Open `/student` and `/admin`. Inspect text rendering — body copy (400), `font-medium` (500), and `font-semibold` (600) elements must look unchanged.

- [ ] **Step 4: Commit**

```bash
git add lib/fonts.ts
git commit -m "perf: drop unused IBM Plex Thai weights 300 and 700"
```

---

### Task 10: Preconnect Supabase from the root layout

**Vercel rule:** `rendering-resource-hints`. The HTML response reaches the browser before any `<img>` triggers DNS for Supabase. A `preconnect` in the root layout starts the DNS + TCP + TLS handshake earlier.

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Import `preconnect` and call it in `RootLayout`**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { ibmPlexMono, ibmPlexThai, instrumentSerif } from "@/lib/fonts";
import { cn } from "@/lib/cn";
import "./globals.css";

export const metadata: Metadata = {
  title: "CD Smart Campus — Chitralada 2026",
  description: "Chitralada 2026 smart-campus prototype",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (SUPABASE_URL) preconnect(SUPABASE_URL);
  return (
    <html
      lang="th"
      className={cn(
        instrumentSerif.variable,
        ibmPlexThai.variable,
        ibmPlexMono.variable,
        "h-full antialiased",
      )}
    >
      <body className="bg-cream text-ink min-h-full font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run dev`. Open any page. View page source — `<head>` should contain `<link rel="preconnect" href="https://<your-project>.supabase.co">`.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "perf: preconnect Supabase from the root layout"
```

---

## Phase B — Structural changes

### Task 11: Add `app/admin/loading.tsx`

**Vercel rule:** `async-suspense-boundaries` (HIGH — faster initial paint). Route-level `loading.tsx` paints instantly on navigation while the page resolves data.

**Files:**
- Create: `app/admin/loading.tsx`

- [ ] **Step 1: Create the file**

```tsx
export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-line bg-paper mb-[18px] flex items-center justify-between border-[1.5px] px-5 py-4 [box-shadow:3px_3px_0_var(--color-ink)]">
        <div className="space-y-1.5">
          <div className="bg-mute-200 h-3 w-32" />
          <div className="bg-mute-300 h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <div className="border-line bg-cream h-9 w-24 border-[1.5px]" />
          <div className="border-line bg-cream h-9 w-24 border-[1.5px]" />
        </div>
      </div>

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-line bg-paper h-24 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <div className="border-line bg-paper h-72 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
        <div className="border-line bg-paper h-72 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
      </div>

      <div className="border-line bg-paper mt-[18px] h-64 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`. Navigate from `/admin` to `/admin/bookings` (or another admin route). The skeleton should flash briefly while the page resolves. Throttle Network to "Slow 4G" in DevTools to see it clearly.

- [ ] **Step 3: Commit**

```bash
git add app/admin/loading.tsx
git commit -m "perf: route-level loading skeleton for /admin"
```

---

### Task 12: Add `app/student/loading.tsx`

**Files:**
- Create: `app/student/loading.tsx`

- [ ] **Step 1: Create the file**

```tsx
export default function StudentLoading() {
  return (
    <div className="animate-pulse px-4 pt-6">
      <div className="bg-mute-200 mb-4 h-6 w-40" />
      <div className="space-y-3">
        <div className="border-line bg-paper h-32 border-[1.5px]" />
        <div className="border-line bg-paper h-24 border-[1.5px]" />
        <div className="border-line bg-paper h-24 border-[1.5px]" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`. Navigate between student routes — fallback should flash briefly under network throttling.

- [ ] **Step 3: Commit**

```bash
git add app/student/loading.tsx
git commit -m "perf: route-level loading skeleton for /student"
```

---

### Task 13: Split `/admin` overview into Suspense-wrapped children

**Vercel rule:** `async-suspense-boundaries` + `server-parallel-fetching`. Today `app/admin/page.tsx` awaits all five queries before any HTML returns. Split each card into an async child server component so the shell renders immediately and cards stream as their data arrives.

**Files:**
- Create: `components/admin/cards/OverviewCards.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Create the cards file**

```tsx
// components/admin/cards/OverviewCards.tsx
import { Card, CardTitle } from "@/components/admin/Card";
import { GreetingBanner } from "@/components/admin/GreetingBanner";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentBookingsTable } from "@/components/admin/RecentBookingsTable";
import { TodayEventsCard } from "@/components/admin/TodayEventsCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { getRecentBookings } from "@/lib/queries/bookings";
import { getAdminTodayEvents } from "@/lib/queries/events";
import {
  getAdminGreeting,
  getOverviewKpis,
  getTrendChart,
} from "@/lib/queries/siteConfig";

export async function GreetingCard() {
  const greeting = await getAdminGreeting();
  return <GreetingBanner th={greeting.th} en={greeting.en} />;
}

export async function KpiGrid() {
  const kpis = await getOverviewKpis();
  return (
    <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

export async function TrendCard() {
  const trend = await getTrendChart();
  return (
    <Card accent>
      <CardTitle th="กิจกรรม 12 เดือน" en="12-month trend" menu="↗ View report" />
      <TrendChart data={trend} />
    </Card>
  );
}

export async function TodayEvents() {
  const events = await getAdminTodayEvents();
  return <TodayEventsCard events={events} />;
}

export async function RecentBookings() {
  const rows = await getRecentBookings();
  return (
    <Card className="mt-[18px]">
      <CardTitle th="การจองล่าสุด" en="Recent bookings" menu="View all →" />
      <RecentBookingsTable rows={rows} />
    </Card>
  );
}

export function GreetingSkeleton() {
  return (
    <div className="border-line bg-paper mb-[18px] h-16 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-line bg-paper h-24 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]"
        />
      ))}
    </div>
  );
}

export function TallCardSkeleton() {
  return (
    <div className="border-line bg-paper h-72 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}

export function TableCardSkeleton() {
  return (
    <div className="border-line bg-paper mt-[18px] h-64 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}
```

- [ ] **Step 2: Replace `app/admin/page.tsx`**

```tsx
import { Suspense } from "react";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import {
  GreetingCard,
  GreetingSkeleton,
  KpiGrid,
  KpiGridSkeleton,
  RecentBookings,
  TableCardSkeleton,
  TallCardSkeleton,
  TodayEvents,
  TrendCard,
} from "@/components/admin/cards/OverviewCards";

export default function AdminOverview() {
  return (
    <>
      <AdminTopbar
        titleTh="ภาพรวม"
        eyebrow="Overview · Term 1 / Week 6 of 16"
        actions={
          <>
            <AdminSearch />
            <Btn>Export ↓</Btn>
            <Btn variant="primary">+ New Event</Btn>
          </>
        }
      />

      <Suspense fallback={<GreetingSkeleton />}>
        <GreetingCard />
      </Suspense>

      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiGrid />
      </Suspense>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <Suspense fallback={<TallCardSkeleton />}>
          <TrendCard />
        </Suspense>
        <Suspense fallback={<TallCardSkeleton />}>
          <TodayEvents />
        </Suspense>
      </div>

      <Suspense fallback={<TableCardSkeleton />}>
        <RecentBookings />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, throttle to "Slow 4G", navigate to `/admin`. The topbar and skeleton boxes must appear immediately; each card resolves independently. Compare to the old behavior (the whole page blocked until the slowest query). Functional output must be identical once everything loads.

- [ ] **Step 4: Commit**

```bash
git add components/admin/cards/OverviewCards.tsx app/admin/page.tsx
git commit -m "perf: stream /admin overview cards via per-card Suspense boundaries"
```

---

### Task 14: Extract `ActiveLink` and de-clientify `AdminSidebar`

**Vercel rule:** `server-serialization` (minimize what crosses the client boundary). `AGENTS.md` explicitly says: *"Active nav state is derived from `usePathname()` in tiny client wrappers — don't drag whole layouts client-side."*

**Files:**
- Create: `components/layout/ActiveLink.tsx`
- Modify: `components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Create `ActiveLink`**

```tsx
// components/layout/ActiveLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  href: string;
  exact?: boolean;
  activeClass: string;
  inactiveClass: string;
  children: ReactNode;
};

export function ActiveLink({
  href,
  exact = false,
  activeClass,
  inactiveClass,
  children,
}: Props) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      className={cn(active ? activeClass : inactiveClass)}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite `AdminSidebar` as a server component**

Replace `components/layout/AdminSidebar.tsx` with:

```tsx
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/signout/actions";
import { ActiveLink } from "./ActiveLink";

export type NavItem = {
  href: string;
  en: string;
  th: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    en: "Overview",
    th: "ภาพรวม",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </>
    ),
  },
  {
    href: "/admin/calendar",
    en: "Calendar",
    th: "ปฏิทิน",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/admin/sport",
    en: "Sport Day",
    th: "กีฬาสี",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </>
    ),
  },
  {
    href: "/admin/bookings",
    en: "Bookings",
    th: "จองห้อง",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M3 12h18M9 3v18M15 3v18" />
      </>
    ),
  },
  {
    href: "/admin/portfolio",
    en: "Portfolios",
    th: "รุ่นพี่",
    icon: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M9 7V4h6v3" />
      </>
    ),
  },
  {
    href: "/admin/pshare",
    en: "P'share Studio",
    th: "พี่แชร์",
    icon: (
      <>
        <path d="M3 5l9 -2 9 2v14l-9 -2 -9 2z" />
        <path d="M12 3v18" />
      </>
    ),
  },
  {
    href: "/admin/carelin",
    en: "Carelin Desk",
    th: "แคร์ลิน",
    icon: (
      <path d="M21 11c0 4 -4 7 -9 7l-3 3v-3c-3 -1 -6 -3 -6 -7s4 -7 9 -7s9 3 9 7z" />
    ),
  },
];

const BASE_LINK =
  "flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-left font-sans text-[13.5px] transition-colors";
const ACTIVE_LINK = `${BASE_LINK} border-blue bg-ink text-yellow font-medium`;
const INACTIVE_LINK = `${BASE_LINK} text-ink hover:bg-cream border-transparent`;

const BASE_ICON =
  "shrink-0";
const ACTIVE_ICON = `${BASE_ICON} text-yellow`;
const INACTIVE_ICON = `${BASE_ICON} text-mute-700`;

const BASE_TH = "font-display ml-1 text-[13px] italic";

export function AdminSidebar({ extraItems = [] }: { extraItems?: NavItem[] }) {
  const items = [...NAV, ...extraItems];
  return (
    <aside
      className="border-line bg-paper sticky top-6 w-[240px] shrink-0 self-start border-[1.5px] p-[20px_18px_18px]"
      style={{ boxShadow: "5px 5px 0 var(--color-ink)" }}
    >
      <div className="border-line mb-4 border-b-[1.5px] pb-4 text-center">
        <span
          className="bg-blue font-display inline-block px-[14px] pt-1 pb-2 text-[22px] text-white italic"
          style={{
            boxShadow: "2px 2px 0 var(--color-yellow)",
            transform: "rotate(-1.5deg)",
          }}
        >
          CD Smart
        </span>
        <div
          className="font-display text-yellow -mt-1 text-[32px] leading-[0.9] italic"
          style={{ WebkitTextStroke: "1.5px var(--color-ink)" }}
        >
          2026
        </div>
        <div className="text-mute-500 mt-1 font-mono text-[9px] tracking-[0.22em] uppercase">
          ★ Chitralada ★
        </div>
      </div>
      <div className="text-mute-500 px-1.5 pt-3 pb-1.5 font-mono text-[9px] tracking-[0.2em] uppercase">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <ActiveLink
            key={item.href}
            href={item.href}
            exact={item.href === "/admin"}
            activeClass={ACTIVE_LINK}
            inactiveClass={INACTIVE_LINK}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-data-[active=true]:text-yellow text-mute-700 shrink-0"
            >
              {item.icon}
            </svg>
            <span>
              {item.en}{" "}
              <span className={`${BASE_TH} text-mute-500 group-data-[active=true]:text-yellow`}>
                {item.th}
              </span>
            </span>
          </ActiveLink>
        ))}
      </nav>
      <form action={signOut} className="border-line mt-3 border-t-[1.5px] pt-3">
        <button
          type="submit"
          className="text-mute-500 hover:text-house-pink w-full px-3 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase transition-colors"
        >
          Sign out · ออกจากระบบ →
        </button>
      </form>
    </aside>
  );
}
```

> **Note on icon color:** `data-active="true"` is set on the `<a>` by `ActiveLink`. Tailwind's `group-data-[active=true]:` variant addresses descendants — but `<a>` isn't a `group` here. To keep the color swap working without an extra wrapper, add `group` to the `<a>` via `ActiveLink`'s class strings. Append ` group` to the end of both `ACTIVE_LINK` and `INACTIVE_LINK`:

Replace those two constants:

```ts
const ACTIVE_LINK = `${BASE_LINK} border-blue bg-ink text-yellow font-medium group`;
const INACTIVE_LINK = `${BASE_LINK} text-ink hover:bg-cream border-transparent group`;
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, sign in as admin. Click through every sidebar item and verify:
1. The active row has the blue left border + ink background + yellow text + yellow icon + yellow Thai gloss.
2. Inactive rows have grey text and grey icons.
3. Hovering an inactive row tints the background cream.
4. The "Sign out" form still works.

- [ ] **Step 4: Commit**

```bash
git add components/layout/ActiveLink.tsx components/layout/AdminSidebar.tsx
git commit -m "refactor: ActiveLink wrapper; AdminSidebar reverts to server component"
```

---

### Task 15: Refactor `StudentBottomNav` with `ActiveLink`

Same playbook: keep `usePathname` in a tiny client wrapper, render the rest server-side.

**Files:**
- Modify: `components/layout/StudentBottomNav.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import type { ReactNode } from "react";
import { ActiveLink } from "./ActiveLink";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/student",
    label: "Home",
    icon: (
      <path d="M3 12 L12 4 L21 12 L21 20 L14 20 L14 14 L10 14 L10 20 L3 20 Z" />
    ),
  },
  {
    href: "/student/calendar",
    label: "Calendar",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/student/booking",
    label: "Booking",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M9 8v8M15 8v8M3 12h18" />
      </>
    ),
  },
  {
    href: "/student/pshare",
    label: "P'share",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    href: "/student/carelin",
    label: "Carelin",
    icon: <path d="M4 5h16v11h-7l-4 3v-3H4z" />,
  },
];

const BASE_TAB =
  "relative flex flex-col items-center gap-[3px] py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors group";
const ACTIVE_TAB = `${BASE_TAB} text-blue font-semibold`;
const INACTIVE_TAB = `${BASE_TAB} text-mute-500`;

export function StudentBottomNav() {
  return (
    <nav className="border-line bg-cream grid shrink-0 grid-cols-5 border-t-[1.5px] pt-2 pb-3.5">
      {TABS.map((tab) => (
        <ActiveLink
          key={tab.href}
          href={tab.href}
          exact={tab.href === "/student"}
          activeClass={ACTIVE_TAB}
          inactiveClass={INACTIVE_TAB}
        >
          <span
            aria-hidden
            className="bg-blue absolute -top-2 left-1/2 hidden h-[3px] w-6 -translate-x-1/2 group-data-[active=true]:block"
          />
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {tab.icon}
          </svg>
          {tab.label}
        </ActiveLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, open `/student`. Tap each bottom-nav tab:
1. The active tab shows the blue top bar, blue text, semibold.
2. Inactive tabs show grey.
3. Pathname change updates the active state immediately.

- [ ] **Step 3: Commit**

```bash
git add components/layout/StudentBottomNav.tsx
git commit -m "refactor: StudentBottomNav reverts to server component, uses ActiveLink"
```

---

### Task 16: Apply `content-visibility: auto` to long admin tables

**Vercel rule:** `rendering-content-visibility`. Skips layout + paint for rows off-screen — 10× faster initial render at the 1k-row scale.

**Files:**
- Modify: `app/globals.css`
- Modify: `components/admin/PortfolioAdminTable.tsx`
- Modify: `components/admin/AdminTodayBookingsTable.tsx`

- [ ] **Step 1: Add the utility to globals.css**

Append to `app/globals.css` (after the existing halftone block):

```css
/* Defer off-screen row layout/paint for long admin tables. */
.cv-row {
  content-visibility: auto;
  contain-intrinsic-size: 0 64px;
}
```

- [ ] **Step 2: Apply to `PortfolioAdminTable`**

Open `components/admin/PortfolioAdminTable.tsx`. Find the `<tr>` element inside the `rows.map` (around line 60). Append `cv-row` to its `className`:

Before:
```tsx
<tr
  key={i}
  className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
>
```

After:
```tsx
<tr
  key={i}
  className="cv-row hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
>
```

- [ ] **Step 3: Apply to `AdminTodayBookingsTable`**

Open `components/admin/AdminTodayBookingsTable.tsx`. Find the row `<tr>` inside `rows.map`, append `cv-row` to its `className` the same way (the exact existing classes will differ — read the file first, then prepend `cv-row` to whatever's already there).

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`, open `/admin/portfolio`. Scroll the table — rendering should feel snappy even with many rows. No visual regressions (rows look identical when in view).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/admin/PortfolioAdminTable.tsx components/admin/AdminTodayBookingsTable.tsx
git commit -m "perf: content-visibility on admin long-list rows"
```

---

### Task 17: Move cross-role `revalidatePath` calls into `after()`

**Vercel rule:** `server-after-nonblocking`. The student doesn't need `/admin/bookings` revalidation to finish before seeing their success banner — but today they wait for it.

**Files:**
- Modify: `app/student/booking/actions.ts`

- [ ] **Step 1: Reorder revalidation**

Replace the `bookRoom` function body so `revalidatePath("/admin/bookings")` and `revalidatePath("/admin")` run after the response, and the student-facing path runs inline:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Please choose a date." };
  }
  if (!isPeriod(period)) {
    return { ok: false, error: "Please choose a time period." };
  }
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!ID_RE.test(student_id_4)) {
    return { ok: false, error: "Student ID must be 4 digits." };
  }

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
  after(() => {
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
  });
  return { ok: true };
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`. As a student, complete the booking flow. The success banner should appear at least as fast as before. Sign in as admin, open `/admin/bookings` — the new booking should still show up (the `after()` revalidation runs after the response, within seconds).

- [ ] **Step 3: Commit**

```bash
git add app/student/booking/actions.ts
git commit -m "perf: defer admin-path revalidation in bookRoom via after()"
```

---

### Task 18: Defer secondary `art_image_path` UPDATE in pshare actions via `after()`

**Vercel rule:** `server-after-nonblocking`. Today `saveDraft` and `publishPost` each do INSERT (or UPDATE) → upload → second UPDATE. The admin waits for all three before getting a redirect. The second UPDATE can move into `after()` so the admin lands on the index list immediately and the thumbnail appears moments later.

**Files:**
- Modify: `app/admin/pshare/actions.ts`

- [ ] **Step 1: Replace `saveDraft` and `publishPost`**

Find the existing `saveDraft` and `publishPost` (around lines 94 and 137). Replace both with the versions below. The image upload still happens inline (we need the path or null to know whether to schedule the post-response UPDATE), but the second DB roundtrip moves to `after()`.

```ts
import { after } from "next/server";

// ... keep imports/helpers above unchanged ...

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

  revalidatePath("/admin/pshare");
  after(async () => {
    if (newPath) {
      await db
        .from("pshare_posts")
        .update({ art_image_path: newPath })
        .eq("id", rowId);
    }
    revalidatePath("/student/pshare");
  });
  redirect("/admin/pshare");
}

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

  revalidatePath("/admin/pshare");
  after(async () => {
    if (newPath) {
      await db
        .from("pshare_posts")
        .update({ art_image_path: newPath })
        .eq("id", rowId);
    }
    revalidatePath("/student/pshare");
  });
  redirect("/admin/pshare");
}
```

> The student-facing `/student/pshare` revalidation also moves into `after()` since it's not on the admin's critical path. If the thumbnail isn't strictly needed by the admin's index view immediately, the perceived save is faster.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: pass.

Run: `npm run dev`. Sign in as admin, open `/admin/pshare/new`. Create a post **without** an image — confirm redirect to `/admin/pshare` and the row appears with no image. Create another post **with** a JPG (≤5 MB). Confirm: redirect lands quickly; on the index list refresh a moment later the thumbnail appears. Open the corresponding `/student/pshare/<slug>` and confirm the image renders.

- [ ] **Step 3: Commit**

```bash
git add app/admin/pshare/actions.ts
git commit -m "perf: defer secondary art_image_path UPDATE in pshare actions via after()"
```

---

## Phase C — Realtime hardening

### Task 19: Lengthen `RealtimeRefresh` debounce 250 ms → 1200 ms

**Vercel rule analog:** `client-event-listeners` (rate-limit chattier event sources). `router.refresh()` re-runs the entire route's server tree — including the proxy auth roundtrip and every page-level query. With several admins watching `/admin/bookings` during a busy window, the 250 ms debounce barely caps anything. 1200 ms still feels live to a human and substantially reduces SSR thrash.

**Files:**
- Modify: `components/RealtimeRefresh.tsx`

- [ ] **Step 1: Bump the debounce**

In `components/RealtimeRefresh.tsx`, change the `setTimeout` delay from 250 to 1200. The full updated effect body:

```tsx
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelKey);
    for (const table of tablesKey.split("|")) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 1200);
        },
      );
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, tablesKey, router]);
```

- [ ] **Step 2: Verify**

Run: `npm run dev`. Open `/admin/bookings` in two tabs (sign in as admin in both). In tab A, create a new booking via `/admin/bookings/new`. In tab B, the booking should appear within ~1–2 seconds of the insert. Network panel: `auth/v1/user` should not flicker.

- [ ] **Step 3: Commit**

```bash
git add components/RealtimeRefresh.tsx
git commit -m "perf: lengthen RealtimeRefresh debounce 250ms -> 1200ms to reduce SSR thrash"
```

---

## Out of scope (future plans)

These ideas come from the same performance review but require a separate spec because they depend on Phase 3 finishing first or change a contract:

1. **`'use cache'` + `cacheLife()` over `site_config` reads** (`getHomeHero`, `getAdminGreeting`, `getOverviewKpis`, `getTrendChart`, `getPortfolioStats`, `getPortfolioKpis`, `getCarelinKpis`). Forbidden in Phase 3 per `AGENTS.md`. Revisit after Phase 3 ships.
2. **`generateStaticParams` over published pshare slugs** paired with `'use cache'` on the slug page. Same gating.
3. **Pre-compile markdown to HTML on `publishPost`** and store next to `body_md`. Removes `react-markdown` from the server-rendered path entirely. A contract change (adds a column), not a refactor.
4. **Replace `router.refresh()` in `RealtimeRefresh` with targeted slice updates** via Server-Action-returned partial HTML. Larger refactor; only worth it if Task 19's debounce isn't enough.
5. **Re-evaluate Plex Mono weight 500** after a full audit confirms it's never used in a `font-mono` context.

---

## Self-review

Checked the plan against the source report:

- §1.1 (triple-auth roundtrip) → **Task 1** ✓
- §1.2 (no streaming/Suspense) → **Tasks 11, 12, 13** ✓
- §1.3 (sequential awaits in bookings helpers) → **Task 4** ✓
- §1.4 (carelin row scan) → **Task 5** ✓
- §1.5 (recent-bookings order bug) → **Task 3** ✓
- §1.6 (two-write pshare upload) → **Task 18** ✓
- §2.1 (PshareReader "use client") → **Task 2** ✓
- §2.2 (nav whole-file "use client") → **Tasks 14, 15** ✓
- §2.3 (dead public SVGs) → **Task 6** ✓
- §2.4 (unused font weights) → **Task 9** ✓
- §2.5 (image formats AVIF) → **Task 7** ✓
- §3.5 (after() for cross-role revalidation) → **Task 17** ✓
- §4.1 (RealtimeRefresh cascade) → **Task 19** ✓
- §5.3 (content-visibility) → **Task 16** ✓
- §5.4 (preconnect Supabase) → **Task 10** ✓
- §6.1 (hoist regexes) → **Task 8** ✓

No placeholders. No "TODO" or "implement later". Every code-changing step shows the actual code. Every verification step is a runnable command with an expected result. Type names (`AdminRow`, `NavItem`, `Tab`, `Props`) used in later tasks match what's defined in the codebase or earlier tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-perf-optimization.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
