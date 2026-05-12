# CD Smart Campus — Next.js Migration Plan

## Goal

Move the editorial-zine prototype at `prototype/cd-smart-campus.html` into the Next.js 16 App Router workspace at `app/`. Split the two role views (Student mobile, Admin desktop) into routed pages backed by typed mock data, while preserving the visual language documented in [`design-system.md`](./design-system.md).

## Status (as of 2026-05-13)

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Foundation | ✅ shipped | |
| Phase 1 — Shells | ✅ shipped | |
| Phase 2 — Static page port | ✅ shipped (2a–2e) | |
| Phase 3 — Interactivity | **superseded by the Supabase migration** | Sub-phases 3a (auth foundation) / 3b (schema + RLS + seed) / 3c (read swap) / 3d (minimum write set) all shipped. See [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](./superpowers/specs/2026-05-12-supabase-migration-design.md) for the design + [`docs/superpowers/plans/2026-05-12-supabase-3d-writes.md`](./superpowers/plans/2026-05-12-supabase-3d-writes.md) for the most recent plan. |
| Phase 4 — P'share dynamic routes | **rolled into the new Phase 4** | `/student/pshare/[slug]` reader is tracked alongside the full write surface. |
| Phase 5 — Polish | **deferred** | Follows the full write surface. |

**Active phase:** Phase 4 — Full write surface. Wire every still-inert prototype button (bookings, portfolio CRUD, calendar edit/delete, sport-result recording, site_config editor, root-only carelin delete) to a Server Action. See [`docs/handoff.md`](./handoff.md) for the next-session briefing.

The original phased plan below remains as historical reference; the route map, directory layout, and visual-language sections are still accurate.

## Current state

- `prototype/cd-smart-campus.html` — ~6,940-line single-page mockup. Two top-level views (Student / Admin), 7 student pages, 7 admin pages, all in one file.
- `app/` — fresh `create-next-app` skeleton (`layout.tsx`, `page.tsx`, `globals.css`) with the Geist font and the create-next-app demo page.
- `docs/access_design/` — reference assets (`Profile.png`, `Bg.png`, `Menu.png`).

## Stack already installed

| Package | Version |
| ------- | ------- |
| next | 16.2.6 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| tailwindcss | ^4 (CSS-first via `@import "tailwindcss"` + `@theme`) |
| @tailwindcss/postcss | ^4 |
| typescript | ^5 |
| eslint | ^9 |
| eslint-config-next | 16.2.6 |

## Libraries to add

| Package | Version target | Why |
| ------- | -------------- | --- |
| `react-markdown` | ^10.1 | Render P'share post bodies. Works in both Server and Client components in React 19 / Next 16. |
| `remark-gfm` | ^4.0 | GitHub-flavored markdown extras (tables, strikethrough, task lists, autolinks) for P'share posts. |
| `clsx` | ^2.1 | Conditional class composition. |
| `tailwind-merge` | ^3.0 | Safe Tailwind class merging when components compose `className` props. Requires Tailwind 4. |

Install:

```bash
npm install react-markdown@^10 remark-gfm@^4 clsx@^2 tailwind-merge@^3
```

**Deferred** (not needed at the prototype-port stage; keep dependency surface small):
- `zod`, `react-hook-form` — only one form in scope (Carelin), plain `useState` + a tiny validator covers it.
- `date-fns`, `dayjs` — `Intl.DateTimeFormat` covers the bilingual date in the header.
- `lucide-react` — inline SVGs match the zine aesthetic; revisit if the icon count grows.
- `next-themes` — no dark/light toggle planned.
- `swr`, `@tanstack/react-query` — no client-side data fetching yet (mock data is static, imported into Server Components).

## Target architecture

### Route map

| URL | Page |
| --- | ---- |
| `/` | Landing — view toggle to `/student` or `/admin` |
| `/student` | Home (date header + 6-tile menu) |
| `/student/calendar` | Mobile calendar |
| `/student/sport` | Sport day live + leaderboard |
| `/student/booking` | Room booking |
| `/student/portfolio` | Senior portfolios |
| `/student/pshare` | P'share post grid |
| `/student/pshare/[slug]` | P'share post reader |
| `/student/carelin` | CD Carelin public board |
| `/admin` | Overview (KPIs + charts) |
| `/admin/calendar` | Admin calendar |
| `/admin/sport` | Sport day ops |
| `/admin/bookings` | Bookings management |
| `/admin/portfolio` | Portfolio review |
| `/admin/pshare` | P'share Studio (markdown editor) |
| `/admin/carelin` | Carelin Desk (request triage) |

Each role gets its own root layout (phone shell vs sidebar shell). Using literal directory names (`student/`, `admin/`) rather than route groups so the URLs are explicit and the two shells don't collide on shared child paths like `/calendar`.

### Directory layout

