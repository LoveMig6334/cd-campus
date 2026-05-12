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
              "rounded-full border-[1.2px] border-line px-2.5 py-1 font-mono text-[10px] lowercase tracking-[0.04em] transition-colors",
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
