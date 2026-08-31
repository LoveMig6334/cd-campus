# Basketball Players + LED Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-player fouls/points and timeouts for basketball, and a classic LED-style hall board used only for basketball.

**Architecture:** A `match_players` table joined into `MatchView`; score/foul events optionally credit a player inside the existing `apply_match_event` RPC (atomic, undoable). Timeouts and the last player foul live on the match row. The hall display switches to a new `BasketballBoard` component for timed sports, drawing digits as seven-segment SVG.

**Tech Stack:** Next 16 / React 19 / Tailwind 4 / Supabase / vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-basketball-players-led-board-design.md`

## Global Constraints

- `AGENTS.md` conventions (RSC by default, `cn()`, no Zod, Server Action shapes, no caching).
- Engine stays pure; volleyball/badminton unchanged; classic console must compile.
- Attribution optional; 5 on-court max, roster 12 max; player fouls cap at 5 (fouled out); T.O.L. 2 / 3 / 1 (first half / second half / OT).
- Verify with `npm test`, `npx tsc --noEmit`, `npm run lint`, `next build`.

---

### Task 1: Engine helpers

**Files:** `lib/sport/rules.ts`, `lib/sport/rules.test.ts`

**Produces:** `PLAYER_FOUL_LIMIT`, `ON_COURT_MAX`, `ROSTER_MAX`, `type MatchPlayer`, `onCourt(players, team)`, `bench(players, team)`, `isFouledOut(p)`, `timeoutsForPeriod(format, periodIndex)`.

- [ ] Test: `onCourt` returns only on-court players of that team sorted by number; `bench` the rest; `isFouledOut` at 5; `timeoutsForPeriod(BB4_7, 1..2) === 2`, `(3..4) === 3`, `(5) === 1`; for `bestOf: 2` second half starts at period 2.
- [ ] Implement:

```ts
export const PLAYER_FOUL_LIMIT = 5;
export const ON_COURT_MAX = 5;
export const ROSTER_MAX = 12;
export type MatchPlayer = { id: string; team: TeamKey; number: number; name: string | null; fouls: number; points: number; onCourt: boolean };
const byNumber = (a: MatchPlayer, b: MatchPlayer) => a.number - b.number;
export function onCourt(players: MatchPlayer[], team: TeamKey) { return players.filter(p => p.team === team && p.onCourt).sort(byNumber); }
export function bench(players: MatchPlayer[], team: TeamKey) { return players.filter(p => p.team === team && !p.onCourt).sort(byNumber); }
export function isFouledOut(p: MatchPlayer) { return p.fouls >= PLAYER_FOUL_LIMIT; }
export function timeoutsForPeriod(format: MatchFormat, periodIndex: number): number {
  if (periodIndex > format.bestOf) return 1;
  return periodIndex > Math.floor(format.bestOf / 2) ? 3 : 2;
}
```

- [ ] `npm test` green; commit `feat: player and timeout helpers in the match engine`.

### Task 2: Migration 0016 + types

**Files:** `supabase/migrations/0016_players_timeouts.sql`, `lib/supabase/database.types.ts`

- [ ] Write the migration per spec: table + RLS + realtime + `timeouts`/`last_player_foul` columns + `apply_match_event` replaced with `p_player_id uuid, p_player_points integer, p_player_fouls integer` appended. Timeouts rule in SQL:

```sql
timeouts = case
  when p_type::text = 'start' then '{"a":2,"b":2}'::jsonb
  when p_type::text = 'end_set' and p_current_set > v_match.best_of then '{"a":1,"b":1}'::jsonb
  when p_type::text = 'end_set' and p_current_set = v_match.best_of / 2 + 1 then '{"a":3,"b":3}'::jsonb
  else timeouts end
