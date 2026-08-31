# Basketball LED board + per-player stats — design

**Date:** 2026-08-31 · **Status:** approved · **Builds on:** `2026-08-31-basketball-timed-sport-design.md` (kind `timed`, migrations 0014/0015).

## Requirements (from the user, with the choices they made)

- The hall board for basketball looks like a classic LED gym scoreboard (reference photo): left/right player panels `PLY · FL · PTS`, centre game clock, team names, PERIOD, big scores, FOULS and T.O.L. per side, PLAYER FOUL in the middle, `SCORE · MATCH · SCORE` labels. Distinct theme **only for basketball**.
- Per-player fouls and points, tracked per match.
- Attribution is **optional**: tap a jersey chip, then +1/+2/+3 or foul → credited to that player and to the team; nothing selected → team only.
- Board shows **5 on-court** players per team (roster up to 12; on-court flag switched in the console).
- **T.O.L.** (timeouts left) per team, counting down: FIBA 2 first half, 3 second half, 1 per OT; manual "Timeout" tap, ± correction.

## Data — migration `0016_players_timeouts.sql`

```sql
create table match_players (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  team       text not null check (team in ('a','b')),
  number     smallint not null check (number between 0 and 99),
  name       text,
  fouls      smallint not null default 0 check (fouls >= 0),
  points     smallint not null default 0 check (points >= 0),
  on_court   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, team, number)
);
-- RLS: select anon+authenticated; all for authenticated where is_admin(). Realtime: add table.
alter table matches
  add column timeouts jsonb not null default '{"a":2,"b":2}'::jsonb,
  add column last_player_foul jsonb;   -- {team, number, fouls, at}
```

`apply_match_event` (replaced; new trailing params `p_player_id uuid, p_player_points integer, p_player_fouls integer`):
- if `p_player_id` is not null: `update match_players set points = greatest(0, points + p_player_points), fouls = greatest(0, fouls + p_player_fouls) where id = p_player_id and match_id = p_match_id`; when `p_player_fouls > 0` also set `last_player_foul = {team, number, fouls (after), at: now()}`.
- `timeouts`: `start` → `{2,2}`; `end_set` entering period `best_of/2 + 1` → `{3,3}`; `end_set` entering a period `> best_of` → `{1,1}`; otherwise unchanged. (Set sports never read it.)
- Everything else as 0015.

Roster CRUD, on-court toggle and timeout corrections are direct table writes through the admin RLS policy (not events).

## Engine (`lib/sport/rules.ts`)

- `PLAYER_FOUL_LIMIT = 5`, `ON_COURT_MAX = 5`, `ROSTER_MAX = 12`.
- `type MatchPlayer = { id; team: TeamKey; number; name: string | null; fouls; points; onCourt: boolean }`.
- `onCourt(players, team)` → on-court players of a team sorted by number (max 5). `bench(players, team)` → the rest.
- `timeoutsForPeriod(format, periodIndex)` → 2 / 3 / 1 (mirrors the RPC; used for hints/tests).
- `isFouledOut(p)` → `p.fouls >= PLAYER_FOUL_LIMIT`.

## Types / queries

- `MatchView` += `players: MatchPlayer[]`, `timeouts: TeamCounts`, `lastPlayerFoul: { team; number; fouls; at } | null`.
- `lib/queries/matches.ts`: every `MatchView` read also selects `match_players(*)` via the FK embed (`players:match_players(...)`) and maps it; ordered by number.

## Server actions (`app/admin/scoreboard/actions.ts`)

- `scorePoint(matchId, eventId, team, delta, playerId?: string)` / `recordFoul(..., playerId?)`: payload gains `playerId`, `playerPoints`/`playerFouls`; RPC receives the player deltas. A foul on a fouled-out player is rejected (`"#7 has fouled out"`).
- `undoLast`: reads `playerId` + deltas from the undone event and passes the negations.
- `addPlayer(matchId, team, number, name)`, `removePlayer(matchId, playerId)`, `setOnCourt(matchId, playerId, onCourt)` (rejects a 6th on-court), `setTimeouts(matchId, team, value 0–9)` — all return `MatchActionResult` with the fresh match.

## Controller hook

- `selectedPlayer: string | null`, `selectPlayer(id | null)`; `tapScore`/`tapFoul` read the selection, pass `playerId`, predict the player's new stats optimistically, then clear the selection.
- `timeouts`, `tapTimeout(team)` (−1, floored), `adjustTimeouts(team, ±1)`.
- Roster taps: `addPlayer`, `removePlayer`, `toggleOnCourt` (no optimistic prediction — server round-trip, sub-second).

## Console UI

- `ConsoleMatch` (timed only): jersey chips above the scoring buttons (on-court players; fouled-out chips dimmed with "OUT"); a T.O.L. block beside the fouls block ("Timeout" button + ±).
- New `components/console/ConsoleRoster.tsx` (client): per team — table of players (number, name, on-court switch, FL, PTS, remove) + add form (number, name). Collapsible panel below the shot clock.

## Hall display — `components/scoreboard/BasketballBoard.tsx`

- `ScoreboardDisplay` renders `<BasketballBoard>` for `kind === "timed"` instead of `MatchScreen`; splashes/idle unchanged.
- Theme: board `#0f3b2a` (green) with `#101311` panels and thin light bezels; labels in mono caps white/amber; digits are seven-segment SVG (`components/scoreboard/LedDigits.tsx`: `<Led value="10:00" color="red" | "amber" | "green" h="…vh" />`, unlit segments at 8 % opacity, glow via `filter: drop-shadow`).
- Grid `[1fr_2.2fr_1fr]`: side panels list 5 on-court rows (`number` amber, `fouls` red, `points` red; empty rows unlit); centre: clock (red), team names row with PERIOD digit (amber) and SHOT clock (red, only when set), scores (amber, 3 digits), FOULS (red) + T.O.L. (amber) each side, PLAYER FOUL (number + fouls, red, shown 15 s after the last foul), bottom labels.
- States: scheduled → clock shows `07:00`, scores `0`; finished → "FINAL" replaces the clock; paused → "PAUSED" chip under the clock.

## Out of scope

Player names on the board (numbers only, like the photo), substitutions history, timeouts stopping the clock automatically, sounds for timeouts.

## Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `next build`; migration pushed with the CLI and types regenerated; browser walkthrough by the user.
