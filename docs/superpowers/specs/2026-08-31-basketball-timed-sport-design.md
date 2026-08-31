# Basketball (FIBA-style timed sport) — design

**Date:** 2026-08-31
**Status:** approved
**Scope:** add basketball to the live match system, managed from the New UI (`/console`), shown on the hall display (`/scoreboard`).

## Requirements (from the user)

- Basketball, FIBA-style: 4 quarters × 7 minutes.
- Score with +1 / +2 / +3 (and a −1 correction).
- Show team fouls per team. Fouls are **cumulative for the whole game** (no per-quarter reset).
- Board shows: HOME/GUEST totals, game clock, PERIOD, FOULS (reference: classic LED scoreboard).
- Tied after Q4 → **overtime periods of 5 minutes**, repeated until decided. "End competition" stays disabled while tied.
- Quarter clock **counts down and holds at 0:00** until the referee presses *End quarter*. Scoring/fouls stay open at 0:00 (free throws after the buzzer).
- Only the New UI gets basketball controls; the classic `/admin/scoreboard` console must not break.

## Approach

Sport **kind** discriminator inside the existing event-sourced model. Basketball reuses:

| Existing concept | Basketball meaning |
| --- | --- |
| `matches.sets` jsonb (`[{a,b}]`) | periods, current last; OT periods appended |
| `matches.current_set` | current period (1-based) |
| `matches.best_of` | regulation period count (4) |
| `matches.points_to_win` | unused (kept at column default) |
| `end_set` event | *end period* |
| `timer_seconds` / `timer_started_at` | game clock (unchanged accumulation) |

New per-match data: `period_minutes`, `fouls`, `period_started_seconds`.

