import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getSportResultById } from "@/lib/queries/sportResults";
import { deleteSportResult, updateSportResult } from "../../../actions";

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

const PLACEMENT_LABELS = [
  "1st place · ที่ 1",
  "2nd place · ที่ 2",
  "3rd place · ที่ 3",
  "4th place · ที่ 4",
];

export default async function EditSportResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getSportResultById(id);
  if (!row) notFound();

  const placements: number[] = row.placements ?? [];
  const slotDefault = (i: number) =>
    String(placements[i] ?? i + 1);

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขผลการแข่งขัน"
        eyebrow="Edit sport result"
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
        <form action={updateSportResult} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input
              name="title_th"
              type="text"
              required
              maxLength={120}
              defaultValue={row.title_th}
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
              defaultValue={row.title_en ?? ""}
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
              defaultValue={row.category}
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
              defaultValue={row.time_label ?? ""}
              placeholder="e.g. 11.42s"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          {(["p1", "p2", "p3", "p4"] as const).map((slot, i) => (
            <label key={slot} className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
                {PLACEMENT_LABELS[i]}
              </span>
              <select
                name={slot}
                required
                defaultValue={slotDefault(i)}
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

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">Save result →</Btn>
            <button
              type="submit"
              formAction={deleteSportResult}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-red-600 hover:text-red-700"
            >
              Delete result
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
