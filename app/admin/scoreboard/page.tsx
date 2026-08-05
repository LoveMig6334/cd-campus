import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Btn } from "@/components/admin/Btn";
import { MatchConsole } from "@/components/admin/MatchConsole";
import { MatchCreateForm } from "@/components/admin/MatchCreateForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getAdminActiveMatch, getMatchHistory } from "@/lib/queries/matches";
import { setsWon, SPORTS } from "@/lib/sport/rules";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { HOUSES } from "@/lib/ui/sport";

const FIELD =
  "border-line bg-paper text-ink border-[1.5px] px-2 py-1.5 font-sans text-[13px]";

function HouseDot({ houseKey }: { houseKey: string }) {
  return (
    <span
      className="border-line inline-block size-3 rounded-full border-[1.5px] align-[-1px]"
      style={{ background: HOUSE_HEX[houseKey as keyof typeof HOUSE_HEX] }}
    />
  );
}

export default async function AdminScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const houseRaw = typeof sp.house === "string" ? Number(sp.house) : NaN;
  const sportRaw = typeof sp.sport === "string" ? sp.sport : "";
  const dateRaw = typeof sp.date === "string" ? sp.date : "";

  const filters = {
    houseId: [1, 2, 3, 4].includes(houseRaw) ? houseRaw : undefined,
    sport: sportRaw in SPORTS ? sportRaw : undefined,
    dateISO: /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : undefined,
    limit: 50,
  };

  const [active, history] = await Promise.all([
    getAdminActiveMatch(),
    getMatchHistory(filters),
  ]);

  return (
    <>
      <RealtimeRefresh tables={["matches"]} channelKey="rt-admin-match" />
      <AdminTopbar
        titleTh="สกอร์บอร์ดสด"
        eyebrow="Live match console"
        actions={
          <Link
            href="/scoreboard"
            target="_blank"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ⧉ Open display board
          </Link>
        }
      />

      {active ? (
        <MatchConsole key={active.id} match={active} />
      ) : (
        <MatchCreateForm />
      )}

      <Card className="mt-5">
        <CardTitle th="ประวัติการแข่งขัน" en="Match history" />

        <form className="mb-3 flex flex-wrap items-end gap-2" method="GET">
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Team
            </span>
            <select
              name="house"
              defaultValue={sp.house ?? ""}
              className={FIELD}
            >
              <option value="">All</option>
              {HOUSES.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Sport
            </span>
            <select
              name="sport"
              defaultValue={sp.sport ?? ""}
              className={FIELD}
            >
              <option value="">All</option>
              {Object.values(SPORTS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Date
            </span>
            <input
              name="date"
              type="date"
              defaultValue={sp.date ?? ""}
              className={FIELD}
            />
          </label>
          <Btn type="submit">Filter</Btn>
          {(filters.houseId || filters.sport || filters.dateISO) && (
            <Link
              href="/admin/scoreboard"
              className="text-mute-700 font-mono text-[10px] tracking-[0.14em] uppercase underline"
            >
              Clear
            </Link>
          )}
        </form>

        {history.length === 0 ? (
          <p className="text-mute-500 font-mono text-[11px] tracking-[0.12em] uppercase">
            No finished matches yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-mute-500 border-line border-b-[1.5px] font-mono text-[10px] tracking-[0.16em] uppercase">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Sport</th>
                  <th className="py-2 pr-3">Match</th>
                  <th className="py-2 pr-3">Sets</th>
                  <th className="py-2 pr-3">Set scores</th>
                  <th className="py-2">Winner</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => {
                  const config = SPORTS[m.sport];
                  const won = setsWon(
                    {
                      sets: m.sets,
                      currentSet: m.currentSet,
                      serving: m.serving,
                    },
                    true, // finished — the last set counts
                  );
                  const winner = m.winner === "a" ? m.houseA : m.houseB;
                  return (
                    <tr
                      key={m.id}
                      className="border-line/30 border-b border-dashed"
                    >
                      <td className="py-2 pr-3 font-mono text-[11px] whitespace-nowrap">
                        {m.endedAt
                          ? new Date(m.endedAt).toLocaleString("en-GB", {
                              timeZone: "Asia/Bangkok",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {config.labelEn}
                        {m.roundLabel ? (
                          <span className="text-mute-500 font-mono text-[10px] uppercase">
                            {" "}
                            · {m.roundLabel}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <HouseDot houseKey={m.houseA.key} /> {m.houseA.nameEn}{" "}
                        <span className="text-mute-500">vs</span>{" "}
                        <HouseDot houseKey={m.houseB.key} /> {m.houseB.nameEn}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums">
                        {won.a}–{won.b}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] tabular-nums">
                        {m.sets.map((s) => `${s.a}–${s.b}`).join(", ")}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        {m.winner ? (
                          <>
                            <HouseDot houseKey={winner.key} />{" "}
                            <span className="font-display italic">
                              {winner.nameEn} · {winner.nameTh}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
