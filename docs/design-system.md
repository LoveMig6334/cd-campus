# CD Smart Campus — Design System

The visual language of the CD Smart Campus prototype. Use this when adding pages, components, or content so the app stays coherent.

## Identity

**Editorial zine meets school yearbook.** Bilingual Thai/English, dense layouts, hand-set serif headlines on cream paper, halftone dot patterns, and offset shadows that give the UI a printed feel. The brand mark (Chitralada 2026 wordmark) is the only complex visual asset — everything else is built from type, color, and a small set of geometric primitives.

## Color tokens

All tokens are defined in `app/globals.css` under `@theme` and consumed via Tailwind utilities (`bg-blue`, `text-yellow`, etc.).

| Token | Hex | Use |
| ----- | --- | --- |
| `--color-blue` | `#1E2EE4` | Primary brand accent. Buttons, headings, KPIs, blue text accents inside Thai headlines |
| `--color-blue-deep` | `#0A14A8` | Hover state for primary buttons |
| `--color-yellow` | `#F7E33A` | Secondary accent — offset shadows behind branded marks, highlight pills, ★ accents, "Selected" foreground |
| `--color-ink` | `#15151A` | Primary text + most borders |
| `--color-line` | `#1A1A1A` | Dedicated border color (visually identical to ink, kept separate for future tweaks) |
| `--color-cream` | `#F6F3E7` | Page background |
| `--color-cream-2` | `#EFEBD9` | Alternate cream for inset surfaces (page intro decoration, calendar greyed days) |
| `--color-paper` | `#FFFFFF` | Card / surface background |
| `--color-mute-100` | `#ECE9DC` | Faint surface tint, disabled bg |
| `--color-mute-200` | `#DAD6C4` | Dashed dividers |
| `--color-mute-300` | `#B7B4A6` | Muted strokes, "other month" calendar text |
| `--color-mute-500` | `#6C6A60` | Secondary body text, mono labels |
| `--color-mute-700` | `#2E2D27` | Primary body text on cream |
| `--color-house-green` | `#3FAE6C` | Green house, success status, "Answered" pill |
| `--color-house-purple` | `#8E5BD9` | Purple house, "Review" status |
| `--color-house-orange` | `#F2843B` | Orange house |
| `--color-house-pink` | `#E94D8F` | Pink house, **CD Carelin accent**, downward delta |

**Selection inversion.** Anything in a selected/active state inverts to `bg-ink text-yellow` (or `bg-blue text-yellow` for primary). Don't break this — it's the strongest visual signal in the system.

## Typography

| Family | Role | Notes |
| ------ | ---- | ----- |
| **Instrument Serif** (italic) | Display headlines, page titles, hero numbers, card titles | Always italic; weight 400 only |
| **IBM Plex Sans Thai** | Body Thai + English | Weights 300/400/500/600/700; covers Thai script |
| **IBM Plex Mono** | Labels, eyebrows, metadata, dates, status pills | Almost always uppercase + letter-spacing 0.1–0.22em |

**Pattern.** Pair a small mono eyebrow above an italic serif headline. Body text rides in IBM Plex Sans Thai. Never invert the roles.

**Bilingual rule.** Thai and English coexist on the page. Headline blocks usually pair them: Thai (display italic) on top, English (mono caps) on bottom — or vice versa, whichever reads better. Examples:

- `อังคารที่ 12 พฤษภาคม` + `Tuesday · 12 May 2026`
- `พี่แชร์ น้องชัวร์` + `P'share N'sure`
- `ปฏิทินกิจกรรม` + `Calendar`

Don't strip one of the two — the bilingualism is a brand feature, not duplication.

## Spacing & rhythm

- **Card padding:** 14–20px
- **Page padding (mobile):** 18px horizontal
- **Page padding (admin desktop):** 24px
- **Stack rhythm:** 10–14px between cards inside a list, 18–22px between sections
- **Section dividers:** thin line + small uppercase mono label centered or left-aligned (`★ Menu · เมนูหลัก ★`, `⚡ Latest News`)
- **Tile aspect:** 1:1 with banner footer

## Borders & shadows

- **Borders.** 1.5px solid `--color-line` (or `--color-ink`). Avoid thinner borders — the zine look depends on a hard edge. Cards may use 8–16px corner radius; avatars are 50%; everything else is square.
- **Offset shadows.** A defining brand element. `box-shadow: NpxNpx 0 var(--color-*)` with **no blur**. Common patterns:
  - Buttons: `4px 4px 0 var(--color-ink)`
  - Branded marks: `2px 2px 0 var(--color-yellow)`
  - Cards-with-emphasis: `5px 5px 0 var(--color-blue)`
  - Pink-tinted CTAs (Carelin): `4px 4px 0 var(--color-ink)` with pink fill
- **Hover lift.** `transform: translate(-2px, -2px)` and shadow grows by 1–2px.
- **Active press.** Shadow collapses to 0; element returns to baseline.

