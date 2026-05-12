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
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดกิจกรรม" en="Event details" />
        <form action={addEvent} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input name="title_th" type="text" required maxLength={120} className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink" />
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              English title (optional)
            </span>
            <input name="title_en" type="text" maxLength={120} className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink" />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Category
            </span>
            <select name="category" required defaultValue="academic" className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Tag · e.g. &quot;Sport · ลานกีฬากลาง&quot; (optional)
            </span>
            <input name="tag" type="text" maxLength={80} className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink" />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Starts at (Asia/Bangkok)
            </span>
            <input name="starts_at" type="datetime-local" required defaultValue="2026-05-12T09:00" className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink" />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Location (optional)
            </span>
            <input name="location" type="text" maxLength={120} className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink" />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input name="highlight" type="checkbox" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-700">
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
