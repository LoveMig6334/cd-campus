import type { Project } from "@/lib/types";
import { PortfolioIcon } from "./PortfolioIcons";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="border-line bg-paper overflow-hidden rounded-[10px] border-[1.5px]">
      <div className="bg-cream-2 relative h-[130px] overflow-hidden">
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
        <h3 className="font-display text-[19px] leading-[1.1] italic">
          {project.title}
        </h3>
        <p className="text-mute-700 mt-0.5 text-[12px]">{project.titleTh}</p>
        <p className="text-mute-700 mt-2 line-clamp-2 text-[12px] leading-[1.4]">
          {project.desc}
        </p>
        <div className="border-mute-200 mt-2.5 flex items-center justify-between border-t border-dashed pt-2.5">
          <div className="font-mono text-[10px]">{project.authorLine}</div>
          <div className="flex gap-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="bg-blue px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.1em] text-white uppercase"
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
