import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { ProjectCard } from "@/components/student/ProjectCard";
import { StatsStrip } from "@/components/student/StatsStrip";
import { IconButton } from "@/components/ui/IconButton";
import { PORTFOLIO_PROJECTS, PORTFOLIO_STATS } from "@/supabase/seed/data/portfolios";

export default function StudentPortfolio() {
  return (
    <>
      <PageHead
        titleTh="รุ่นพี่"
        titleEn="Alumni Portfolio"
        action={
          <IconButton label="Filter · ตัวกรอง">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <StatsStrip stats={PORTFOLIO_STATS} />
        <div className="space-y-3">
          {PORTFOLIO_PROJECTS.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
