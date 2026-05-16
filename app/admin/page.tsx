import { Suspense } from "react";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import {
  GreetingCard,
  GreetingSkeleton,
  KpiGrid,
  KpiGridSkeleton,
  RecentBookings,
  TableCardSkeleton,
  TallCardSkeleton,
  TodayEvents,
  TrendCard,
} from "@/components/admin/cards/OverviewCards";

export default function AdminOverview() {
  return (
    <>
      <AdminTopbar
        titleTh="ภาพรวม"
        eyebrow="Overview · Term 1 / Week 6 of 16"
        actions={
          <>
            <AdminSearch />
            <Btn type="button">Export ↓</Btn>
            <Btn type="button" variant="primary">
              + New Event
            </Btn>
          </>
        }
      />

      <Suspense fallback={<GreetingSkeleton />}>
        <GreetingCard />
      </Suspense>

      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiGrid />
      </Suspense>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <Suspense fallback={<TallCardSkeleton />}>
          <TrendCard />
        </Suspense>
        <Suspense fallback={<TallCardSkeleton />}>
          <TodayEvents />
        </Suspense>
      </div>

      <Suspense fallback={<TableCardSkeleton />}>
        <RecentBookings />
      </Suspense>
    </>
  );
}
