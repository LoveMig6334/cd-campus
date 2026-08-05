"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchView } from "@/lib/types";
import { deriveFlags, setsWon, SPORTS } from "@/lib/sport/rules";
import { contrastText, HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";

const FINISHED_HOLD_MS = 30_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Hall display board (1920×1080, viewed from ~20 m). Read-only: the server is
 * the only source of truth — realtime events just trigger a re-read, and the
 * last known score stays on screen while the connection is down.
 */
export function ScoreboardDisplay({
  match,
  serverNow,
}: {
  match: MatchView | null;
  serverNow: number;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(true);
  const [now, setNow] = useState(serverNow);
  // Server-clock offset so the elapsed timer and the 30s finished-hold don't
  // trust the kiosk machine's clock. Set in the effect below before the first
  // tick; until then `now` is the server's own render timestamp.
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetRef.current), 1000);
    return () => clearInterval(t);
  }, []);

  // Same lazy-client pattern as components/RealtimeRefresh.tsx, but with a
  // 300ms debounce (score taps should land in ~1s) and connection-status UI.
  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      if (cancelled) return;
      const supabase = createClient();
      const channel = supabase.channel("rt-scoreboard");
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 300);
        },
      );
      let everConnected = false;
      channel.subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        // Catch up on anything missed during a drop.
        if (ok && everConnected) router.refresh();
        if (ok) everConnected = true;
      });
      teardown = () => void supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      teardown?.();
    };
  }, [router]);

  // FINISHED holds for 30s measured from endedAt (refresh-safe), then IDLE —
  // derived from the ticking clock, so no timer state to manage.
  const holdUntil =
    match?.status === "finished" && match.endedAt
      ? Date.parse(match.endedAt) + FINISHED_HOLD_MS
      : null;

  const showIdle =
    match === null ||
    match.status === "cancelled" ||
    (holdUntil !== null && now >= holdUntil);

  // Idle → match transition plays a short VS splash. State is adjusted during
  // render (React's "adjust state when props change" pattern) and expires off
  // the ticking clock, so no timers or effect-set state are needed.
  const [prevIdle, setPrevIdle] = useState(showIdle);
  const [introUntil, setIntroUntil] = useState<number | null>(null);
  if (prevIdle !== showIdle) {
    setPrevIdle(showIdle);
    if (prevIdle && !showIdle) setIntroUntil(now + 2600);
  }
  const intro =
    match !== null && introUntil !== null && now < introUntil && !showIdle;

  return (
    <main className="bg-cream text-ink relative h-screen w-screen overflow-hidden">
      {showIdle ? (
        <IdleScreen now={now} />
      ) : (
        <MatchScreen key={match!.id} match={match!} now={now} />
      )}

      {intro && match && <VsSplash match={match} />}

      <div
        className={cn(
          "border-line bg-paper absolute right-4 bottom-4 z-30 flex items-center gap-2 border-[1.5px] px-3 py-1.5 font-mono text-[12px] tracking-[0.16em] uppercase transition-opacity",
          connected ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        role="status"
      >
        <span className="bg-house-pink inline-block size-2 animate-pulse rounded-full" />
        Reconnecting · กำลังเชื่อมต่อ
      </div>
    </main>
  );
}

const MARQUEE_TEXT =
  "★ CD Smart Campus · Sports Day · กีฬาสี ★ Volleyball · วอลเลย์บอล ★ Badminton · แบดมินตัน ";

function IdleScreen({ now }: { now: number }) {
  const d = new Date(now);
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-[3vh] overflow-hidden">
      {/* Halftone corner blocks (menu-page motif) */}
      <div className="halftone-bk border-line absolute top-0 left-0 h-[16vh] w-[13vw] border-r-[1.5px] border-b-[1.5px]" />
      <div className="halftone-bl border-line absolute top-0 right-0 h-[10vh] w-[20vw] border-b-[1.5px] border-l-[1.5px]" />
      <div className="halftone-bl border-line absolute bottom-[6vh] left-0 h-[12vh] w-[9vw] border-t-[1.5px] border-r-[1.5px]" />

      <div className="text-blue-deep font-mono text-[2vh] tracking-[0.3em] uppercase motion-safe:animate-[sb-drop_0.6s_ease-out_both]">
        ★ CD Smart Campus · Sports Day ★
      </div>
      <div className="font-display text-center text-[13vh] leading-tight italic motion-safe:animate-[sb-pop_0.6s_ease-out_0.15s_both]">
        กีฬาสี
      </div>

      {/* Bobbing house dots, staggered */}
      <div className="flex gap-[1.8vw]">
        {(["green", "purple", "orange", "pink"] as const).map((k, i) => (
          <span
            key={k}
            className="border-line inline-block size-[3.2vh] rounded-full border-[2px] motion-safe:animate-[sb-bob_2.2s_ease-in-out_infinite]"
            style={{ background: HOUSE_HEX[k], animationDelay: `${i * 0.22}s` }}
          />
        ))}
      </div>

      <div className="text-mute-700 font-mono text-[2.2vh] tracking-[0.22em] uppercase">
        No match in progress · ยังไม่มีการแข่งขัน
      </div>
      <div className="border-line bg-paper border-[1.5px] px-6 py-2 font-mono text-[3.4vh] tracking-[0.2em] tabular-nums [box-shadow:5px_5px_0_var(--color-blue)]">
        {pad2(d.getHours())}:{pad2(d.getMinutes())}
      </div>

      {/* Scrolling ticker */}
      <div className="bg-ink text-yellow absolute bottom-0 w-full overflow-hidden py-[1.1vh]">
        <div className="flex w-max whitespace-nowrap motion-safe:animate-[sb-marquee_28s_linear_infinite]">
          <span className="font-mono text-[2vh] tracking-[0.3em] uppercase">
            {MARQUEE_TEXT.repeat(4)}
          </span>
          <span
            aria-hidden
            className="font-mono text-[2vh] tracking-[0.3em] uppercase"
          >
            {MARQUEE_TEXT.repeat(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Short full-screen splash when the board flips from idle to a match. */
function VsSplash({ match }: { match: MatchView }) {
  const sides = [
    {
      info: match.houseA,
      anim: "motion-safe:animate-[sb-slam-left_0.55s_ease-out_both]",
    },
    {
      info: match.houseB,
      anim: "motion-safe:animate-[sb-slam-right_0.55s_ease-out_both]",
    },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-20 animate-[sb-splash-out_2.6s_ease-in_both]">
      <div className="grid h-full grid-cols-2">
        {sides.map(({ info, anim }) => {
          const bg = HOUSE_HEX[info.key];
          return (
            <div
              key={info.key}
              className={cn("flex items-center justify-center", anim)}
              style={{ background: bg, color: contrastText(bg) }}
            >
              <span className="px-[2vw] text-center font-mono text-[5vh] tracking-[0.24em] uppercase">
                {info.nameEn}
                <br />
                {info.nameTh}
              </span>
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="border-line bg-paper text-ink font-display border-[3px] px-[3vw] py-[1vh] text-[16vh] leading-none italic [box-shadow:10px_10px_0_var(--color-ink)] motion-safe:animate-[sb-pop_0.5s_ease-out_0.45s_both]">
          VS
        </span>
      </div>
    </div>
  );
}

function MatchScreen({ match, now }: { match: MatchView; now: number }) {
  const config = SPORTS[match.sport];
  const format = { bestOf: match.bestOf, pointsToWin: match.pointsToWin };
  const state = {
    sets: match.sets,
    currentSet: match.currentSet,
    serving: match.serving,
  };
  const flags = deriveFlags(format, state);
  const pre = match.status === "scheduled";
  const finished = match.status === "finished";
  const won = setsWon(state, finished);
  const currentSet = match.sets[match.currentSet - 1];

  const running = match.timerStartedAt
    ? (now - Date.parse(match.timerStartedAt)) / 1000
    : 0;
  const totalSeconds = Math.max(0, Math.floor(match.timerSeconds + running));
  const clock = `${pad2(Math.floor(totalSeconds / 60))}:${pad2(totalSeconds % 60)}`;

  const teams = [
    { team: "a" as const, info: match.houseA },
    { team: "b" as const, info: match.houseB },
  ];

  const panels = teams.map(({ team, info }) => {
    const bg = HOUSE_HEX[info.key];
    const fg = contrastText(bg);
    const isWinner = finished && match.winner === team;
    const dimmed = finished && match.winner !== null && !isWinner;
    return (
      <section
        key={team}
        className={cn(
          "flex flex-col items-center justify-center gap-[2vh] border-[1.5px]",
          "border-line transition-opacity",
          team === "a"
            ? "motion-safe:animate-[sb-slam-left_0.55s_ease-out_both]"
            : "motion-safe:animate-[sb-slam-right_0.55s_ease-out_both]",
          dimmed && "opacity-50",
        )}
        style={{ background: bg, color: fg }}
      >
        <div className="flex items-center gap-3 font-mono text-[2.6vh] tracking-[0.24em] uppercase">
          {info.nameEn} · {info.nameTh}
          {!pre && !finished && match.serving === team && (
            <span
              aria-label="Serving"
              title="Serving"
              className="inline-block size-[1.6vh] animate-pulse rounded-full"
              style={{ background: fg }}
            />
          )}
        </div>

        {isWinner && (
          <div className="font-display border-b-[3px] border-current text-[5vh] italic">
            Winner · ชนะ
          </div>
        )}

        {pre ? (
          <div className="font-display text-[14vh] leading-none italic">—</div>
        ) : (
          <div className="font-display text-[28vh] leading-none italic tabular-nums">
            {currentSet[team]}
          </div>
        )}
      </section>
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* Top band: sport eyebrow + match clock */}
      <header className="flex flex-col items-center gap-[1.2vh] px-[2vw] pt-[2.4vh] pb-[1.6vh] motion-safe:animate-[sb-drop_0.5s_ease-out_0.2s_both]">
        <div className="text-blue-deep text-center font-mono text-[2vh] tracking-[0.3em] uppercase">
          ★ {config.labelEn} · {config.labelTh}
          {match.roundLabel ? ` · ${match.roundLabel}` : ""}
          {match.venue ? ` · ${match.venue}` : ""} ★
        </div>

        {pre ? (
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[6vh] leading-none italic">
              Starting soon
            </span>
            <span className="text-mute-700 font-mono text-[2.2vh] tracking-[0.22em] uppercase">
              เริ่มเร็ว ๆ นี้
              {match.scheduledAt &&
                ` · ${new Date(match.scheduledAt).toLocaleTimeString("en-GB", {
                  timeZone: "Asia/Bangkok",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </span>
          </div>
        ) : finished ? (
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[6vh] leading-none italic">
              จบการแข่งขัน
            </span>
            <span className="text-mute-700 font-mono text-[2.2vh] tracking-[0.22em] uppercase">
              Final · {won.a}–{won.b} sets
            </span>
          </div>
        ) : (
          <div className="border-line bg-ink text-yellow border-[1.5px] px-[2.4vw] py-[0.8vh] font-mono text-[6vh] leading-none tracking-[0.2em] tabular-nums">
            {clock}
          </div>
        )}
      </header>

      {/* Middle: team panels + sets-won center rail */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] px-[1.2vw]">
        {panels[0]}

        <div className="flex min-w-[16vw] flex-col items-center justify-center gap-[2vh] px-[1.6vw] motion-safe:animate-[sb-pop_0.5s_ease-out_0.35s_both]">
          <div className="text-mute-700 font-mono text-[1.8vh] tracking-[0.26em] uppercase">
            Sets won · เซต
          </div>
          <div className="flex items-center gap-[1.6vw]">
            {teams.map(({ team, info }) => {
              const bg = HOUSE_HEX[info.key];
              return (
                <span
                  key={team}
                  className="border-line font-display grid size-[9vh] place-items-center border-[1.5px] text-[6vh] italic tabular-nums"
                  style={{ background: bg, color: contrastText(bg) }}
                >
                  {won[team]}
                </span>
              );
            })}
          </div>
          <div className="text-mute-500 font-mono text-[1.6vh] tracking-[0.2em] uppercase">
            Set {match.currentSet} · Best of {match.bestOf} · to{" "}
            {match.pointsToWin}
          </div>

          {match.status === "paused" && (
            <div className="border-line bg-paper text-mute-700 border-[1.5px] px-4 py-2 font-mono text-[2vh] tracking-[0.24em] uppercase">
              ‖ Paused · พัก
            </div>
          )}
          {!finished && flags.deuce && (
            <div className="bg-yellow text-ink border-line animate-pulse border-[1.5px] px-5 py-2 font-mono text-[2.4vh] tracking-[0.24em] uppercase">
              Deuce · ดิวส์
            </div>
          )}
          {!finished && flags.matchPoint && (
            <div className="bg-ink text-yellow px-5 py-2 font-mono text-[2.4vh] tracking-[0.24em] uppercase">
              Match point
            </div>
          )}
          {!finished && !flags.matchPoint && flags.setPoint && (
            <div className="bg-ink text-paper px-5 py-2 font-mono text-[2vh] tracking-[0.24em] uppercase">
              Set point
            </div>
          )}
        </div>

        {panels[1]}
      </div>

      {/* Bottom: numbered set-history strip, one column per possible set */}
      <footer
        className="grid gap-[0.8vw] px-[1.2vw] py-[1.8vh] motion-safe:animate-[sb-rise_0.5s_ease-out_0.25s_both]"
        style={{ gridTemplateColumns: `repeat(${match.bestOf}, 1fr)` }}
      >
        {Array.from({ length: match.bestOf }, (_, i) => {
          const set = match.sets[i];
          const isCurrent = !pre && !finished && i === match.currentSet - 1;
          const isDone =
            set !== undefined &&
            (i < match.currentSet - 1 ||
              (finished && i === match.currentSet - 1));
          return (
            <div key={i} className="flex flex-col items-center gap-[0.6vh]">
              <div
                className={cn(
                  "font-mono text-[1.8vh] tracking-[0.2em] underline underline-offset-4",
                  isCurrent ? "text-blue-deep" : "text-mute-700",
                )}
              >
                {i + 1}
              </div>
              <div
                className={cn(
                  "border-line w-full border-[1.5px] py-[0.8vh] text-center font-mono text-[3.6vh] leading-none tracking-[0.14em] tabular-nums",
                  isCurrent
                    ? "bg-yellow text-ink"
                    : isDone
                      ? "bg-paper text-ink"
                      : "bg-paper text-mute-300",
                )}
              >
                {set !== undefined ? `${set.a}:${set.b}` : ":"}
              </div>
            </div>
          );
        })}
      </footer>
    </div>
  );
}
