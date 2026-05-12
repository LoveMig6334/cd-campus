import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getEventById } from "@/lib/queries/events";
import { deleteEvent, updateEvent } from "../../actions";

const CATEGORIES = [
  { value: "sport", label: "Sport · กีฬา" },
  { value: "tradition", label: "Tradition · ประเพณี" },
  { value: "music", label: "Music · ดนตรี" },
  { value: "admin", label: "Admin · บริหาร" },
  { value: "academic", label: "Academic · วิชาการ" },
];

// "2026-05-12T15:30:00+07:00" → "2026-05-12T15:30" for <input type="datetime-local">
function toLocalInput(ts: string): string {
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getEventById(id);
  if (!row) notFound();

  const startsAtLocal = toLocalInput(row.starts_at);

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขกิจกรรม"
        eyebrow="Edit calendar event"
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
          action={updateEvent}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input
              name="title_th"
              type="text"
              required
              maxLength={120}
              defaultValue={row.title_th}
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
              defaultValue={row.title_en ?? ""}
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
              defaultValue={row.category}
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
              defaultValue={row.tag ?? ""}
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
              defaultValue={startsAtLocal}
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
              defaultValue={row.location ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input
              name="highlight"
              type="checkbox"
              defaultChecked={row.highlight}
            />
            <span className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase">
              Highlight (yellow briefing chip)
            </span>
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Save changes →
            </Btn>
            <button
              type="submit"
              formAction={deleteEvent}
              className="font-mono text-[11px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
            >
              Delete event
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
