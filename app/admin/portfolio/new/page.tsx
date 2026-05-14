import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { PortfolioTagsField } from "@/components/admin/PortfolioTagsField";
import { createProject } from "../actions";
import { PROJECT_STATUSES, STATUS_LABEL_BILINGUAL } from "@/lib/ui/portfolio";

const ICON_OPTIONS = [
  { value: "", label: "— (default trend)" },
  { value: "trend", label: "trend" },
  { value: "sun", label: "sun" },
  { value: "wave", label: "wave" },
  { value: "cube", label: "cube" },
  { value: "calendar", label: "calendar" },
  { value: "beakers", label: "beakers" },
];

export default function NewProjectPage() {
  return (
    <>
      <AdminTopbar
        titleTh="โปรเจกต์ใหม่"
        eyebrow="Portfolio · new project"
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
          action={createProject}
          encType="multipart/form-data"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
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
              defaultValue="Draft"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL_BILINGUAL[s]}
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
              defaultValue=""
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
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[12px]"
            />
          </label>

          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Submitted at (YYYY-MM-DD)
            <input
              name="submitted_at"
              type="date"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Project thumbnail (optional, jpg/png/webp, ≤5 MB)
            </span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </div>

          <PortfolioTagsField initialTags={[]} />

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Create project →
            </Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
