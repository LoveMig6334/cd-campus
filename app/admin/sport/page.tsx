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
            <Btn variant="primary">+ Add event</Btn>
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
