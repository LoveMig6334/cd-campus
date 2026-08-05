"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchStatus, MatchView } from "@/lib/types";
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

  // Transitions play short overlay splashes: idle → match shows VS; status
  // changes on the same match show START / PAUSE / RESUME / WINNER stamps.
  // State is adjusted during render (React's "adjust state when props change"
  // pattern) and expires off the ticking clock — no timers, refresh-safe.
  const [prevIdle, setPrevIdle] = useState(showIdle);
  const [introUntil, setIntroUntil] = useState<number | null>(null);
  if (prevIdle !== showIdle) {
    setPrevIdle(showIdle);
    if (prevIdle && !showIdle) setIntroUntil(now + 2600);
  }
  const intro =
    match !== null && introUntil !== null && now < introUntil && !showIdle;

  type SplashKind = "start" | "pause" | "resume" | "winner";
  const [prevMatch, setPrevMatch] = useState<{
    id: string;
    status: MatchStatus;
  } | null>(match ? { id: match.id, status: match.status } : null);
  const [splash, setSplash] = useState<{
    kind: SplashKind;
    until: number;
  } | null>(null);
  if (match?.id !== prevMatch?.id || match?.status !== prevMatch?.status) {
    const from =
      prevMatch && match && prevMatch.id === match.id ? prevMatch.status : null;
    setPrevMatch(match ? { id: match.id, status: match.status } : null);
    if (match && from) {
      if (from === "scheduled" && match.status === "live") {
        setSplash({ kind: "start", until: now + 2400 });
      } else if (from === "live" && match.status === "paused") {
        setSplash({ kind: "pause", until: now + 2200 });
      } else if (from === "paused" && match.status === "live") {
        setSplash({ kind: "resume", until: now + 2200 });
      } else if (match.status === "finished") {
        setSplash({ kind: "winner", until: now + 5000 });
      }
    }
  }
  const activeSplash =
    match !== null && splash !== null && now < splash.until ? splash : null;

  return (
    <main className="bg-cream text-ink relative h-screen w-screen overflow-hidden">
      {showIdle ? (
        <IdleScreen now={now} />
      ) : (
        <MatchScreen key={match!.id} match={match!} now={now} />
      )}

      {intro && match && <VsSplash match={match} />}
      {!intro && activeSplash && match && (
        <StatusSplash kind={activeSplash.kind} match={match} />
      )}

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

const MARQUEE_TEXT = "Sports Day · กีฬาสี ★ ";

/** Value keyed to its content: a change remounts it and it rolls up. */
function Roll({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <span className={cn("inline-block overflow-hidden", className)}>
      <span
        key={String(value)}
        className="inline-block animate-[sb-tick-up_0.35s_ease-out]"
      >
        {value}
      </span>
    </span>
  );
}

/** Clock digits keyed by value so a change remounts the digit and it rolls up. */
function RollingClock({ now }: { now: number }) {
  const d = new Date(now);
  const digits = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return (
    <div className="border-line bg-paper flex items-baseline gap-3 border-[1.5px] px-6 py-2 font-mono tabular-nums [box-shadow:5px_5px_0_var(--color-blue)]">
      <span className="text-mute-700 text-[2vh]">เวลา</span>
      <span className="flex text-[3.4vh] tracking-[0.12em]">
        {digits.split("").map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden">
            <span
              key={ch}
              className="inline-block animate-[sb-tick-up_0.3s_ease-out]"
            >
              {ch}
            </span>
          </span>
        ))}
      </span>
      <span className="text-mute-700 text-[2vh]">น.</span>
    </div>
  );
}