## Halftone patterns

Three reusable backgrounds, kept as global CSS utilities (because they use `radial-gradient`):

| Class | Pattern | Use |
| ----- | ------- | --- |
| `.halftone-bk` | Black radial dots, 7×7 | Default zine accent on tiles |
| `.halftone-bl` | Blue radial dots, 7×7 | Brand-tinted accent |
| `.halftone-soft` | Soft black dots, 6×6, lower opacity | Subtle background washes (page intros, hero corners) |

Apply on `__art` panels of menu tiles, hero cards, page-intro decorations. Never use as the sole background of a content area — they're texture, not surface.

## Component patterns

### Button

- **Primary.** `bg-blue text-white` italic display label, `4px 4px 0 ink` shadow. Hover lifts; active presses. Best for the single dominant action.
- **Secondary.** `bg-paper text-ink` 1.5px ink border, mono uppercase label. Smaller, recurring actions.
- **CTA-pink.** Same shape as primary but `bg-house-pink`. Reserved for Carelin "Post a request".

### Pill / status

1px ink border, mono caps, color-coded by status. Small (3px 8px padding).

| Variant | Bg | Use |
| ------- | -- | --- |
| `pill--ok` | green | "Sent", "Answered", "Published" |
| `pill--pend` | yellow | "Open", "Pending" |
| `pill--rev` | purple | "Review" |
| `pill--draft` | mute-200 | "Draft" |

### Card

- 1.5px line border, paper background, 14–20px padding.
- Optional `.card--accent` adds the 5px blue offset shadow for emphasis (use for the "active" / primary card on a page).
- Title block uses italic display + mono caps eyebrow side-by-side.

### Menu tile

- Square, 1.5px border, halftone art panel + colored banner footer.
- Banner: italic display label + uppercase mono subtitle (one line each).
- Hover: translate -2px, blue offset shadow.
- Optional ★ Sparkle SVG in a corner (`tl` or `tr`) for a hand-stamped feel.

### Halftone tag (hashtag chip)

- Mono lowercase text on cream background, 1px ink border, 3×6 padding.
- Used for P'share post tags. Tags lead with `#` and use `kebab-case`.

### Sparkle

- 4-pointed star SVG. Decorative accent — may overflow tile corners.
- Color variants: ink (default), yellow (with ink stroke), blue, pink.

### Pshare reader prose

A specialized `prose`-like style for Markdown bodies:

- `h2` — italic display, blue, 21px
- `p` — IBM Plex Sans Thai, 13.5px / 1.65
- `blockquote` — italic display, left blue border, paper background
- `strong` — colored blue
- `ul/ol` — 22px left indent, 4px between items
- `code` — IBM Plex Mono on cream background, 1px ink border

## Layout shells

### Phone (Student)

- 390×800 viewport, 44px corner radius
- 6px ink ring + 14px blue offset shadow that itself has an 8px ink ring
- 30px ink notch bar (time on left, dot indicators on right)
- Sticky header (`StudentHeader`) — date in EN+TH, bell button with badge
- Scrollable body (`m-body`) with 100px bottom padding for the floating bottom nav
- Bottom nav — 4 tabs after profile removal: Home, Calendar, Booking, Sport (grid `repeat(4, 1fr)`)

### Admin desktop

- 1440px max-width
- 240px sticky sidebar, paper bg, 5×5 ink offset shadow
- Main column: topbar (44px italic display title + actions slot), KPI strip (4 cards), content grid (2/1 ratio for the dashboard, 1.4/1 for the P'share Studio)
- Collapses to 220px sidebar at <1100px and stacks at <720px

## Voice & motifs

- **★** four-pointed star — section markers and ornament
- **⚡** — section dividers ("Latest News", "Public Board")
- **·** — separator inside mono lines (`12 May · Term 1 / Week 6`)
- **Hashtags** — lowercase with hyphens (`#math-olympiad`)
- **Dates** — Thai uses full month names; English allows abbreviations
- **Polite Thai forms** — student-facing copy uses warm second-person ("น้อง"), admin-facing uses neutral

## Iconography

Inline SVGs at 14–22px, stroke-width 1.8–2.5. Two-tone fills allowed (white + brand color). Avoid icon library imports until the count justifies it. Where possible, declare `viewBox="0 0 24 24"` and use `currentColor` for stroke/fill so utilities like `text-blue` cascade.

## Bilingual content checklist

When adding any page or component:

- [ ] Headline pairs Thai and English
- [ ] Eyebrow / label uses mono caps
- [ ] Body copy is in IBM Plex Sans Thai (handles both scripts)
- [ ] No string is English-only or Thai-only unless it's a code/identifier (e.g., `#math-olympiad`, `5-203`)
- [ ] Status pills, button labels, nav items all have a Thai equivalent surfaced somewhere on the page
