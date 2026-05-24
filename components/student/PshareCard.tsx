import Link from "next/link";
import type { PsharePost } from "@/lib/types";
import { PshareTag } from "./PshareTag";

export function PshareCard({ post }: { post: PsharePost }) {
  const artBg = post.art.bg ?? "var(--color-cream)";
  const numColor = post.art.numColor ?? "var(--color-ink)";

  return (
    <Link
      href={`/student/pshare/${post.slug}`}
      className="border-line bg-paper grid grid-cols-[84px_1fr] overflow-hidden border-[1.5px] transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:4px_4px_0_var(--color-blue)]"
    >
      <div
        className={`relative grid place-items-center ${post.art.halftone}`}
        style={{ background: artBg }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(10,10,10,0.45) 1px, transparent 1.4px)",
            backgroundSize: "6px 6px",
          }}
        />
        <span
          className="font-display relative z-[1] text-[36px] leading-none italic"
          style={{ color: numColor }}
        >
          {post.num}
        </span>
      </div>
      <div className="min-w-0 px-3.5 py-3">
        <h3 className="font-display text-[17px] leading-[1.15] italic">
          {post.title}
        </h3>
        <p className="text-mute-700 mt-1 line-clamp-2 text-[12px] leading-[1.45]">
          {post.snippet}
        </p>
        <div className="text-mute-500 mt-2 flex justify-between font-mono text-[9.5px] tracking-[0.06em]">
          <span className="text-blue-deep font-medium">{post.author}</span>
          <span>{post.date}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {post.tags.map((tag) => (
            <PshareTag key={tag} tag={tag} />
          ))}
        </div>
      </div>
    </Link>
  );
}
