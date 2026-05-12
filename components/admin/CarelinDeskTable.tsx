import Link from "next/link";
import { deleteCarelinRequest } from "@/app/admin/carelin/actions";
import type { CarelinDeskRow } from "@/lib/types";
import { Pill } from "./Pill";

type Props = {
  rows: CarelinDeskRow[];
  isRoot: boolean;
};

export function CarelinDeskTable({ rows, isRoot }: Props) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {["When", "Requester", "Title · ปัญหา", "Status", ""].map((h, i) => (
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
          return (
            <tr
              key={i}
              className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                <span className="font-mono">{row.when}</span>
              </td>
              <td className={td}>
                <span className="font-display text-[15px] italic">
                  {row.requester.name}
                  <small className="text-mute-500 mt-px block font-sans text-[12px] not-italic">
                    #{row.requester.studentId} · {row.requester.klass}
                  </small>
                </span>
              </td>
              <td className={td}>
                <span className="font-display text-[15px] italic">
                  {row.title}
                  <small className="text-mute-500 mt-px block font-sans text-[12px] not-italic">
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
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/carelin/${row.id}`}
                    className={
                      row.status === "Open"
                        ? "border-line bg-blue text-yellow inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
                        : "border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
                    }
                  >
                    {row.status === "Open" ? "Reply" : "View"}
                  </Link>
                  {isRoot && (
                    <form action={deleteCarelinRequest}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="font-mono text-[10px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
