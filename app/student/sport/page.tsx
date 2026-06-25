import { Suspense } from "react";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { Leaderboard } from "@/components/student/Leaderboard";
import { SportFeedCard } from "@/components/student/SportFeedCard";
import { SportHero } from "@/components/student/SportHero";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getLeaderboard } from "@/lib/queries/houses";
import { getStudentLiveResults } from "@/lib/queries/sportResults";
import { getStudentUpcomingSport } from "@/lib/queries/events";
import { getSportDay } from "@/lib/queries/siteConfig";

export default function StudentSport() {
  return (
    <>
      <RealtimeRefresh tables={["sport_results"]} channelKey="rt-sport" />
      <PageHead
        titleTh="กีฬาสี"
        titleEn="Sport Day · Live"
        action={
          <IconButton label="Live · ถ่ายทอดสด">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        {/* Two Suspense boundaries stream independently; all four queries still
            run concurrently (sibling async children fetch in parallel). */}
        <Suspense fallback={<SportTopSkeleton />}>
          <SportTop />
        </Suspense>
        <Suspense fallback={<SportFeedsSkeleton />}>
          <SportFeeds />
        </Suspense>
      </MobileBody>
    </>
  );
}

async function SportTop() {
  const [sportDay, leaderboard] = await Promise.all([
    getSportDay(),
    getLeaderboard(),
  ]);
  return (
    <>
      <SportHero
        label={sportDay.label}
        title={`Day ${sportDay.dayOfN} of ${sportDay.totalDays}`}
        meta={`${sportDay.dateLabel}${sportDay.isLive ? " · Live" : ""} · ${sportDay.eventsRemaining} events remaining`}
      />
      <Leaderboard rows={leaderboard} />
    </>
  );
}

async function SportFeeds() {
  const [liveResults, upcoming] = await Promise.all([
    getStudentLiveResults(),
    getStudentUpcomingSport(),
  ]);
  return (
    <>
      <SectionDivider>⚡ Live Results</SectionDivider>
      <div className="space-y-2.5">
        {liveResults.map((result, i) => (
          <SportFeedCard key={i} result={result} />
        ))}
      </div>

      <SectionDivider>★ Upcoming</SectionDivider>
      <div className="space-y-2">
        {upcoming.map((event, i) => (
          <CalendarEventCard key={i} event={event} />
        ))}
      </div>
    </>
  );
}

function SportTopSkeleton() {
  return (
    <div className="animate-pulse space-y-3.5">
      <div className="border-line bg-paper h-28 border-[1.5px]" />
      <div className="border-line bg-paper h-40 border-[1.5px]" />
    </div>
  );
}

function SportFeedsSkeleton() {
  return (
    <>
      <SectionDivider>⚡ Live Results</SectionDivider>
      <div className="animate-pulse space-y-2.5">
        <div className="border-line bg-paper h-16 border-[1.5px]" />
        <div className="border-line bg-paper h-16 border-[1.5px]" />
      </div>

      <SectionDivider>★ Upcoming</SectionDivider>
      <div className="animate-pulse space-y-2">
        <div className="border-line bg-paper h-14 border-[1.5px]" />
        <div className="border-line bg-paper h-14 border-[1.5px]" />
      </div>
    </>
  );
}
