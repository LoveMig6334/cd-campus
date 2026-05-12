import { cn } from "@/lib/cn";

export function TagChipRow({
  tags,
  activeTag,
}: {
  tags: string[];
  activeTag: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = tag === activeTag;
        return (
          <button
            key={tag}
            type="button"
            className={cn(
              "border-line rounded-full border-[1.2px] px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] lowercase transition-colors",
              active ? "bg-ink text-yellow" : "bg-paper text-ink",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
