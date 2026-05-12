import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { addEvent } from "../actions";

const CATEGORIES = [
  { value: "sport", label: "Sport · กีฬา" },
  { value: "tradition", label: "Tradition · ประเพณี" },
  { value: "music", label: "Music · ดนตรี" },
  { value: "admin", label: "Admin · บริหาร" },
  { value: "academic", label: "Academic · วิชาการ" },
];

export default function NewEventPage() {
  return (
    <>
      <AdminTopbar
        titleTh="เพิ่มกิจกรรม"
        eyebrow="New calendar event"
        actions={
          <Link
            href="/admin/calendar"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดกิจกรรม" en="Event details" />
        <form
          action={addEvent}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input
              name="title_th"
              type="text"
              required
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (optional)
            </span>
            <input
              name="title_en"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Category
            </span>
            <select
              name="category"
              required
              defaultValue="academic"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Tag · e.g. &quot;Sport · ลานกีฬากลาง&quot; (optional)
            </span>
            <input
              name="tag"
              type="text"
              maxLength={80}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Starts at (Asia/Bangkok)
            </span>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue="2026-05-12T09:00"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Location (optional)
            </span>
            <input
              name="location"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input name="highlight" type="checkbox" />
            <span className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase">
              Highlight (yellow briefing chip)
            </span>
          </label>

          <div className="md:col-span-2">
            <Btn variant="primary">Save event →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