```
app/
  layout.tsx                # html + fonts + theme tokens
  page.tsx                  # landing view-toggle
  globals.css               # tailwind import + @theme + halftone utilities
  student/
    layout.tsx              # PhoneShell + StudentHeader + StudentBottomNav
    page.tsx                # /student home
    calendar/page.tsx
    sport/page.tsx
    booking/page.tsx
    portfolio/page.tsx
    pshare/
      page.tsx              # post grid + tag filter
      [slug]/page.tsx       # markdown reader
    carelin/page.tsx
  admin/
    layout.tsx              # AdminSidebar + AdminTopbar wrapper
    page.tsx                # /admin overview
    calendar/page.tsx
    sport/page.tsx
    bookings/page.tsx
    portfolio/page.tsx
    pshare/page.tsx         # studio
    carelin/page.tsx        # desk

components/
  layout/                   # shells, headers, navs
    PhoneShell.tsx
    StudentHeader.tsx
    StudentBottomNav.tsx    # 'use client' (active state via usePathname)
    AdminSidebar.tsx        # 'use client' (active state via usePathname)
    AdminTopbar.tsx
    PageHead.tsx
    BrandMark.tsx
  student/                  # student-only widgets
    HeroCard.tsx
    MenuTile.tsx
    MenuGrid.tsx
    SportHero.tsx
    BookingPeriodPicker.tsx # 'use client'
    PshareCard.tsx
    PshareReader.tsx        # server (renders markdown)
    TagChipRow.tsx          # 'use client'
    CarelinForm.tsx         # 'use client'
    CarelinCard.tsx         # mostly server; reply expander is a client child
  admin/                    # admin-only widgets
    KpiCard.tsx
    Card.tsx
    Pill.tsx
    StudioEditor.tsx        # 'use client'
    StudioPostList.tsx      # 'use client'
    CarelinTabs.tsx         # 'use client'
  ui/                       # role-agnostic primitives
    Halftone.tsx
    Sparkle.tsx
    Button.tsx
    Input.tsx

data/
  pshare-posts.ts
  carelin-requests.ts
  calendar-events.ts
  sport-leaderboard.ts
  bookings.ts
  portfolios.ts
  types.ts                  # shared TS types

lib/
  cn.ts                     # clsx + tailwind-merge wrapper
  date.ts                   # bilingual EN/TH date formatters (Intl)
  fonts.ts                  # next/font/google initialization
```

### Server vs Client boundaries

Default to **Server Components**. Add `'use client'` only at interactive leaves:

- `TagChipRow` — active chip
- `CarelinForm` — controlled inputs + 4-digit ID validation + Post-button enable
- `CarelinCard` reply-expand — extract the toggle into a small client child so the card itself stays server
- `StudioEditor` — controlled textarea + tag preview
- `StudioPostList` — active row
- `CarelinTabs` — active filter
- `BookingPeriodPicker` — active period card
- `StudentBottomNav` / `AdminSidebar` — active state derived from `usePathname()`

Pass server-rendered children as `props.children` into client wrappers wherever possible — keeps the rendering tree mostly server-side.

### Tailwind 4 theme tokens

Migrate the prototype's CSS variables to `@theme` in `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-blue: #1e2ee4;
  --color-blue-deep: #0a14a8;
  --color-yellow: #f7e33a;
  --color-ink: #15151a;
  --color-line: #1a1a1a;

  /* Surface */
  --color-cream: #f6f3e7;
  --color-cream-2: #efebd9;
  --color-paper: #ffffff;

  /* Greys */
  --color-mute-100: #ece9dc;
  --color-mute-200: #dad6c4;
  --color-mute-300: #b7b4a6;
  --color-mute-500: #6c6a60;
  --color-mute-700: #2e2d27;

  /* Houses + status */
  --color-house-green: #3fae6c;
  --color-house-purple: #8e5bd9;
  --color-house-orange: #f2843b;
  --color-house-pink: #e94d8f;

  /* Type */
  --font-display: var(--font-instrument-serif), "IBM Plex Sans Thai", serif;
  --font-sans: var(--font-ibm-plex-thai), "IBM Plex Sans", system-ui,
    sans-serif;
  --font-mono: var(--font-ibm-plex-mono), ui-monospace, monospace;
}

/* halftone backgrounds — kept as global utilities since they use radial-gradients */
.halftone-bk { ... }
.halftone-bl { ... }
.halftone-soft { ... }
```

Then use Tailwind utilities like `bg-blue text-yellow font-display italic` directly. No `tailwind.config.js` is needed — Tailwind 4 is fully CSS-first.

### Fonts

Set up in `lib/fonts.ts` and apply in `app/layout.tsx`:

```ts
import { Instrument_Serif, IBM_Plex_Sans_Thai, IBM_Plex_Mono } from "next/font/google";

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
});

