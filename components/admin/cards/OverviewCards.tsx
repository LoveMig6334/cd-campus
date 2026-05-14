import { Card, CardTitle } from "@/components/admin/Card";
import { GreetingBanner } from "@/components/admin/GreetingBanner";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentBookingsTable } from "@/components/admin/RecentBookingsTable";
import { TodayEventsCard } from "@/components/admin/TodayEventsCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { requireAdmin } from "@/lib/auth";
import { getRecentBookings } from "@/lib/queries/bookings";
import { getAdminTodayEvents } from "@/lib/queries/events";
import { getOverviewKpis, getTrendChart } from "@/lib/queries/siteConfig";

export async function GreetingCard() {
  const admin = await requireAdmin();
  return (
    <GreetingBanner
      th={`สวัสดี อาจารย์${admin.display_name}`}
      en={`Hello, ${admin.display_name}`}
    />
  );
}

export async function KpiGrid() {
  const kpis = await getOverviewKpis();
  return (
    <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

export async function TrendCard() {
  const trend = await getTrendChart();
  return (
    <Card accent>
      <CardTitle
        th="กิจกรรม 12 เดือน"
        en="12-month trend"
        menu="↗ View report"
      />
      <TrendChart data={trend} />
    </Card>
  );
}

export async function TodayEvents() {
  const events = await getAdminTodayEvents();
  return <TodayEventsCard events={events} />;
}

export async function RecentBookings() {
  const rows = await getRecentBookings();
  return (
    <Card className="mt-[18px]">
      <CardTitle th="การจองล่าสุด" en="Recent bookings" menu="View all →" />
      <RecentBookingsTable rows={rows} />
    </Card>
  );
}

export function GreetingSkeleton() {
  return (
    <div className="border-line bg-paper mb-[18px] h-16 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-line bg-paper h-24 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]"
        />
      ))}
    </div>
  );
}

export function TallCardSkeleton() {
  return (
    <div className="border-line bg-paper h-72 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}

export function TableCardSkeleton() {
  return (
    <div className="border-line bg-paper mt-[18px] h-64 animate-pulse border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
  );
}
