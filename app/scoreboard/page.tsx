import { ScoreboardDisplay } from "@/components/scoreboard/ScoreboardDisplay";
import { getDisplayMatch, getDisplayMode } from "@/lib/queries/matches";

export const metadata = {
  title: "Live Scoreboard · CD Sports Day",
};

export default async function ScoreboardPage() {
  const [match, mode] = await Promise.all([
    getDisplayMatch(),
    getDisplayMode(),
  ]);
  // Server components render once per request here (cookies() makes the route
  // dynamic) — the request timestamp is intentional, not a purity hazard.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <ScoreboardDisplay match={match} mode={mode} serverNow={serverNow} />;
}
