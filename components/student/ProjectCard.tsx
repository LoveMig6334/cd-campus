import type { Project } from "@/supabase/seed/data/types";
import { PortfolioIcon } from "./PortfolioIcons";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="overflow-hidden rounded-[10px] border-[1.5px] border-line bg-paper">
      <div className="relative h-[130px] overflow-hidden bg-cream-2">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-blue) 1px, transparent 1.4px)",
            backgroundSize: "8px 8px",
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative z-[1] aspect-square w-[44%]">
            <PortfolioIcon icon={project.iconKey} />
          </div>
        </div>
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <h3 className="font-display italic text-[19px] leading-[1.1]">
          {project.title}
        </h3>
        <p className="mt-0.5 text-[12px] text-mute-700">{project.titleTh}</p>
        <p className="mt-2 line-clamp-2 text-[12px] leading-[1.4] text-mute-700">
          {project.desc}
        </p>
        <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-mute-200 pt-2.5">
          <div className="font-mono text-[10px]">{project.authorLine}</div>
          <div className="flex gap-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="bg-blue px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