Rejected: a separate basketball table/engine (duplicates RPC, undo, realtime, history, display), and stuffing fouls/minutes into the `sets` jsonb (cumulative fouls don't belong per period; no per-match period length).

## 1. Engine — `lib/sport/rules.ts`

Pure, shared client + server, unchanged for volleyball/badminton.

```ts
type SportKind = "sets" | "timed";
type SportId = "volleyball" | "badminton" | "basketball";

type SportConfig =
  | { kind: "sets"; id; labelEn; labelTh; nextSetFirstServer; defaultBestOf; defaultPointsToWin }
  | { kind: "timed"; id; labelEn; labelTh; defaultPeriods: 4; defaultPeriodMinutes: 7;
      overtimeMinutes: 5; pointSteps: readonly [1, 2, 3]; foulBonusAt: 5 };

type ScoreState = { sets: SetScore[]; currentSet: number; serving: TeamKey; fouls: { a: number; b: number } };
type MatchFormat = { bestOf: number; pointsToWin: number; periodMinutes: number | null };
type PointDelta = 1 | 2 | 3 | -1;
```

- `initialState()` → `fouls: {a:0,b:0}`.
- `isValidFormat(kind, f)`: sets → odd 1–9 + points 1–99 (as today); timed → `bestOf` 1–12 integer, `periodMinutes` 1–60 integer.
- `applyPoint(state, team, delta: PointDelta)`: −1 floored at 0 (noop); +n sets `serving = team` (ignored by timed UIs).
- `applyFoul(state, team, delta: 1 | -1)`: −1 floored at 0 (noop); fouls are game-cumulative.
- `endCurrentPeriod(config, format, state)` (replaces `endCurrentSet`):
  - sets kind: existing rules (tied → `tied`; last set → `last_set`; else open next set, serving per rule).
  - timed kind: `currentSet < bestOf` → open next period (tied OK); `currentSet >= bestOf` and tied → append an **OT** period; not tied → `last_set` (end the competition instead). Result carries `setWonBy: TeamKey | null`.
- `totalPoints(state)` → `{a,b}` summed across all periods.
- `matchWinner` / `leaderForEarlyEnd` take the config: timed → total-points leader (null when tied); sets → unchanged.
- `deriveFlags` for timed → `{ deuce: false, setPoint: null, matchPoint: null }`.
- `periodLengthSeconds(config, format, periodIndex)` → regulation `periodMinutes*60`, OT `overtimeMinutes*60`.
- `periodRemainingSeconds(config, format, match, now)` → `max(0, length − (timerSeconds + running − periodStartedSeconds))`. Clamped at 0 (holds).
- `periodLabel(config, format, periodIndex)` → `Q1…Qn`, `OT`, `OT2`…; sets kind → `Set n`.
- `isTimed(config)` helper.

Tests (vitest, `lib/sport/rules.test.ts`): format validation per kind; +1/+2/+3/−1; fouls floor; period ending incl. tied quarter, OT append, last-period-not-tied rejection; total-points winner; countdown clamp and OT length; labels; existing set-sport tests unchanged.

## 2. Migration — `supabase/migrations/0014_timed_sports.sql`

```sql
alter type match_event_type add value if not exists 'foul';

alter table matches
  drop constraint matches_best_of_check,
  add constraint matches_best_of_check check (best_of between 1 and 12),
  add column period_minutes smallint check (period_minutes between 1 and 60),
  add column fouls jsonb not null default '{"a":0,"b":0}'::jsonb,
  add column period_started_seconds integer not null default 0;
```

(The odd-only rule moves to TS for set sports.) The actual constraint name is confirmed against the live schema during implementation.

`apply_match_event` is replaced (new signature adds `p_fouls jsonb`):

- Clock is driven by **status**, not event type: after the update, `timer_started_at` is `now()` when `p_status = 'live'` and it was null; when `p_status <> 'live'` and it was running, `timer_seconds += elapsed` and `timer_started_at := null`. Equivalent for existing events (start/resume → live, pause/finish/cancel → not live). Undo keeps status, so no clock change.
- On `end_set`: `period_started_seconds := timer_seconds` **after** the accumulation above (the action sends `paused` status for timed sports so the clock is stopped at that moment; for set sports status stays `live` and the offset is harmless).
- `last_score_event_id` set for `score`, `end_set`, `foul`; cleared by `undo`.
- `fouls := p_fouls`; other columns as before.

Old function signature is dropped. `0013` is still unpushed; both ship together.

## 3. Server actions, query, types

- `lib/types.ts` `MatchView` += `fouls`, `periodMinutes: number | null`, `periodStartedSeconds`.
- `lib/queries/matches.ts` parses the new columns (`fouls` validated like `sets`).
- `app/admin/scoreboard/actions.ts`:
  - `scorePoint(..., delta: PointDelta)`.
  - new `recordFoul(matchId, eventId, team, delta: 1 | -1)` → `foul` event with `{team, delta, before, after}`; requires `live`.
  - `endSet` → uses `endCurrentPeriod`; for timed sports the resulting status is `paused`. Error copy: sets tied / last-set as today; timed last period not tied → "Final period — end the competition instead".
  - `endMatch` uses config-aware `leaderForEarlyEnd`.
  - RPC call passes `p_fouls`.
  - `createMatch`: reads `period_minutes` for timed sports, validates with `isValidFormat(kind, …)`, inserts `period_minutes` (null for set sports) and `points_to_win` default for timed.
  - Undo snapshot: `payload.before` now includes `fouls`; old events without `fouls` are normalised to `{a:0,b:0}` on read.

## 4. Controller hook — `components/admin/useMatchController.ts`

- Exposes `kind`, `tapScore(team, delta: PointDelta)`, `tapFoul(team, ±1)`, `tapEndPeriod` (was `tapEndSet`; keep the old name as alias for the classic console), `periodLabel`, `periodClock` (mm:ss countdown for timed; elapsed for sets), `total`, `canEndPeriod` (timed: live and (not last period, or tied); sets: as today), `nextPeriodIsOvertime`.
- `endWinner` and `majority` become kind-aware via the engine.
- After a timed `end_set` the predicted status is `paused`; the console's resume button reads "▶ Start Q2".

## 5. New UI — `/console`

- **Create form** (`ConsoleCreateForm`): small client field-group that switches on the selected sport — set sports keep *Best of / Points per set*; timed sports show *Periods* (default 4, 1–12) and *Minutes per period* (default 7, 1–60). Hidden fields ensure both variants post cleanly.
- **Match screen** (`ConsoleMatch`), timed variant:
  - Team panel: total score (large), `+1 / +2 / +3` primary buttons, `−1 correction`, **Fouls** counter with `+ foul` / `−` buttons; foul count turns red with "BONUS" badge at ≥ `foulBonusAt`. No serving dot.
  - Status strip: "4 × 7 min" (+ OT note), period badge (Q2 / OT).
  - Centre rail: countdown clock (large, red-ish tone when 0:00), pause/resume ("▶ Start Q3" after a period end), **End quarter** (label "Overtime · ต่อเวลา" when it would open OT), **End competition** (disabled when tied), Undo.
  - Per-period strip Q1…Q4 (+OT) with a:b.
- **Classic console** (`MatchConsole`): for timed sports render a banner "Basketball is managed in the New UI → /console/match" and hide scoring/end-set buttons; start/pause/finish stay. `MatchCreateForm` (classic) lists only set sports.

## 6. Hall display — `/scoreboard`

`MatchScreen` branches on kind. Timed layout (reference image):

- Header eyebrow unchanged; centre shows the **countdown** (holds at 0:00) instead of elapsed time; finished header "Final · 54–48".
- Team panels: name, big total (`Roll`), and a **FOULS** block (mono caps label + green digits, red at bonus).
- Centre rail: **PERIOD** label + big `Q2` / `OT`; paused chip as today. No deuce/set-point chips.
- Footer strip: one column per regulation period plus any OT periods, `a:b` each.
- Winner splash: `54–48` total instead of sets line.

History (`/console/history`, `/admin/scoreboard` list) shows `54–48` + per-period breakdown for timed sports; `Sets n–m` for set sports.

## 7. Out of scope

Player fouls, possession arrow, shot clock, timeouts, sound/buzzer, per-quarter foul reset.

## 8. Verification

- `npm test` (vitest engine suite), `npx tsc --noEmit`, `npm run lint`.
- Migration applied via Supabase CLI/SQL editor by the user (0013 + 0014); `npm run gen:types` output committed.
- Manual walkthrough by the user (no admin credentials in the agent environment): create basketball match → start → +2/+3/fouls → End quarter → Start Q2 → … → tied Q4 → Overtime → End competition; kiosk mirrors each step.
