import Link from "next/link";
import { PLACEMENT_COLOR } from "@/lib/ui/admin";
import type { House, SportResultRow } from "@/lib/types";

const HOUSE_LABEL: Record<House, string> = {
  green: "Green",
  purple: "Purple",
  orange: "Orange",
  pink: "Pink",
};

export function EventResultsTable({ rows }: { rows: SportResultRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {[
            "Sport · Event",
            "Category",
            "1st",
            "2nd",
            "3rd",
            "4th",
            "Time",
            "",
          ].map((h) => (
            <th
              key={h}
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
          return (
            <tr
              key={i}
              className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                <span className="font-display text-[15px] italic">
                  {row.titleTh}
                  <small className="text-mute-500 mt-px block font-sans text-[12px] not-italic">
                    {row.titleEn}
                  </small>
                </span>
              </td>
              <td className={td}>{row.category}</td>
              {row.placements.map((house, idx) => {
                const rank = (idx + 1) as 1 | 2 | 3 | 4;
                return (
                  <td key={idx} className={td}>
                    <span
                      className="mr-1 inline-block px-1.5 py-0.5 font-mono text-[10px] text-white"
                      style={{ background: PLACEMENT_COLOR[rank] }}
                    >
                      {HOUSE_LABEL[house]}
                    </span>
                  </td>
                );
              })}
              <td className={td}>{row.time}</td>
              <td className={td}>
                {row.id && (
                  <Link
                    href={`/admin/sport/result/${row.id}/edit`}
                    className="text-mute-700 hover:text-ink font-mono text-[10px] tracking-[0.14em] uppercase"
                  >
                    Edit
                  </Link>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
