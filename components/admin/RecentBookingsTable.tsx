import type { AdminBookingRow } from "@/lib/types";
import { Pill } from "./Pill";

const STATUS_VARIANT: Record<AdminBookingRow["status"], "ok" | "pend" | "rev"> =
  {
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
              className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-2.5 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase"
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
            className="hover:bg-cream transition-colors [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
          >
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
                  : ""
              }
            >
              <span className="font-display text-[15px] italic">
                {row.roomEn}
                <small className="text-mute-500 mt-px block font-sans text-[12px] not-italic">
                  {row.roomTh}
                </small>
              </span>
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
                  : ""
              }
            >
              {row.user}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
                  : ""
              }
            >
              <span className="font-display italic">{row.klass}</span>
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
                  : ""
              }
            >
              {row.start}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
                  : ""
              }
            >
              {row.end}
            </td>
            <td
              className={
                i < rows.length - 1
                  ? "border-mute-200 border-b border-dashed"
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
