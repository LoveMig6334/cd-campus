import Link from "next/link";
import type { CarelinDeskRow } from "@/lib/types";
import { Pill } from "./Pill";

export function CarelinDeskTable({ rows }: { rows: CarelinDeskRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {["When", "Requester", "Title · ปัญหา", "Status", ""].map((h, i) => (
            <th
              key={i}
              className="border-b-[1.5px] border-ink bg-cream px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const td =
            i < rows.length - 1
              ? "border-b border-dashed border-mute-200"
              : "";
          return (
            <tr
              key={i}
              className="transition-colors hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                <span className="font-mono">{row.when}</span>
              </td>
              <td className={td}>
                <span className="font-display italic text-[15px]">
                  {row.requester.name}
                  <small className="mt-px block font-sans text-[12px] not-italic text-mute-500">
                    #{row.requester.studentId} · {row.requester.klass}
                  </small>
                </span>
              </td>
              <td className={td}>
                <span className="font-display italic text-[15px]">
                  {row.title}
                  <small className="mt-px block font-sans text-[12px] not-italic text-mute-500">
                    {row.snippet}
                  </small>
                </span>
              </td>
              <td className={td}>
                {row.status === "Open" ? (
                  <Pill variant="pend">Open</Pill>
                ) : (
                  <Pill variant="ok">Answered</Pill>
                )}
              </td>
              <td className={td}>
                <Link
                  href={`/admin/carelin/${row.id}`}
                  className={
                    row.status === "Open"
                      ? "inline-block border-[1.5px] border-line bg-blue px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-yellow"
                      : "inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
                  }
                >
                  {row.status === "Open" ? "Reply" : "View"}
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
