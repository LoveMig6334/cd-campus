# Admin Overview KPIs — dynamic from live data

Status: design approved
Owner: Tom
Date: 2026-05-17

## Problem

The admin overview's KPI grid currently reads a static seed row (`site_config.overview_kpis`) and renders four hand-written numbers (Students, Events, Bookings · today, Lost & Found). They never change, even when underlying data does, which is misleading for the people running the admin console.

## Goal

Replace the four KPI cards on `/admin` with live counts computed at request time, reflecting actual content in the database:

1. **Activities this month** — count of `events` whose `starts_at` falls in the current calendar month **and** `tag IS NULL` (i.e. BigCal-style headline rows — the same rows the calendar grid renders). Tagged rows are sub-entries for the today-card / day-events view and would double-count.
2. **Room bookings this month** — count of `bookings` whose `starts_at` falls in the current calendar month.
3. **Carelines without a response** — count of `carelin_requests` where `status = 'open'` (running backlog total, not month-bucketed).
4. **P-Share published topics** — count of `pshare_posts` where `status = 'published'` (running total).

No change to the visual shape of `KpiCard`. No change to the surrounding layout.

## Non-goals

- No caching (per AGENTS.md "Don't add caching in Phase 3").
- No new visual treatment / no `KpiCard` redesign.
- No "edit KPI labels via admin UI" — labels are static in code.
- No history/sparkline; deltas are a single chip per card.

## Approach

### File layout

