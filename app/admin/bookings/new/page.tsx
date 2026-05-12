import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getMusicRooms } from "@/lib/queries/rooms";
import { BOOKING_PERIODS } from "@/lib/ui/booking";
import { createBooking } from "../actions";

const STATUSES = [
  { value: "Confirmed", label: "Confirmed" },
  { value: "Pending", label: "Pending" },
  { value: "Review", label: "Review" },
];

export default async function NewBookingPage() {
  const rooms = await getMusicRooms();

  return (
    <>
      <AdminTopbar
        titleTh="เพิ่มการจอง"
        eyebrow="New booking"
        actions={
          <Link
            href="/admin/bookings"
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดการจอง" en="Booking details" />
        <form action={createBooking} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Room
            </span>
            <select
              name="room_id"
              required
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameEn} · {r.nameTh}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Status
            </span>
            <select
              name="status"
              required
              defaultValue="Confirmed"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Date (Asia/Bangkok)
            </span>
            <input
              name="date"
              type="date"
              required
              defaultValue="2026-05-13"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Period
            </span>
            <select
              name="period"
              required
              defaultValue="midday"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {BOOKING_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.time}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              User label · ผู้จอง (required)
            </span>
            <input
              name="user_label"
              type="text"
              required
              maxLength={120}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Purpose (optional)
            </span>
            <input
              name="purpose"
              type="text"
              maxLength={200}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <div className="md:col-span-2">
            <Btn type="submit" variant="primary">Create booking →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
