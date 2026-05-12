import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { GreetingBanner } from "@/components/admin/GreetingBanner";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentBookingsTable } from "@/components/admin/RecentBookingsTable";
import { TodayEventsCard } from "@/components/admin/TodayEventsCard";
import { TrendChart } from "@/components/admin/TrendChart";
import {
  ADMIN_GREETING,
  ADMIN_KPIS,
  ADMIN_RECENT_BOOKINGS,
  ADMIN_TODAY_EVENTS,
} from "@/supabase/seed/data/admin-overview";

export default function AdminOverview() {
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

      <GreetingBanner th={ADMIN_GREETING.th} en={ADMIN_GREETING.en} />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {ADMIN_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <Card accent>
          <CardTitle th="กิจกรรม 12 เดือน" en="12-month trend" menu="↗ View report" />
          <TrendChart />
        </Card>
        <TodayEventsCard events={ADMIN_TODAY_EVENTS} />
      </div>

      <Card className="mt-[18px]">
        <CardTitle th="การจองล่าสุด" en="Recent bookings" menu="View all →" />
        <RecentBookingsTable rows={ADMIN_RECENT_BOOKINGS} />
      </Card>
    </>
  );
}
