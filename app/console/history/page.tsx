import Link from "next/link";
import { ConsoleDeleteButton } from "@/components/console/ConsoleDeleteButton";
import {
  Badge,
  Button,
  FIELD,
  HouseDot,
  LABEL,
  PageHeader,
  Panel,
} from "@/components/console/ui";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getMatchHistory } from "@/lib/queries/matches";
import {
  formatOfMatch,
  headlineScore,
  isTimed,
  periodLabel,
  SPORTS,
  stateOfMatch,
} from "@/lib/sport/rules";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { HOUSES } from "@/lib/ui/sport";

export default async function ConsoleHistoryPage({
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
    limit: 100,
  };
  const filtered = Boolean(filters.houseId || filters.sport || filters.dateISO);
  const history = await getMatchHistory(filters);

  return (
    <>
      <RealtimeRefresh tables={["matches"]} channelKey="rt-console-history" />
      <PageHeader
        title="Match history · ประวัติการแข่งขัน"
        subtitle={`${history.length} finished match${history.length === 1 ? "" : "es"}${filtered ? " (filtered)" : ""}`}
      />

      <Panel className="mb-4 py-4">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <label className="block min-w-[160px]">
            <span className={LABEL}>Team</span>
            <select
              name="house"
              defaultValue={sp.house ?? ""}
              className={FIELD}
            >
              <option value="">All teams</option>
              {HOUSES.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[160px]">
            <span className={LABEL}>Sport</span>
            <select
              name="sport"
              defaultValue={sp.sport ?? ""}
              className={FIELD}
            >
              <option value="">All sports</option>
              {Object.values(SPORTS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Date</span>
            <input
              name="date"
              type="date"
              defaultValue={sp.date ?? ""}
              className={FIELD}
            />
          </label>
          <Button type="submit" variant="primary">
            Filter
          </Button>
          {filtered && (
            <Link
              href="/console/history"
              className="text-sky px-2 py-2.5 text-[13px] font-medium hover:underline"
            >
              Clear
            </Link>
          )}
        </form>
      </Panel>

      <Panel className="p-0">
        {history.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-gray-500">
            No finished matches yet · ยังไม่มีผลการแข่งขัน
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[12px] font-medium text-gray-500">
                  <th className="px-5 py-3">When</th>
                  <th className="px-3 py-3">Sport</th>
                  <th className="px-3 py-3">Match</th>
                  <th className="px-3 py-3">Sets</th>
                  <th className="px-3 py-3">Set scores</th>
                  <th className="px-3 py-3">Winner</th>
                  <th className="px-5 py-3 text-right">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => {
                  const config = SPORTS[m.sport];
                  const won = headlineScore(config, stateOfMatch(m), true);
                  const winner = m.winner === "a" ? m.houseA : m.houseB;
                  const scores = m.sets
                    .map((s, i) =>
                      isTimed(config)
                        ? `${periodLabel(config, formatOfMatch(m), i + 1)} ${s.a}–${s.b}`
                        : `${s.a}–${s.b}`,
                    )
                    .join(", ");
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-gray-600 tabular-nums">
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
                      <td className="px-3 py-3">
                        {config.labelEn}
                        {m.roundLabel && (
                          <span className="ml-1.5 text-[12px] text-gray-400">
                            {m.roundLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <HouseDot
                          hex={HOUSE_HEX[m.houseA.key]}
                          className="mr-1.5"
                        />
                        {m.houseA.nameEn}
                        <span className="mx-2 text-gray-400">vs</span>
                        <HouseDot
                          hex={HOUSE_HEX[m.houseB.key]}
                          className="mr-1.5"
                        />
                        {m.houseB.nameEn}
                      </td>
                      <td className="text-marine px-3 py-3 font-semibold tabular-nums">
                        {won.a}–{won.b}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-gray-500 tabular-nums">
                        {scores}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {m.winner ? (
                          <Badge tone="gold">
                            <HouseDot hex={HOUSE_HEX[winner.key]} />
                            {winner.nameEn} · {winner.nameTh}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ConsoleDeleteButton
                          id={m.id}
                          summary={`${config.labelEn} — ${m.houseA.nameEn} vs ${m.houseB.nameEn}`}
                          scoreline={`${won.a}–${won.b} · ${scores}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
