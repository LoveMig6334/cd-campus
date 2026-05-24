import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminKpi,
  PortfolioAdminRow,
  PortfolioIconKey,
  PortfolioTagPill,
  PortfolioThumbIcon,
  Project,
} from "@/lib/types";
import { monthRange } from "@/lib/queries/util";
import { currentYearMonth } from "@/lib/time";

export type ProjectFull = Database["public"]["Tables"]["projects"]["Row"];

const SUBMITTED_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function trimAuthor(line: string): string {
  // "ธรรศ์ × นนท์ — Y9 / 2025" → "ธรรศ์ × นนท์"
  const idx = line.indexOf("—");
  return idx === -1 ? line : line.slice(0, idx).trim();
}

function fmtSubmitted(d: string | null): string {
  if (!d) return "—";
  const m = d.match(SUBMITTED_RE);
  if (!m) return d;
  const monthMap: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  return `${parseInt(m[3], 10)} ${monthMap[m[2]] ?? m[2]}`;
}

// The 3 legacy demo titles keep their bespoke hero icons; every other
// portfolio (admin-created via /admin/portfolio/new) shows the profile
// silhouette.
const STUDENT_ICON_BY_TITLE: Record<string, PortfolioIconKey> = {
  CropPlanner: "crop",
  "Solar Lab Monitor": "solar",
  "SHM Visualizer": "shm",
};

const STUDENT_TITLE_ORDER: Record<string, number> = {
  CropPlanner: 0,
  "Solar Lab Monitor": 1,
  "SHM Visualizer": 2,
};

export async function getStudentProjects(): Promise<Project[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select(
      "title_en, title_th, desc_long, author_line, klass, applied_to, pdf_path, author_image_path, tags, created_at",
    )
    .eq("status", "Published");
  if (error) throw new Error(`getStudentProjects: ${error.message}`);
  return (data ?? [])
    .slice()
    .sort((a, b) => {
      const legacyA = STUDENT_TITLE_ORDER[a.title_en];
      const legacyB = STUDENT_TITLE_ORDER[b.title_en];
      if (legacyA !== undefined || legacyB !== undefined) {
        return (legacyA ?? 99) - (legacyB ?? 99);
      }
      return b.created_at.localeCompare(a.created_at);
    })
    .map<Project>((p) => {
      const tags = (p.tags as PortfolioTagPill[] | null) ?? [];
      return {
        title: p.title_en,
        titleTh: p.title_th ?? "",
        desc: p.desc_long ?? "",
        authorLine: p.author_line ?? "",
        klass: p.klass ?? undefined,
        appliedTo: p.applied_to ?? undefined,
        pdfPath: p.pdf_path ?? undefined,
        authorImagePath: p.author_image_path ?? undefined,
        tags: tags.map((t) => t.label),
        iconKey: STUDENT_ICON_BY_TITLE[p.title_en] ?? "profile",
      };
    });
}

export async function getAdminPortfolioRows(): Promise<PortfolioAdminRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select(
      "id, title_en, title_th, author_line, klass, icon_key, thumb_bg, image_path, tags, submitted_at, status",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAdminPortfolioRows: ${error.message}`);
  return (data ?? []).map<PortfolioAdminRow>((p) => ({
    id: p.id,
    thumb: {
      iconKey: (p.icon_key as PortfolioThumbIcon) ?? "trend",
      bg: p.thumb_bg ?? undefined,
    },
    imagePath: p.image_path,
    titleEn: p.title_en,
    titleTh: p.title_th ?? "",
    author: trimAuthor(p.author_line ?? ""),
    klass: p.klass ?? "",
    tags: ((p.tags as PortfolioTagPill[] | null) ?? []) as PortfolioTagPill[],
    submitted: fmtSubmitted(p.submitted_at),
    status: p.status as PortfolioAdminRow["status"],
  }));
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// Running totals have no good/bad polarity, so the badge stays flat (cream);
// the ▲ glyph is informational. Mirrors overview.ts `newThisMonthDelta`.
function addedThisMonth(n: number): AdminKpi["delta"] {
  if (n > 0) return { kind: "flat", text: `▲ ${fmt(n)} this month` };
  return { kind: "flat", text: "— none this month" };
}

/**
 * The four Portfolio Manager status bars, computed live from the projects table
 * (replaces the old static site_config `portfolio_kpis`):
 *   Total · Published · Under review (= Draft) · Featured (is_featured).
 * Each delta reports how many of that category were added this month.
 */
export async function getPortfolioKpis(): Promise<AdminKpi[]> {
  const db = await createClient();
  const { year, month } = currentYearMonth();
  const { start, next } = monthRange(year, month);

  const count = () =>
    db.from("projects").select("*", { count: "exact", head: true });
  const newThisMonth = () =>
    count().gte("created_at", start).lt("created_at", next);

  const [
    total,
    published,
    drafts,
    featured,
    totalNew,
    publishedNew,
    draftsNew,
    featuredNew,
  ] = await Promise.all([
    count(),
    count().eq("status", "Published"),
    count().eq("status", "Draft"),
    count().eq("is_featured", true),
    newThisMonth(),
    newThisMonth().eq("status", "Published"),
    newThisMonth().eq("status", "Draft"),
    newThisMonth().eq("is_featured", true),
  ]);

  for (const r of [
    total,
    published,
    drafts,
    featured,
    totalNew,
    publishedNew,
    draftsNew,
    featuredNew,
  ]) {
    if (r.error) throw new Error(`getPortfolioKpis: ${r.error.message}`);
  }

  return [
    {
      label: "Total",
      th: "โครงงานทั้งหมด",
      num: fmt(total.count ?? 0),
      delta: addedThisMonth(totalNew.count ?? 0),
    },
    {
      label: "Published",
      th: "เผยแพร่แล้ว",
      num: fmt(published.count ?? 0),
      delta: addedThisMonth(publishedNew.count ?? 0),
    },
    {
      label: "Under review",
      th: "รออนุมัติ",
      num: fmt(drafts.count ?? 0),
      delta: addedThisMonth(draftsNew.count ?? 0),
    },
    {
      label: "Featured",
      th: "โครงงานเด่น",
      num: fmt(featured.count ?? 0),
      delta: addedThisMonth(featuredNew.count ?? 0),
    },
  ];
}

export async function getProjectById(id: string): Promise<ProjectFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProjectById: ${error.message}`);
  return data;
}
