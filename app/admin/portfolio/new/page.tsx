import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { createProject } from "../actions";

export default function NewProjectPage() {
  return (
    <>
      <AdminTopbar
        titleTh="พอร์ตโฟลิโอใหม่"
        eyebrow="Portfolio · new"
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
        <CardTitle th="รายละเอียดพอร์ตโฟลิโอ" en="Portfolio details" />
        <form
          action={createProject}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Title · ชื่อ (required)
            </span>
            <input
              name="title_en"
              type="text"
              required
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author name · ชื่อผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
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
              Faculty & university applied to · คณะ/มหาวิทยาลัยที่สมัคร
            </span>
            <input
              name="applied_to"
              type="text"
              maxLength={240}
              placeholder="e.g. Faculty of Engineering, Chulalongkorn University"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Description · รายละเอียด
            </span>
            <textarea
              name="desc_long"
              rows={4}
              maxLength={1200}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author profile image (optional, jpg/png/webp, ≤5 MB)
            </span>
            <input
              name="author_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </div>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Portfolio PDF (optional, ≤10 MB)
            </span>
            <input
              name="portfolio_pdf"
              type="file"
              accept="application/pdf"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Create →
            </Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