function IdleScreen({ now }: { now: number }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-[3vh] overflow-hidden">
      {/* Ambient dot field: two halftone layers drifting at parallax speeds */}
      <div aria-hidden className="absolute -inset-24 z-0">
        <div className="sb-dots-ink absolute inset-0 animate-[sb-drift-a_8s_linear_infinite] opacity-60" />
        <div className="sb-dots-blue absolute inset-0 animate-[sb-drift-b_13s_linear_infinite] opacity-50" />
      </div>

      <div className="text-blue-deep absolute top-[3.5vh] z-10 animate-[sb-drop_0.6s_ease-out_both] font-mono text-[2vh] tracking-[0.3em] uppercase">
        ★ CD Smart Campus · Sports Day ★
      </div>

      <div className="z-10 flex flex-col items-center gap-[3vh]">
        <div className="font-display animate-[sb-pop_0.6s_ease-out_0.15s_both] text-center text-[10vh] leading-tight italic">
          การแข่งขันกีฬาสี
        </div>

        {/* Bobbing house dots, staggered */}
        <div className="flex gap-[1.8vw]">
          {(["green", "purple", "orange", "pink"] as const).map((k, i) => (
            <span
              key={k}
              className="border-line inline-block size-[3.2vh] animate-[sb-bob_2.2s_ease-in-out_infinite] rounded-full border-[2px]"
              style={{
                background: HOUSE_HEX[k],
                animationDelay: `${i * 0.22}s`,
              }}
            />
          ))}
        </div>

        <div className="text-mute-700 font-mono text-[2.2vh] tracking-[0.22em] uppercase">
          No match in progress · ยังไม่มีการแข่งขัน
        </div>

        <RollingClock now={now} />
      </div>

      {/* Scrolling ticker (leftward) */}
      <div className="bg-ink text-yellow absolute bottom-0 z-10 w-full overflow-hidden py-[1.1vh]">
        <div className="flex w-max animate-[sb-marquee_24s_linear_infinite] whitespace-nowrap">
          <span className="font-mono text-[2vh] tracking-[0.3em] uppercase">
            {MARQUEE_TEXT.repeat(12)}
          </span>
          <span
            aria-hidden
            className="font-mono text-[2vh] tracking-[0.3em] uppercase"
          >
            {MARQUEE_TEXT.repeat(12)}
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
      anim: "animate-[sb-slam-left_0.55s_ease-out_both]",
    },
    {
      info: match.houseB,
      anim: "animate-[sb-slam-right_0.55s_ease-out_both]",
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
        <span className="border-line bg-paper text-ink font-display animate-[sb-pop_0.5s_ease-out_0.45s_both] border-[3px] px-[3vw] py-[1vh] text-[16vh] leading-none italic [box-shadow:10px_10px_0_var(--color-ink)]">
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
            ? "animate-[sb-slam-left_0.55s_ease-out_both]"
            : "animate-[sb-slam-right_0.55s_ease-out_both]",
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
            <Roll value={currentSet[team]} />
          </div>
        )}
      </section>
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* Top band: sport eyebrow + match clock */}
      <header className="flex animate-[sb-drop_0.5s_ease-out_0.2s_both] flex-col items-center gap-[1.2vh] px-[2vw] pt-[2.4vh] pb-[1.6vh]">
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

        <div className="flex min-w-[16vw] animate-[sb-pop_0.5s_ease-out_0.35s_both] flex-col items-center justify-center gap-[2vh] px-[1.6vw]">
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
                  <Roll value={won[team]} />
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
        className="grid animate-[sb-rise_0.5s_ease-out_0.25s_both] gap-[0.8vw] px-[1.2vw] py-[1.8vh]"
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
                {set === undefined ? (
                  ":"
                ) : isCurrent ? (
                  <Roll value={`${set.a}:${set.b}`} />
                ) : (
                  `${set.a}:${set.b}`
                )}
              </div>
            </div>
          );
        })}
      </footer>
    </div>
  );
}

/** Transient full-screen stamp for match lifecycle moments. */
function StatusSplash({
  kind,
  match,
}: {
  kind: "start" | "pause" | "resume" | "winner";
  match: MatchView;
}) {
  if (kind === "winner") {
    const winner = match.winner === "b" ? match.houseB : match.houseA;
    const bg = HOUSE_HEX[winner.key];
    const fg = contrastText(bg);
    const won = setsWon(
      {
        sets: match.sets,
        currentSet: match.currentSet,
        serving: match.serving,
      },
      true,
    );
    return (
      <div className="bg-ink/50 pointer-events-none absolute inset-0 z-20 grid animate-[sb-splash-out_5s_ease-in_both] place-items-center">
        <div
          className="border-line flex animate-[sb-pop_0.6s_ease-out_both] flex-col items-center gap-[1.6vh] border-[3px] px-[5vw] py-[4vh] text-center [box-shadow:12px_12px_0_var(--color-ink)]"
          style={{ background: bg, color: fg }}
        >
          <div className="font-mono text-[2.4vh] tracking-[0.34em] uppercase">
            ★ Winner ★
          </div>
          <div className="font-display text-[12vh] leading-none italic">
            {winner.nameEn} · {winner.nameTh}
          </div>
          <div className="font-display text-[6vh] leading-none italic">
            ชนะ!
          </div>
          <div className="font-mono text-[2.6vh] tracking-[0.2em] tabular-nums">
            {won.a}–{won.b} SETS ·{" "}
            {match.sets.map((s) => `${s.a}:${s.b}`).join("  ")}
          </div>
        </div>
      </div>
    );
  }

  const CARD: Record<
    "start" | "pause" | "resume",
    { className: string; titleTh: string; titleEn: string; totalS: string }
  > = {
    start: {
      className: "bg-yellow text-ink",
      titleTh: "เริ่มการแข่งขัน!",
      titleEn: "★ Match start ★",
      totalS: "2.4s",
    },
    pause: {
      className: "bg-paper text-ink",
      titleTh: "พักการแข่งขัน",
      titleEn: "‖ Paused",
      totalS: "2.2s",
    },
    resume: {
      className: "bg-blue text-white",
      titleTh: "เล่นต่อ!",
      titleEn: "▶ Resume",
      totalS: "2.2s",
    },
  };
  const card = CARD[kind];
  return (
    <div
      className="bg-ink/30 pointer-events-none absolute inset-0 z-20 grid place-items-center"
      style={{ animation: `sb-splash-out ${card.totalS} ease-in both` }}
    >
      <div
        className={cn(
          "border-line flex animate-[sb-pop_0.5s_ease-out_both] flex-col items-center gap-[1.2vh] border-[3px] px-[5vw] py-[3vh] [box-shadow:10px_10px_0_var(--color-ink)]",
          card.className,
        )}
      >
        <div className="font-display text-[9vh] leading-none italic">
          {card.titleTh}
        </div>
        <div className="font-mono text-[2.4vh] tracking-[0.3em] uppercase">
          {card.titleEn}
        </div>
      </div>
    </div>
  );
}