```

Player update (before the match update): `update match_players set points = greatest(0, points + coalesce(p_player_points,0)), fouls = greatest(0, fouls + coalesce(p_player_fouls,0)) where id = p_player_id and match_id = p_match_id returning * into v_player;` and when `p_player_fouls > 0`: `v_last_foul := jsonb_build_object('team', v_player.team, 'number', v_player.number, 'fouls', v_player.fouls, 'at', now())`.

- [ ] `npx supabase db push` → `npm run gen:types` → commit `feat: migration 0016 — match players, timeouts, last player foul`.

### Task 3: MatchView + queries

**Files:** `lib/types.ts`, `lib/queries/matches.ts`

- [ ] `MatchView` += `players: MatchPlayer[]; timeouts: TeamCounts; lastPlayerFoul: { team: TeamKey; number: number; fouls: number; at: string } | null;`
- [ ] `MATCH_SELECT` += `, players:match_players(id, team, number, name, fouls, points, on_court)`; map + sort by number; parse `timeouts` with `parseCounts`; `last_player_foul` validated loosely (null on malformed).
- [ ] `tsc` clean except actions/hook/UI; commit `feat: players, timeouts and last foul on MatchView`.

### Task 4: Server actions

**Files:** `app/admin/scoreboard/actions.ts`

- [ ] `ComputedEvent` += `player?: { id: string; points: number; fouls: number }`; RPC call passes `p_player_id`, `p_player_points`, `p_player_fouls` (null/0 when absent).
- [ ] `scorePoint(..., playerId?: string)`: validate the player belongs to `m.players` and to `team`; payload `{ team, delta, playerId, before, after }`; `player: { id, points: delta, fouls: 0 }`.
- [ ] `recordFoul(..., playerId?: string)`: reject when `isFouledOut(player) && delta > 0` → `"#N has fouled out"`; `player: { id, points: 0, fouls: delta }`.
- [ ] `undoLast`: read `payload.playerId`/`delta`/`type`; pass negated `player` deltas; undo payload records them too.
- [ ] New: `addPlayer(matchId, team, number, name)` (roster ≤ 12, number 0–99, unique → friendly error), `removePlayer(matchId, playerId)`, `setOnCourt(matchId, playerId, onCourt)` (≤ 5 on court), `setTimeouts(matchId, team, value)` (0–9). Each: `requireAdmin`, direct table write, `revalidateSurfaces()`, return fresh `MatchView`.
- [ ] `tsc`; commit `feat: player-credited scoring, roster and timeout actions`.

### Task 5: Controller hook

**Files:** `components/admin/useMatchController.ts`

- [ ] State `selectedPlayer` (id | null). `tapScore`/`tapFoul` capture it, pass to the action, predict `players` (map: matching id → `points + delta` / `fouls + delta`, floored) and clear it. Guard: fouled-out player can't be selected for a foul (chip disabled in UI; hook ignores).
- [ ] `tapTimeout(team)` → `setTimeouts(view.id, team, max(0, view.timeouts[team] − 1))` with optimistic predict; `adjustTimeouts(team, delta)` clamps 0–9.
- [ ] `addPlayer`, `removePlayer`, `toggleOnCourt` → `dispatch(null, …)`.
- [ ] Export `selectedPlayer`, `selectPlayer`, `timeouts`, taps; commit `feat: player selection, timeouts and roster taps in the controller`.

### Task 6: Console UI

**Files:** `components/console/ConsoleMatch.tsx`, new `components/console/ConsoleRoster.tsx`

- [ ] Jersey chips (on-court, sorted) above the scoring buttons for timed sports: `#number`, name, `FL n · PTS n`; selected → marine fill; fouled out → dimmed + "OUT", not selectable.
- [ ] T.O.L. block next to fouls: big number, "Timeout" button (disabled at 0), tiny +/−.
- [ ] `ConsoleRoster`: `<details>`-style collapsible panel "Roster · ผู้เล่น" with two columns (team A / team B): rows (number, name, on-court checkbox → `toggleOnCourt`, FL, PTS, ✕ remove) + add row (number input, name input, Add). Errors surface through the shared `c.error` banner.
- [ ] Format/lint; commit `feat: jersey chips, timeouts and roster editor in the console`.

### Task 7: LED board

**Files:** new `components/scoreboard/LedDigits.tsx`, new `components/scoreboard/BasketballBoard.tsx`, `components/scoreboard/ScoreboardDisplay.tsx`

- [ ] `LedDigits`: seven-segment map for 0–9, space and colon; `<Led value color h />` renders one SVG per glyph (viewBox 0 0 60 100, segments as rounded polygons; unlit `opacity .08`; lit colour with `drop-shadow` glow). Colours: red `#ff3b30`, amber `#ffb020`, green `#39ff6a`.
- [ ] `BasketballBoard({ match, now })`: layout per spec; uses `onCourt`, `shotClockRemaining`, `displayClockSeconds`, `periodLabel` (period digit = `currentSet` for regulation, "OT" text for overtime), `lastPlayerFoul` shown while `now − at < 15 s`.
- [ ] `ScoreboardDisplay`: `isTimed(config) ? <BasketballBoard …/> : <MatchScreen …/>` where the match screen is rendered (keep splashes/idle).
- [ ] Format/lint/build; commit `feat: led-style basketball hall board with player panels`.

### Task 8: Wrap-up

- [ ] `RealtimeRefresh` on `/console/match` also listens to `match_players`.
- [ ] `npm test && npx tsc --noEmit && npm run lint && npx next build`.
- [ ] Update `AGENTS.md` console note (one clause) and memory; commit.

## Self-review

Spec sections → tasks: data → 2; engine → 1; types/queries → 3; actions → 4; hook → 5; console → 6; display → 7; verification → 8. Names consistent: `onCourt`, `isFouledOut`, `timeoutsForPeriod`, `selectedPlayer/selectPlayer`, `tapTimeout/adjustTimeouts`, `addPlayer/removePlayer/setOnCourt/toggleOnCourt`, `setTimeouts`, `lastPlayerFoul`.
