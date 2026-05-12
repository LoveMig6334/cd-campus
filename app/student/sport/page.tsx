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
import { SPORT_HERO } from "@/lib/ui/sport";

export default async function StudentSport() {
  const [leaderboard, liveResults, upcoming] = await Promise.all([
    getLeaderboard(),
    getStudentLiveResults(),
    getStudentUpcomingSport(),
  ]);
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
        <SportHero {...SPORT_HERO} />
        <Leaderboard rows={leaderboard} />

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
      </MobileBody>
    </>
  );
}
