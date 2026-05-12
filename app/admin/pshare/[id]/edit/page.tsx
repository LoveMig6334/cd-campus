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
      "id, slug, title, num_label, snippet, body_md, author_alias, art_halftone, art_bg, art_num_color, tags",
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
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
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
          art_num_color: data.art_num_color,
          tags: data.tags ?? [],
        }}
      />
      <Card className="mt-[18px] border-house-pink">
        <CardTitle th="ลบโพสต์" en="Delete post" />
        <form action={deletePost}>
          <input type="hidden" name="id" value={data.id} />
          <button
            type="submit"
            className="inline-block border-[1.5px] border-line bg-paper px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-house-pink transition-all [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-house-pink hover:text-white"
          >
            Delete permanently
          </button>
        </form>
      </Card>
    </>
  );
}
