import Link from "next/link";
import { approveBooking } from "@/app/admin/bookings/actions";
import type { AdminBookingListRow } from "@/lib/types";
import { Pill } from "./Pill";

const STATUS_VARIANT: Record<
  AdminBookingListRow["status"],
  "ok" | "pend" | "rev"
> = {
  Confirmed: "ok",
  Pending: "pend",
  Review: "rev",
};

export function AdminBookingsListTable({
  rows,
  emptyHint,
}: {
  rows: AdminBookingListRow[];
  emptyHint: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-mute-500 px-2.5 py-6 text-center font-mono text-[11px] tracking-[0.14em] uppercase">
        {emptyHint}
      </div>
    );
  }
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {[
            "Date",
            "Room",
            "User",
            "Start",
            "End",
            "Purpose",
            "Status",
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
              key={row.id}
              className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
            >
              <td className={td}>
                <span className="font-mono text-[12px]">{row.date}</span>
              </td>
              <td className={td}>
                <span className="font-display text-[15px] italic">
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
                <div className="flex items-center gap-3">
                  {row.status === "Pending" && (
                    <form action={approveBooking}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="text-house-green hover:text-ink font-mono text-[10px] tracking-[0.14em] uppercase"
                      >
                        ✓ Approve
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/admin/bookings/${row.id}/edit`}
                    className="text-blue-deep hover:text-blue-deep font-mono text-[10px] tracking-[0.14em] uppercase"
                  >
                    Edit →
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