- **New** `lib/queries/overview.ts` — exports `getOverviewKpis(): Promise<AdminKpi[]>`. Owns the cross-entity count queries and the delta-text formatting.
- **Remove** `getOverviewKpis()` from `lib/queries/siteConfig.ts` (no longer reads `site_config`).
- **Remove** the `overview_kpis` row from `supabase/seed/siteConfig.ts`.
- **Remove** the `ADMIN_KPIS` export from `supabase/seed/data/admin-overview.ts` (file keeps its other exports — `ADMIN_TODAY_EVENTS`, `ADMIN_TREND_*`, `ADMIN_RECENT_BOOKINGS` — which are still consumed).
- **Move** the `monthRange(year, month)` helper out of `lib/queries/events.ts` into `lib/queries/util.ts` (it's the same helper both files need).
- **Update** import in `components/admin/cards/OverviewCards.tsx` from `@/lib/queries/siteConfig` → `@/lib/queries/overview` for `getOverviewKpis`. Call-site (`KpiGrid`) is unchanged.

`KpiCard.tsx`, `AdminKpi` type, and `OverviewCards.tsx` shape are untouched aside from the import swap.

### Date boundaries

Compute "this month" from real `new Date()` at request time.

- `now = new Date()` → `currentYear`, `currentMonth` (1-indexed).
- Previous month: if `currentMonth === 1`, prev is `(currentYear - 1, 12)`; else `(currentYear, currentMonth - 1)`.
- Use the existing `monthRange(year, month)` ISO bounds (`YYYY-MM-01T00:00:00+07:00` → first day of next month), matching how the rest of the queries file timestamps things in `+07:00`.

The previous-month label for delta text comes from a small static array `["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]` indexed by `prevMonth - 1`.

### The six count queries

All run concurrently in one `Promise.all`. Each uses the `select('*', { count: 'exact', head: true })` pattern already used in `getCarelinTabCounts` (`lib/queries/carelin.ts:142`).

```ts
const [
  eventsThis,
  eventsPrev,
  bookingsThis,
  bookingsPrev,
  carelinOpen,
  carelinNewThis,
  pshareTotal,
  pshareNewThis,
] = await Promise.all([
  db
    .from("events")
    .select("*", { count: "exact", head: true })
    .is("tag", null)
    .gte("starts_at", thisStart)
    .lt("starts_at", thisNext),
  db
    .from("events")
    .select("*", { count: "exact", head: true })
    .is("tag", null)
    .gte("starts_at", prevStart)
    .lt("starts_at", prevNext),
  db
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("starts_at", thisStart)
    .lt("starts_at", thisNext),
  db
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("starts_at", prevStart)
    .lt("starts_at", prevNext),
  db
    .from("carelin_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "open"),
  db
    .from("carelin_requests")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thisStart)
    .lt("created_at", thisNext),
  db
    .from("pshare_posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published"),
  db
    .from("pshare_posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", thisStart)
    .lt("published_at", thisNext),
]);
```

Eight queries, not six (one of the brainstorming options collapsed two — final design uses eight). Any `.error` short-circuits with `throw new Error(...)` matching the convention in `lib/queries/events.ts`. Counts are coerced with `?? 0`.

### Returned KPI shape

`AdminKpi` (unchanged):

```ts
type AdminKpi = {
  label: string;
  th: string;
  num: string;
  delta: { kind: "up" | "down" | "flat"; text: string };
};
```

The four returned cards:

| #   | `label`                 | `th`              | `num`          | `delta.kind`                                                       | `delta.text`                                                                      |
| --- | ----------------------- | ----------------- | -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | `Events · this month`   | `กิจกรรมเดือนนี้` | `eventsThis`   | `up` if `eventsThis > eventsPrev`, `down` if `<`, `flat` if `=`    | `▲ N vs <PrevMonthAbbr>` / `▼ N vs <PrevMonthAbbr>` / `— same as <PrevMonthAbbr>` |
| 2   | `Bookings · this month` | `การจองเดือนนี้`  | `bookingsThis` | same logic as #1                                                   | same shape as #1                                                                  |
| 3   | `Carelin · open`        | `Carelin ค้างตอบ` | `carelinOpen`  | always `flat` (backlog growth shouldn't render as "good/up green") | `▲ N new this month` if `carelinNewThis > 0`, else `— none this month`            |
| 4   | `P-Share · published`   | `เผยแพร่แล้ว`     | `pshareTotal`  | always `flat` (cumulative total has no "down" meaning)             | `▲ N published this month` if `pshareNewThis > 0`, else `— none this month`       |

`num` is formatted with `.toLocaleString("en-US")` for ≥1,000 (matches `"2,184"` in the existing static data).

### Why the asymmetric delta semantics

Events and bookings are naturally month-bucketed — a "vs last month" comparison is meaningful and matches the existing visual idiom (`"▲ 12 vs Apr"`).

Open carelines and total published P-Share posts are **running totals**, not month buckets. Comparing them to "their value last month" requires either snapshotting (out of scope) or comparing apples to oranges. Instead the delta surfaces a secondary live count — "new activity this month" — which is informative without making a comparison claim.

Both #3 and #4 are pinned to `flat` so the badge stays cream rather than accidentally rendering open-backlog growth in `house-green` ("up" colors) or `house-pink` ("down" colors). That keeps the colored chips meaningful for the metrics where direction has obvious polarity.

### Empty month behavior

With "this month" computed from real `new Date()` (current date in the project is 2026-05-17) and seed data clustered around May 2026, the live counts will be non-zero today. Once real time passes May 2026, counts will drop to zero until fresh data lands in the new month. This is the user-chosen behavior (Q1 in brainstorming) and is acceptable — the prototype is not expected to be browsed for months without new data.

### Concurrency, dynamism, caching

- Page is already dynamic (Supabase server client reads `cookies()`, which marks the route dynamic in Next 16).
- No `'use cache'` / `cacheLife()` — Phase 3 stays uncached per AGENTS.md.
- All eight counts run in a single `Promise.all`; round-trip cost is one DB hop.

## What changes, file by file

- `lib/queries/overview.ts` — **new**. ~80 lines including the query block, delta-text helpers, and `getOverviewKpis()`.
- `lib/queries/util.ts` — **add** exported `monthRange(year, month): { start: string; next: string }`.
- `lib/queries/events.ts` — **remove** local `monthRange`, import from `./util`.
- `lib/queries/siteConfig.ts` — **remove** `getOverviewKpis()` export and `import type { AdminKpi }` if unused after removal.
- `components/admin/cards/OverviewCards.tsx` — change `import { getOverviewKpis } from "@/lib/queries/siteConfig"` → `from "@/lib/queries/overview"`.
- `supabase/seed/siteConfig.ts` — remove the `overview_kpis` insert row (5 lines).
- `supabase/seed/data/admin-overview.ts` — remove the `ADMIN_KPIS` export (25 lines). Keep the rest of the file.

`site_config` table schema is unchanged. The leftover `overview_kpis` row in any existing seeded DB becomes harmless dead data; a re-seed (`npm run seed`) won't recreate it. No migration needed — the row is harmless.

## Risks

- **Seed re-runs**: an existing dev DB may keep an orphan `overview_kpis` row after pulling these changes. Harmless (nothing reads it), but worth a one-line note in the PR. Optional follow-up: explicit `DELETE FROM site_config WHERE key='overview_kpis'` in a migration; not required.
- **Type cleanup**: `AdminKpi` is still consumed (`PORTFOLIO_KPIS`, `CARELIN_DESK_KPIS`, the new function). No deletions needed.
- **Performance**: 8 `count(*)` queries with `head: true` are cheap (no row payload). Indexes already exist on `starts_at`, `status`, `created_at`, `published_at` (or, if not, the tables are small enough at prototype scale that it doesn't matter).

## Test plan

Manual, since the project has no automated tests:

- `npm run dev`, visit `/admin`, log in.
- Confirm the four KPI cards render with: live counts ≥ 0; correct TH/EN labels; correct delta badge color (`up`=green, `down`=pink, `flat`=cream) and text format.
- Run `npm run seed` and reload — counts reflect seeded data.
- Insert a new event in May 2026 via admin UI → reload → "Events · this month" increments and delta updates against April.
- Insert a carelin request via the public form → reload → "Carelin · open" increments and "▲ N new this month" updates.
- Publish a draft pshare post via admin UI → reload → "P-Share · published" increments.
- Confirm `npm run lint && npx tsc --noEmit` (or whatever the project uses) is clean.
