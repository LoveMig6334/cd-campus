import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { PshareEditor } from "@/components/admin/PshareEditor";
import { Card, CardTitle } from "@/components/admin/Card";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "../../actions";

export default async function EditPsharePost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "id, slug, title, num_label, snippet, body_md, author_alias, art_halftone, art_bg, art_image_path, tags",
    )
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโพสต์"
        eyebrow="P'share · edit post"
        actions={
          <Link
            href="/admin/pshare"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <PshareEditor
        defaults={{
          id: data.id,
          slug: data.slug,
          title: data.title,
          num_label: data.num_label,
          snippet: data.snippet,
          body_md: data.body_md,
          author_alias: data.author_alias,
          art_halftone: data.art_halftone,
          art_bg: data.art_bg,
          art_image_path: data.art_image_path,
          tags: data.tags ?? [],
        }}
      />
      <Card className="border-house-pink mt-[18px]">
        <CardTitle th="ลบโพสต์" en="Delete post" />
        <form action={deletePost}>
          <input type="hidden" name="id" value={data.id} />
          <button
            type="submit"
            className="border-line bg-paper text-house-pink hover:bg-house-pink inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:text-white hover:[box-shadow:4px_4px_0_var(--color-ink)]"
          >
            Delete permanently
          </button>
        </form>
      </Card>
    </>
  );
}
