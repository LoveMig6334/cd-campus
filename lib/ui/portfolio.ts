import type { AdminTabItem } from "@/lib/types";

export const PORTFOLIO_TABS: AdminTabItem[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "review", label: "Under review" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
];

export const PORTFOLIO_ACTIVE_TAB = "all";
