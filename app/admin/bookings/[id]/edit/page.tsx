import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getBookingById } from "@/lib/queries/bookings";
import { getMusicRooms } from "@/lib/queries/rooms";
import { BOOKING_PERIODS, PERIOD_HOURS, type PeriodId } from "@/lib/ui/booking";
import { cancelBooking, updateBooking } from "../../actions";

const STATUSES = [
  { value: "Confirmed", label: "Confirmed" },
  { value: "Pending", label: "Pending" },
  { value: "Review", label: "Review" },
];

// "2026-05-13T11:30:00+07:00" → "2026-05-13"
function toDate(ts: string): string {
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T/);
  return m ? m[1] : "";
}

// "2026-05-13T11:30:00+07:00" → "11:30"
function toTime(ts: string): string {
  const m = ts.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function inferPeriod(startsAt: string): PeriodId {
  const time = toTime(startsAt);
  for (const id of Object.keys(PERIOD_HOURS) as PeriodId[]) {
    if (PERIOD_HOURS[id].start === time) return id;
  }
  return "midday";
}

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, rooms] = await Promise.all([
    getBookingById(id),
    getMusicRooms(),
  ]);
  if (!booking) notFound();

  const date = toDate(booking.starts_at);
  const period = inferPeriod(booking.starts_at);

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขการจอง"
        eyebrow="Edit booking"
        actions={
          <Link
            href="/admin/bookings"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดการจอง" en="Booking details" />
        <form
          action={updateBooking}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={booking.id} />

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Room
            </span>
            <select
              name="room_id"
              required
              defaultValue={booking.room_id}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameEn} · {r.nameTh}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Status
            </span>
            <select
              name="status"
              required
              defaultValue={booking.status}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Date (Asia/Bangkok)
            </span>
            <input
              name="date"
              type="date"
              required
              defaultValue={date}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Period
            </span>
            <select
              name="period"
              required
              defaultValue={period}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {BOOKING_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.time}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              User label · ผู้จอง (required)
            </span>
            <input
              name="user_label"
              type="text"
              required
              maxLength={120}
              defaultValue={booking.user_label}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Purpose (optional)
            </span>
            <input
              name="purpose"
              type="text"
              maxLength={200}
              defaultValue={booking.purpose ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Save booking →
            </Btn>
            <button
              type="submit"
              formAction={cancelBooking}
              className="font-mono text-[11px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
            >
              Cancel booking (delete)
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
