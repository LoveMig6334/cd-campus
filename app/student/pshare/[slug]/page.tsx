import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { IconButton } from "@/components/ui/IconButton";
import { PshareReader } from "@/components/student/PshareReader";
import { getPsharePostBySlug } from "@/lib/queries/pshare";

export default async function StudentPsharePost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPsharePostBySlug(slug);
  if (!post) notFound();

  const halftoneClass =
    post.art_halftone === "halftone-bl"
      ? "halftone-bl"
      : post.art_halftone === "halftone-bk"
        ? "halftone-bk"
        : "halftone-soft";

  return (
    <>
      <PageHead
        titleTh="พี่แชร์ น้องชัวร์"
        titleEn="P'share"
        action={
          <Link href="/student/pshare">
            <IconButton label="Back · กลับ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </IconButton>
          </Link>
        }
      />
      <MobileBody className="space-y-3.5">
        <div
          className={`${halftoneClass} grid aspect-[5/3] place-items-center border-[1.5px] border-ink`}
          style={{
            background: post.art_bg ?? "var(--color-cream)",
          }}
        >
          <span
            className="font-display italic text-[64px] leading-none"
            style={{ color: post.art_num_color ?? "var(--color-ink)" }}
          >
            {post.num_label ?? "·"}
          </span>
        </div>

        <header className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute-500">
            {post.author_alias ?? ""}
          </p>
          <h1 className="font-display italic text-[26px] leading-tight">
            {post.title}
          </h1>
          {post.snippet && (
            <p className="font-sans text-[14px] text-mute-700">{post.snippet}</p>
          )}
        </header>

        {post.body_md && <PshareReader body={post.body_md} />}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="border border-line bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </MobileBody>
    </>
  );
}
