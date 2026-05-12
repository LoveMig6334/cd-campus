import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { PortfolioTagsField } from "@/components/admin/PortfolioTagsField";
import { getProjectById } from "@/lib/queries/projects";
import { getAssetUrl } from "@/lib/storage";
import type { PortfolioTagPill } from "@/lib/types";
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

  const tags = ((row.tags as PortfolioTagPill[] | null) ?? []) as PortfolioTagPill[];

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโปรเจกต์"
        eyebrow="Portfolio · edit project"
        actions={
          <Link
            href="/admin/portfolio"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดโปรเจกต์" en="Project details" />
        <form
          action={updateProject}
          encType="multipart/form-data"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
              defaultValue={row.title_en}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (optional)
            </span>
            <input
              name="title_th"
              type="text"
              maxLength={120}
              defaultValue={row.title_th ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author line · ผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
              defaultValue={row.author_line ?? ""}
              placeholder="e.g. ธรรศ์ × นนท์ — Y9 / 2025"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Class · ชั้นเรียน
            </span>
            <input
              name="klass"
              type="text"
              maxLength={32}
              defaultValue={row.klass ?? ""}
              placeholder="e.g. Y9"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Long description · รายละเอียด
            </span>
            <textarea
              name="desc_long"
              rows={4}
              maxLength={1200}
              defaultValue={row.desc_long ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Status · สถานะ
            </span>
            <select
              name="status"
              required
              defaultValue={row.status}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb icon
            </span>
            <select
              name="icon_key"
              defaultValue={row.icon_key ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thumb background CSS (optional, e.g. var(--color-blue))
            </span>
            <input
              name="thumb_bg"
              type="text"
              maxLength={120}
              defaultValue={row.thumb_bg ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[12px]"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Submitted at (YYYY-MM-DD)
            <input
              name="submitted_at"
              type="date"
              defaultValue={row.submitted_at ?? ""}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Project thumbnail (optional, jpg/png/webp, ≤5 MB)
            </span>
            {row.image_path && (
              <div className="border-line bg-paper mt-1 grid h-20 w-20 place-items-center overflow-hidden border-[1.5px]">
                <Image
                  src={getAssetUrl(row.image_path)}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
            {row.image_path && (
              <p className="text-mute-500 mt-1 font-mono text-[10px]">
                Leave empty to keep current image.
              </p>
            )}
          </div>

          <PortfolioTagsField initialTags={tags} />

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Save project →
            </Btn>
            <button
              type="submit"
              formAction={deleteProject}
              className="font-mono text-[11px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
            >
              Delete project
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
