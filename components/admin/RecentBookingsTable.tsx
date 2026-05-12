import type { AdminBookingRow } from "@/data/types";
import { Pill } from "./Pill";

const STATUS_VARIANT: Record<
  AdminBookingRow["status"],
  "ok" | "pend" | "rev"
> = {
  Confirmed: "ok",
  Pending: "pend",
  Review: "rev",
};

export function RecentBookingsTable({ rows }: { rows: AdminBookingRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {["Room", "User", "Class", "Start", "End", "Status"].map((h) => (
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
        {rows.map((row, i) => (
          <tr
            key={i}
            className="transition-colors hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
          >
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              <span className="font-display italic text-[15px]">
                {row.roomEn}
                <small className="mt-px block font-sans text-[12px] not-italic text-mute-500">
                  {row.roomTh}
                </small>
              </span>
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              {row.user}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              <span className="font-display italic">{row.klass}</span>
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              {row.start}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              {row.end}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : ""
              }
            >
              <Pill variant={STATUS_VARIANT[row.status]}>{row.status}</Pill>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
