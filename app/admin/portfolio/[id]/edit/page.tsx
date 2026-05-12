import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getProjectById } from "@/lib/queries/projects";
import { deleteProject, updateProject } from "../../actions";

const STATUS_OPTIONS = [
  { value: "Published", label: "Published · เผยแพร่" },
  { value: "Under Review", label: "Under Review · กำลังตรวจ" },
  { value: "Draft", label: "Draft · ฉบับร่าง" },
];

const ICON_OPTIONS = [
  { value: "", label: "— (default trend)" },
  { value: "trend", label: "trend" },
  { value: "sun", label: "sun" },
  { value: "wave", label: "wave" },
  { value: "cube", label: "cube" },
  { value: "calendar", label: "calendar" },
  { value: "beakers", label: "beakers" },
];

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getProjectById(id);
  if (!row) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโปรเจกต์"
        eyebrow="Portfolio · edit project"
        actions={
          <Link
            href="/admin/portfolio"
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดโปรเจกต์" en="Project details" />
        <form action={updateProject} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              English title (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
              defaultValue={row.title_en}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thai title · ชื่อภาษาไทย (optional)
            </span>
            <input
              name="title_th"
              type="text"
              maxLength={120}
              defaultValue={row.title_th ?? ""}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Author line · ผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
              defaultValue={row.author_line ?? ""}
              placeholder="e.g. ธรรศ์ × นนท์ — Y9 / 2025"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Class · ชั้นเรียน
            </span>
            <input
              name="klass"
              type="text"
              maxLength={32}
              defaultValue={row.klass ?? ""}
              placeholder="e.g. Y9"
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Long description · รายละเอียด
            </span>
            <textarea
              name="desc_long"
              rows={4}
              maxLength={1200}
              defaultValue={row.desc_long ?? ""}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Status · สถานะ
            </span>
            <select
              name="status"
              required
              defaultValue={row.status}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thumb icon
            </span>
            <select
              name="icon_key"
              defaultValue={row.icon_key ?? ""}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
              Thumb background CSS (optional, e.g. var(--color-blue))
            </span>
            <input
              name="thumb_bg"
              type="text"
              maxLength={120}
              defaultValue={row.thumb_bg ?? ""}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[12px] text-ink"
            />
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">Save project →</Btn>
            <button
              type="submit"
              formAction={deleteProject}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-red-600 hover:text-red-700"
            >
              Delete project
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
