import Link from "next/link";
import Image from "next/image";
import type { PortfolioAdminRow } from "@/lib/types";
import { setProjectStatus } from "@/app/admin/portfolio/actions";
import { getAssetUrl } from "@/lib/storage";
import { PROJECT_STATUSES, STATUS_LABEL } from "@/lib/ui/portfolio";
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

export function PortfolioAdminTable({ rows }: { rows: PortfolioAdminRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {[
            "",
            "Project",
            "Author",
            "Class",
            "Tags",
            "Submitted",
            "Status",
            "",
          ].map((h, i) => (
            <th
              key={i}
              className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-2.5 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const td =
            i < rows.length - 1 ? "border-b border-dashed border-mute-200" : "";
          const thumbBg = row.thumb.bg ?? "var(--color-blue)";
          return (
            <tr
              key={i}
              className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                {row.imagePath ? (
                  <div className="border-ink relative h-14 w-14 overflow-hidden border-[1.5px]">
                    <Image
                      src={getAssetUrl(row.imagePath)}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="border-ink text-yellow grid h-14 w-14 place-items-center border-[1.5px]"
                    style={{ background: thumbBg }}
                  >
                    <PortfolioThumbIconRender icon={row.thumb.iconKey} />
                  </div>
                )}
              </td>
              <td className={td}>
                <span className="font-display text-[15px] italic">
                  {row.titleEn}
                  <small className="text-mute-500 mt-px block font-sans text-[12px] not-italic">
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
              <td
                className={`${td} font-mono text-[10px] tracking-[0.14em] uppercase`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <form action={setProjectStatus} className="contents">
                    <input type="hidden" name="id" value={row.id} />
                    {PROJECT_STATUSES.filter((s) => s !== row.status).map((s) => (
                      <button
                        key={s}
                        type="submit"
                        name="status"
                        value={s}
                        className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-2 py-1"
                      >
                        →{" "}
                        {s === "Published"
                          ? "Pub"
                          : s === "Under Review"
                            ? "Rev"
                            : "Drf"}
                      </button>
                    ))}
                  </form>
                  <Link
                    href={`/admin/portfolio/${row.id}/edit`}
                    className="border-line bg-paper text-blue hover:bg-cream border-[1.5px] px-2 py-1"
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
