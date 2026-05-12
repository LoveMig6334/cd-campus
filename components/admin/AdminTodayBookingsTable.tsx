import Link from "next/link";
import type { AdminTodayBookingRow } from "@/lib/types";
import { Pill } from "./Pill";

const STATUS_VARIANT: Record<
  AdminTodayBookingRow["status"],
  "ok" | "pend" | "rev"
> = {
  Confirmed: "ok",
  Pending: "pend",
  Review: "rev",
};

export function AdminTodayBookingsTable({
  rows,
}: {
  rows: AdminTodayBookingRow[];
}) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {["Room", "User", "Start", "End", "Purpose", "Status", ""].map((h) => (
            <th
              key={h}
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
                <span className="font-display italic text-[15px]">
                  {row.room}
                </span>
              </td>
              <td className={td}>{row.user}</td>
              <td className={td}>{row.start}</td>
              <td className={td}>{row.end}</td>
              <td className={td}>{row.purpose}</td>
              <td className={td}>
                <Pill variant={STATUS_VARIANT[row.status]}>{row.status}</Pill>
              </td>
              <td className={td}>
                <Link
                  href={`/admin/bookings/${row.id}/edit`}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue hover:text-blue-deep"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
