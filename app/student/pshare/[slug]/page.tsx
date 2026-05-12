import Image from "next/image";
import { notFound } from "next/navigation";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { PshareReader } from "@/components/student/PshareReader";
import { getPsharePostBySlug } from "@/lib/queries/pshare";
import { getAssetUrl } from "@/lib/storage";
import { cn } from "@/lib/cn";

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
        backHref="/student/pshare"
      />
      <MobileBody className="space-y-3.5">
        {post.art_image_path ? (
          <div className="border-ink relative aspect-[5/3] overflow-hidden border-[1.5px]">
            <Image
              src={getAssetUrl(post.art_image_path)}
              alt={post.title}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              halftoneClass,
              "border-ink grid aspect-[5/3] place-items-center border-[1.5px]",
            )}
            style={{ background: post.art_bg ?? "var(--color-cream)" }}
          >
            <span
              className="font-display text-[64px] leading-none italic"
              style={{ color: post.art_num_color ?? "var(--color-ink)" }}
            >
              {post.num_label ?? "·"}
            </span>
          </div>
        )}

        {/* header, body, tags — unchanged */}
        <header className="space-y-1.5">
          {post.author_alias && (
            <p className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
              {post.author_alias}
            </p>
          )}
          <h1 className="font-display text-[26px] leading-tight italic">
            {post.title}
          </h1>
          {post.snippet && (
            <p className="text-mute-700 font-sans text-[14px]">
              {post.snippet}
            </p>
          )}
        </header>

        {post.body_md && <PshareReader body={post.body_md} />}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="border-line bg-paper text-mute-700 border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase"
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
