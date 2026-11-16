"use client";

import type { CourtId } from "@/lib/sport/badminton";
import { BadmintonBoard } from "@/components/scoreboard/BadmintonBoard";
import {
  useBadmintonCourts,
  useNow,
} from "@/components/scoreboard/useBadmintonCourts";

export function BadmintonScreen({ court }: { court: CourtId | null }) {
  const { state } = useBadmintonCourts();
  const now = useNow();
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0f3b2a]">
      <BadmintonBoard state={state} now={now} court={court} />
    </main>
  );
}
