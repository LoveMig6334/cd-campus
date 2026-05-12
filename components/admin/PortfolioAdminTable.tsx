import Link from "next/link";
import type { PortfolioAdminRow } from "@/lib/types";
import { setProjectStatus } from "@/app/admin/portfolio/actions";
import { Pill } from "./Pill";
import { PortfolioThumbIconRender } from "./PortfolioThumbIcons";

const STATUS_VARIANT: Record<
  PortfolioAdminRow["status"],
  "ok" | "rev" | "pend"
> = {
  Published: "ok",
  "Under Review": "rev",
  Draft: "pend",
};

const STATUS_LABEL: Record<PortfolioAdminRow["status"], string> = {
  Published: "Published",
  "Under Review": "Under Review",
  Draft: "Draft",
};

const STATUS_OPTIONS: PortfolioAdminRow["status"][] = [
  "Published",
  "Under Review",
  "Draft",
];

export function PortfolioAdminTable({ rows }: { rows: PortfolioAdminRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {["", "Project", "Author", "Class", "Tags", "Submitted", "Status", ""].map(
            (h, i) => (
              <th
                key={i}
                className="border-b-[1.5px] border-ink bg-cream px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
              >
                {h}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const td =
            i < rows.length - 1
              ? "border-b border-dashed border-mute-200"
              : "";
          const thumbBg = row.thumb.bg ?? "var(--color-blue)";
          return (
            <tr
              key={i}
              className="transition-colors hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                <div
                  className="grid h-14 w-14 place-items-center border-[1.5px] border-ink text-yellow"
                  style={{ background: thumbBg }}
                >
                  <PortfolioThumbIconRender icon={row.thumb.iconKey} />
                </div>
              </td>
              <td className={td}>
                <span className="font-display italic text-[15px]">
                  {row.titleEn}
                  <small className="mt-px block font-sans text-[12px] not-italic text-mute-500">
                    {row.titleTh}
                  </small>
                </span>
              </td>
              <td className={td}>{row.author}</td>
              <td className={td}>
                <span className="font-display italic">{row.klass}</span>
              </td>
              <td className={td}>
                <span className="flex flex-wrap gap-0.5">
                  {row.tags.map((tag) => (
                    <Pill
                      key={tag.label}
                      background={tag.background}
                      textColor={tag.textColor ?? "white"}
                    >
                      {tag.label}
                    </Pill>
                  ))}
                </span>
              </td>
              <td className={td}>{row.submitted}</td>
              <td className={td}>
                <Pill variant={STATUS_VARIANT[row.status]}>
                  {STATUS_LABEL[row.status]}
                </Pill>
              </td>
              <td className={`${td} font-mono text-[10px] uppercase tracking-[0.14em]`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <form action={setProjectStatus} className="contents">
                    <input type="hidden" name="id" value={row.id} />
                    {STATUS_OPTIONS.filter((s) => s !== row.status).map((s) => (
                      <button
                        key={s}
                        type="submit"
                        name="status"
                        value={s}
                        className="border-[1.5px] border-line bg-paper px-2 py-1 text-mute-700 hover:bg-cream"
                      >
                        → {s === "Published" ? "Pub" : s === "Under Review" ? "Rev" : "Drf"}
                      </button>
                    ))}
                  </form>
                  <Link
                    href={`/admin/portfolio/${row.id}/edit`}
                    className="border-[1.5px] border-line bg-paper px-2 py-1 text-blue hover:bg-cream"
                  >
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
