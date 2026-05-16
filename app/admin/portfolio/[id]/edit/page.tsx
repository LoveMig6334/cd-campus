import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getProjectById } from "@/lib/queries/projects";
import { getAssetUrl } from "@/lib/storage";
import { deleteProject, updateProject } from "../../actions";

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
        titleTh="แก้ไขพอร์ตโฟลิโอ"
        eyebrow="Portfolio · edit"
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
          action={updateProject}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Title · ชื่อ (required)
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

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author name · ชื่อผู้จัดทำ
            </span>
            <input
              name="author_line"
              type="text"
              maxLength={160}
              defaultValue={row.author_line ?? ""}
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
              Faculty & university applied to · คณะ/มหาวิทยาลัยที่สมัคร
            </span>
            <input
              name="applied_to"
              type="text"
              maxLength={240}
              defaultValue={row.applied_to ?? ""}
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
              defaultValue={row.desc_long ?? ""}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Author profile image (optional, jpg/png/webp, ≤5 MB)
            </span>
            {row.author_image_path && (
              <div className="border-line bg-paper mt-1 h-20 w-20 overflow-hidden rounded-full border-[1.5px]">
                <Image
                  src={getAssetUrl(row.author_image_path)}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input
              name="author_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
            {row.author_image_path && (
              <p className="text-mute-500 mt-1 font-mono text-[10px]">
                Leave empty to keep the current image.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Portfolio PDF (optional, ≤10 MB)
            </span>
            {row.pdf_path && (
              <p className="mt-1 font-mono text-[11px]">
                Current:{" "}
                <a
                  href={getAssetUrl(row.pdf_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue underline"
                >
                  open PDF ↗
                </a>
              </p>
            )}
            <input
              name="portfolio_pdf"
              type="file"
              accept="application/pdf"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
            {row.pdf_path && (
              <p className="text-mute-500 mt-1 font-mono text-[10px]">
                Leave empty to keep the current PDF. Uploading a new file
                replaces it.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Btn type="submit" variant="primary">
              Save →
            </Btn>
            <button
              type="submit"
              formAction={deleteProject}
              className="font-mono text-[11px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
