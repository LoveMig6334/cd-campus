import { ScoreboardDisplay } from "@/components/scoreboard/ScoreboardDisplay";
import { getDisplayMatch } from "@/lib/queries/matches";

export const metadata = {
  title: "Live Scoreboard · CD Sports Day",
};

export default async function ScoreboardPage() {
  const match = await getDisplayMatch();
  // Server components render once per request here (cookies() makes the route
  // dynamic) — the request timestamp is intentional, not a purity hazard.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <ScoreboardDisplay match={match} serverNow={serverNow} />;
}
