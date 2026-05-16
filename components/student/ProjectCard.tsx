import Image from "next/image";
import type { Project } from "@/lib/types";
import { getAssetUrl } from "@/lib/storage";
import { PortfolioIcon } from "./PortfolioIcons";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="border-line bg-paper overflow-hidden rounded-[10px] border-[1.5px]">
      <div className="bg-cream-2 relative h-[180px] overflow-hidden">
        {project.authorImagePath ? (
          <Image
            src={getAssetUrl(project.authorImagePath)}
            alt={project.authorLine}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
          />
        ) : (
          <>
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
          </>
        )}
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <h3 className="font-display text-[19px] leading-[1.1] italic">
          {project.title}
        </h3>
        {project.titleTh && (
          <p className="text-mute-700 mt-0.5 text-[12px]">{project.titleTh}</p>
        )}
        {project.desc && (
          <p className="text-mute-700 mt-2 line-clamp-2 text-[12px] leading-[1.4]">
            {project.desc}
          </p>
        )}
        <div className="border-mute-200 mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-dashed pt-2.5">
          <div className="font-mono text-[10px]">
            {project.authorLine}
            {project.klass && (
              <span className="text-mute-500"> · {project.klass}</span>
            )}
          </div>
          {project.tags.length > 0 && (
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
          )}
        </div>
        {project.appliedTo && (
          <p className="text-mute-700 mt-2 font-mono text-[10px] tracking-[0.06em]">
            <span className="text-mute-500 uppercase">Applied · สมัคร </span>
            {project.appliedTo}
          </p>
        )}
        {project.pdfPath && (
          <a
            href={getAssetUrl(project.pdfPath)}
            target="_blank"
            rel="noreferrer"
            className="border-line bg-ink text-yellow hover:bg-blue-deep mt-3 inline-flex w-full items-center justify-between border-[1.5px] px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors hover:text-white"
          >
            <span>View portfolio PDF</span>
            <span aria-hidden>↓</span>
          </a>
        )}
      </div>
    </article>
  );
}