export const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
```

Apply all three font CSS variables on `<html className={...}>` in the root layout.

## Phases

Each phase is a discrete PR with explicit exit criteria. Don't start a phase until the previous one ships.

### Phase 0 — Foundation (1 PR)

- Replace the create-next-app demo `app/page.tsx` with a real landing page (placeholder is fine, link to `/student` and `/admin`).
- Add `lib/fonts.ts`, swap Geist out, wire Instrument Serif + IBM Plex Sans Thai + IBM Plex Mono into the root layout.
- Move zine palette into `app/globals.css` `@theme` block.
- Add halftone utility classes (`.halftone-bk`, `.halftone-bl`, `.halftone-soft`).
- `npm install react-markdown remark-gfm clsx tailwind-merge`.
- Add `lib/cn.ts` helper.
- Update root metadata: `title: "CD Smart Campus — Chitralada 2026"`.
- Drop `Profile.png` into `public/brand/profile.png`; build a `BrandMark` component using `next/image`.
- Set `<html lang="th">` (matching the prototype).

**Exit criteria:** `npm run dev` boots; `/` shows a placeholder with the zine fonts and tokens applied; light a Tailwind class like `bg-blue` to confirm tokens resolve.

### Phase 1 — Shells (1 PR)

- Build `components/layout/PhoneShell.tsx` (notch, bezel, scrollable screen).
- Build `components/layout/StudentHeader.tsx` (date in EN+TH, bell with badge).
- Build `components/layout/StudentBottomNav.tsx` (4 tabs, active from `usePathname`).
- Build `components/layout/AdminSidebar.tsx` (7 nav items, sticky, active from `usePathname`).
- Build `components/layout/AdminTopbar.tsx` (title block + actions slot).
- Build `app/page.tsx` landing with two big linkable cards.
- Build `app/student/layout.tsx` and `app/admin/layout.tsx`.
- Stub each child page with a placeholder card so the nav has destinations.

**Exit criteria:** Both shells render; clicking a tab navigates without full reload; active state highlights correctly; no layout shifts.

### Phase 2 — Static page port (~2-3 PRs)

Port one section per PR, preserving prototype markup pattern-by-pattern:

- 2a — Student Home (`HeroCard`, `MenuGrid`, `MenuTile`).
- 2b — Student Calendar + Sport + Booking (read-only).
- 2c — Student Portfolio + P'share grid + Carelin board (read-only).
- 2d — Admin Overview + Calendar + Sport.
- 2e — Admin Bookings + Portfolio + Carelin Desk (read-only table).

Mock data lives in `data/*.ts`, typed via `data/types.ts`. Pages are Server Components and import data directly.

**Exit criteria:** All 14 pages reachable via nav, visual parity with the prototype, no client JS yet.

### Phase 3 — Interactivity (1 PR)

Wrap interactive widgets in `'use client'`:

- `TagChipRow` active chip
- `CarelinForm`: name + 4-digit ID validation, Post button enable, numeric-only ID strip
- `CarelinCard` reply-expand toggle
- `StudioEditor` + `StudioPostList` active row
- `CarelinTabs` active filter
- `BookingPeriodPicker` active period

**Exit criteria:** All prototype interactions reproduced, no console errors, no hydration mismatches.

### Phase 4 — P'share dynamic routes (1 PR)

- `data/pshare-posts.ts` returns posts with `{ slug, title, body, author, tags, publishedAt }`.
- `app/student/pshare/page.tsx` — Server Component renders the post grid; cards link to `/student/pshare/[slug]`.
- `app/student/pshare/[slug]/page.tsx` — Server Component reads post by slug, renders body via `react-markdown` + `remark-gfm`.
- Custom `components` map for Markdown — `h1/h2/blockquote/strong` styled to match the zine reader.
- `notFound()` if slug missing.
- Per-post `generateMetadata({ params })`.

**Exit criteria:** Click a card → arrive at `/student/pshare/<slug>` with the body rendered; bad slug returns 404.

### Phase 5 — Polish (1 PR)

- `loading.tsx` per route group (skeleton matching the shell).
- `not-found.tsx` (mobile + desktop variants).
- `error.tsx` per role group.
- Per-page metadata.
- Responsive admin (collapse sidebar at <1100px to match prototype's media query; stack at <720px).
- Update favicon → BrandMark.
- A11y pass: focus rings, `aria-label` on icon buttons, semantic heading order.

## Out of scope (later phases)

Most items below have since shipped — annotated with their phase. The Supabase migration spec (`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`) owns the current "out of scope" list for Phases 3+.

- ~~Real authentication / RBAC for student vs admin~~ — ✅ Phase 3a (admin-only Supabase Auth; students remain anonymous by design).
- ~~A backend (REST or DB)~~ — ✅ Phase 3b/3c (Postgres + RLS, all reads through `lib/queries/`).
- ~~Server Actions for form submission~~ — ✅ Phase 3d for the minimum write set; Phase 4 fills in the rest.
- i18n routing — content stays bilingual hard-coded (still deferred).
- Markdown body storage — solved by 3d: P'share `body_md` lives in Postgres; the reader UI is on Phase 4's list.
- Supabase Realtime + Storage — deferred to Phase 5+.

## Open questions to resolve before Phase 1

1. **Landing & view toggle.** The prototype's "Student/Mobile · Admin/Desktop" toggle lives in the sticky top bar across both views. Keep it on every page, or only on `/`? Recommendation: `/` landing only, with a smaller "Switch view" link in each shell's footer.
2. **Profile system.** Removed from the prototype. Confirm it stays out of the migration.
3. **Brand assets.** Are `Bg.png` and `Menu.png` going to ship in the app? If yes, where?
4. **Notification badge "3".** The bell shows a static `3` in the prototype. Keep it static for now, or wire it to a notifications mock?
