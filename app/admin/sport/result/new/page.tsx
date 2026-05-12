import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { recordSportResult } from "../../actions";

const CATEGORIES = [
  { value: "Track", label: "Track · ลู่" },
  { value: "Team", label: "Team · ทีม" },
];

const HOUSES = [
  { value: "1", label: "Green · เขียว" },
  { value: "2", label: "Purple · ม่วง" },
  { value: "3", label: "Orange · ส้ม" },
  { value: "4", label: "Pink · ชมพู" },
];

const PLACEMENTS = [
  { slot: "p1", label: "1st place · ที่ 1", defaultValue: "1" },
  { slot: "p2", label: "2nd place · ที่ 2", defaultValue: "2" },
  { slot: "p3", label: "3rd place · ที่ 3", defaultValue: "3" },
  { slot: "p4", label: "4th place · ที่ 4", defaultValue: "4" },
];

export default function NewSportResultPage() {
  return (
    <>
      <AdminTopbar
        titleTh="บันทึกผลการแข่งขัน"
        eyebrow="New sport result"
        actions={
          <Link
            href="/admin/sport"
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดผลการแข่งขัน" en="Result details" />
        <form action={recordSportResult} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input
              name="title_th"
              type="text"
              required
              maxLength={120}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              English title (optional)
            </span>
            <input
              name="title_en"
              type="text"
              maxLength={120}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Category
            </span>
            <select
              name="category"
              required
              defaultValue="Track"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Time / score label · เวลา (optional)
            </span>
            <input
              name="time_label"
              type="text"
              maxLength={40}
              placeholder="e.g. 11.42s"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          {PLACEMENTS.map((p) => (
            <label key={p.slot} className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
                {p.label}
              </span>
              <select
                name={p.slot}
                required
                defaultValue={p.defaultValue}
                className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
              >
                {HOUSES.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <div className="md:col-span-2">
            <Btn type="submit" variant="primary">Record result →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
