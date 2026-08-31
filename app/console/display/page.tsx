import Link from "next/link";
import { setDisplayMode } from "./actions";
import {
  Badge,
  Button,
  HouseDot,
  PageHeader,
  Panel,
} from "@/components/console/ui";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getDisplayMatch, getDisplayMode } from "@/lib/queries/matches";
import { HOUSE_HEX } from "@/lib/sport/colors";
import {
  formatOfMatch,
  headlineScore,
  periodLabel,
  SPORTS,
  stateOfMatch,
} from "@/lib/sport/rules";
import { cn } from "@/lib/cn";

export default async function ConsoleDisplayPage() {
  const [mode, match] = await Promise.all([
    getDisplayMode(),
    getDisplayMatch(),
  ]);
  const inPlay = match?.status === "live" || match?.status === "paused";
  const won = match
    ? headlineScore(
        SPORTS[match.sport],
        stateOfMatch(match),
        match.status === "finished",
      )
    : null;
  const cur = match ? match.sets[match.currentSet - 1] : null;

  const options = [
    {
      mode: "match" as const,
      title: "Current match · แสดงการแข่งขัน",
      body: "The board follows whatever is happening: the live match, the result for 30 s after it ends, or the next scheduled match.",
    },
    {
      mode: "idle" as const,
      title: "Main screen · การแข่งขันกีฬาสี",
      body: "Show the Sports Day holding screen. The match keeps running in the background — score and clock are kept — so you can switch back any time.",
    },
  ];

  return (
    <>
      <RealtimeRefresh
        tables={["matches", "site_config"]}
        channelKey="rt-console-display"
      />
      <PageHeader
        title="Display board · จอสกอร์บอร์ด"
        subtitle="Choose what the hall screen shows. Switching never touches the match itself."
        actions={
          <Link
            href="/scoreboard"
            target="_blank"
            className="border-sky text-sky hover:bg-sky-soft inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors"
          >
            ⧉ Open board in new tab
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {options.map((o) => {
          const active = mode === o.mode;
          return (
            <form
              key={o.mode}
              action={setDisplayMode}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-white p-5 transition-colors",
                active
                  ? "border-sky ring-sky/20 ring-2"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <input type="hidden" name="mode" value={o.mode} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-marine text-[16px] font-semibold">
                  {o.title}
                </h2>
                {active && <Badge tone="gold">● Showing now</Badge>}
              </div>
              <p className="text-[13px] text-gray-500">{o.body}</p>
              <Button
                type="submit"
                variant={active ? "ghost" : "primary"}
                disabled={active}
                className="mt-auto self-start"
              >
                {active ? "Currently on" : "Switch to this"}
              </Button>
            </form>
          );
        })}
      </div>

      <Panel className="mt-4" title="What the board would show in match mode">
        {!match ? (
          <p className="text-[14px] text-gray-500">
            Nothing queued — the board shows the main screen either way.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <Badge
              tone={
                match.status === "live"
                  ? "gold"
                  : match.status === "finished"
                    ? "green"
                    : "sky"
              }
            >
              {match.status === "live"
                ? "LIVE"
                : match.status === "paused"
                  ? "Paused"
                  : match.status === "finished"
                    ? "Finished"
                    : "Starting soon"}
            </Badge>
            <span className="text-[14px] text-gray-700">
              {SPORTS[match.sport].labelEn}
              {match.roundLabel ? ` · ${match.roundLabel}` : ""}
            </span>
            <span className="flex items-center gap-2 text-[15px] font-medium">
              <HouseDot hex={HOUSE_HEX[match.houseA.key]} />
              {match.houseA.nameEn}
              <span className="text-marine font-semibold tabular-nums">
                {inPlay && cur
                  ? `${cur.a} : ${cur.b}`
                  : `${won!.a} – ${won!.b}`}
              </span>
              {match.houseB.nameEn}
              <HouseDot hex={HOUSE_HEX[match.houseB.key]} />
            </span>
            {inPlay && (
              <span className="text-[13px] text-gray-500">
                {SPORTS[match.sport].kind === "timed"
                  ? `Total ${won!.a}–${won!.b} · ${periodLabel(
                      SPORTS[match.sport],
                      formatOfMatch(match),
                      match.currentSet,
                    )}`
                  : `Sets ${won!.a}–${won!.b} · set ${match.currentSet} of ${match.bestOf}`}
              </span>
            )}
            <Link
              href="/console/match"
              className="text-sky ml-auto text-[13px] font-medium hover:underline"
            >
              Manage match →
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}
