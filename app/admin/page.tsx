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
  WeekEvents,
} from "@/components/admin/cards/OverviewCards";
import { getTermWeek } from "@/lib/queries/siteConfig";

export default async function AdminOverview() {
  const { term, week, totalWeeks } = await getTermWeek();
  return (
    <>
      <AdminTopbar
        titleTh="ภาพรวม"
        eyebrow={`Overview · Term ${term} / Week ${week} of ${totalWeeks}`}
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

      <Suspense fallback={<TallCardSkeleton />}>
        <WeekEvents />
      </Suspense>

      <Suspense fallback={<TableCardSkeleton />}>
        <RecentBookings />
      </Suspense>
    </>
  );
}
