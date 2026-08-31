import { ConsoleCreateForm } from "@/components/console/ConsoleCreateForm";
import { ConsoleMatch } from "@/components/console/ConsoleMatch";
import { PageHeader } from "@/components/console/ui";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getAdminActiveMatch } from "@/lib/queries/matches";

export default async function ConsoleMatchPage() {
  const active = await getAdminActiveMatch();
  return (
    <>
      <RealtimeRefresh
        tables={["matches", "match_players"]}
        channelKey="rt-console-match"
      />
      <PageHeader
        title={
          active
            ? "Current match · การแข่งขันปัจจุบัน"
            : "New match · สร้างการแข่งขัน"
        }
        subtitle={
          active
            ? "Score, pause, end sets and finish the match. Changes go live on the board instantly."
            : "No match is queued. Create one and it appears on the display board as “Starting soon”."
        }
      />
      {active ? (
        <ConsoleMatch key={active.id} match={active} />
      ) : (
        <ConsoleCreateForm />
      )}
    </>
  );
}
