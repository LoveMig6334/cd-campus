"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchView } from "@/lib/types";
import { deriveFlags, setsWon, setWinner, SPORTS } from "@/lib/sport/rules";
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

  return (
    <main className="bg-cream text-ink relative h-screen w-screen overflow-hidden">
      {showIdle ? (
        <IdleScreen now={now} />
      ) : (
        <MatchScreen match={match!} now={now} />
      )}

      <div
        className={cn(
          "border-line bg-paper absolute right-4 bottom-4 flex items-center gap-2 border-[1.5px] px-3 py-1.5 font-mono text-[12px] tracking-[0.16em] uppercase transition-opacity",
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

function IdleScreen({ now }: { now: number }) {
  const d = new Date(now);
  return (
    <div className="halftone-soft flex h-full flex-col items-center justify-center gap-6">
      <div className="text-blue-deep font-mono text-[2vh] tracking-[0.3em] uppercase">
        ★ CD Smart Campus · Sports Day ★
      </div>
      <div className="font-display text-center text-[10vh] leading-tight italic">
        กีฬาสี
      </div>
      <div className="text-mute-700 font-mono text-[2.2vh] tracking-[0.22em] uppercase">
        No match in progress · ยังไม่มีการแข่งขัน
      </div>
      <div className="border-line bg-paper border-[1.5px] px-6 py-2 font-mono text-[3vh] tracking-[0.2em] tabular-nums">
        {pad2(d.getHours())}:{pad2(d.getMinutes())}
      </div>
    </div>
  );
}

function MatchScreen({ match, now }: { match: MatchView; now: number }) {
  const config = SPORTS[match.sport];
  const state = {
    sets: match.sets,
    currentSet: match.currentSet,
    serving: match.serving,
  };
  const flags = deriveFlags(config, state);
  const won = setsWon(config, state);
  const pre = match.status === "scheduled";
  const finished = match.status === "finished";
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
      <header className="flex flex-col items-center gap-[1.2vh] px-[2vw] pt-[2.4vh] pb-[1.6vh]">
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

        <div className="flex min-w-[16vw] flex-col items-center justify-center gap-[2vh] px-[1.6vw]">
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
            Set {match.currentSet} · Best of {config.bestOf}
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
        className="grid gap-[0.8vw] px-[1.2vw] py-[1.8vh]"
        style={{ gridTemplateColumns: `repeat(${config.bestOf}, 1fr)` }}
      >
        {Array.from({ length: config.bestOf }, (_, i) => {
          const set = match.sets[i];
          const isCurrent = !pre && !finished && i === match.currentSet - 1;
          const isDone =
            set !== undefined &&
            (i < match.currentSet - 1 ||
              (finished && setWinner(config, set, i + 1) !== null));
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
