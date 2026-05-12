import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { GreetingBanner } from "@/components/admin/GreetingBanner";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentBookingsTable } from "@/components/admin/RecentBookingsTable";
import { TodayEventsCard } from "@/components/admin/TodayEventsCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { getRecentBookings } from "@/lib/queries/bookings";
import { getAdminTodayEvents } from "@/lib/queries/events";
import {
  getAdminGreeting,
  getOverviewKpis,
  getTrendChart,
} from "@/lib/queries/siteConfig";

export default async function AdminOverview() {
  const [greeting, kpis, trend, todayEvents, recentBookings] =
    await Promise.all([
      getAdminGreeting(),
      getOverviewKpis(),
      getTrendChart(),
      getAdminTodayEvents(),
      getRecentBookings(),
    ]);
  return (
    <>
      <AdminTopbar
        titleTh="ภาพรวม"
        eyebrow="Overview · Term 1 / Week 6 of 16"
        actions={
          <>
            <AdminSearch />
            <Btn>Export ↓</Btn>
            <Btn variant="primary">+ New Event</Btn>
          </>
        }
      />

      <GreetingBanner th={greeting.th} en={greeting.en} />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <Card accent>
          <CardTitle
            th="กิจกรรม 12 เดือน"
            en="12-month trend"
            menu="↗ View report"
          />
          <TrendChart data={trend} />
        </Card>
        <TodayEventsCard events={todayEvents} />
      </div>

      <Card className="mt-[18px]">
        <CardTitle th="การจองล่าสุด" en="Recent bookings" menu="View all →" />
        <RecentBookingsTable rows={recentBookings} />
      </Card>
    </>
  );
}
