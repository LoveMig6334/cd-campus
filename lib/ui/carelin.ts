import type { AdminTabItem } from "@/lib/types";

export function carelinDeskTabs(counts: {
  all: number;
  open: number;
  answered: number;
}): AdminTabItem[] {
  return [
    { id: "all", label: "All", count: counts.all },
    { id: "open", label: "Open", count: counts.open },
    { id: "answered", label: "Answered", count: counts.answered },
  ];
}

export const CARELIN_DESK_ACTIVE_TAB = "all";
