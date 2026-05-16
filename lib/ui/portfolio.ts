import type { AdminTabItem, PortfolioTagPill } from "@/lib/types";

export const PORTFOLIO_TABS: AdminTabItem[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "review", label: "Under review" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
];

export const PORTFOLIO_ACTIVE_TAB = "all";

export const TAG_SWATCHES = [
  { id: "blue", label: "Blue", background: "var(--color-blue)" },
  {
    id: "yellow",
    label: "Yellow",
    background: "var(--color-yellow)",
    textColor: "var(--color-ink)",
  },
  { id: "green", label: "Green", background: "var(--color-house-green)" },
  { id: "purple", label: "Purple", background: "var(--color-house-purple)" },
  { id: "orange", label: "Orange", background: "var(--color-house-orange)" },
] as const;

export type TagSwatchId = (typeof TAG_SWATCHES)[number]["id"];

/**
 * Validate + normalize a parsed tags array. Drops entries whose background
 * isn't one of the known swatches. Yellow auto-attaches textColor: ink.
 */
export function normalizeTags(raw: unknown): PortfolioTagPill[] {
  if (!Array.isArray(raw)) return [];
  const out: PortfolioTagPill[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const label = String((entry as { label?: unknown }).label ?? "").trim();
    const background = String(
      (entry as { background?: unknown }).background ?? "",
    );
    if (!label) continue;
    const swatch = TAG_SWATCHES.find((s) => s.background === background);
    if (!swatch) continue;
    out.push(
      swatch.id === "yellow"
        ? { label, background, textColor: "var(--color-ink)" }
        : { label, background },
    );
  }
  return out;
}

export const PROJECT_STATUSES = ["Published", "Draft"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Published: "Published",
  Draft: "Draft",
};

export const STATUS_LABEL_BILINGUAL: Record<ProjectStatus, string> = {
  Published: "Published · เผยแพร่",
  Draft: "Draft · ฉบับร่าง",
};
