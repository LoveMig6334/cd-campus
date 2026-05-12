import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { EventResultsTable } from "@/components/admin/EventResultsTable";
import { LiveIndicator } from "@/components/admin/LiveIndicator";
import { ScoreboardCard } from "@/components/admin/ScoreboardCard";
import { UpcomingGrid } from "@/components/admin/UpcomingGrid";
import { getScoreboard } from "@/lib/queries/houses";
import { getAdminSportResults } from "@/lib/queries/sportResults";
import { getAdminUpcomingSport } from "@/lib/queries/events";

export default async function AdminSport() {
  const [scoreboard, results, upcoming] = await Promise.all([
    getScoreboard(),
    getAdminSportResults(),
    getAdminUpcomingSport(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="กีฬาสี"
        eyebrow="Sport Day · Day 2 of 3 · Live"
        actions={
          <>
            <LiveIndicator label="Broadcasting live" />
            <Btn>Export</Btn>
            <Link
              href="/admin/sport/result/new"
              className="inline-block border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all bg-blue text-white [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-blue-deep"
            >
              + Record result
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {scoreboard.map((entry) => (
          <ScoreboardCard key={entry.house} entry={entry} />
        ))}
      </div>

      <Card className="mt-[18px]">
        <CardTitle
          th="ผลการแข่งขัน"
          en="Event results"
          menu="↗ Full bracket"
        />
        <EventResultsTable rows={results} />
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="การแข่งขันถัดไป" en="Upcoming matches" />
        <UpcomingGrid events={upcoming} />
      </Card>
    </>
  );
}
