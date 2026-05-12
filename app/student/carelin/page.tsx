import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { CarelinCard } from "@/components/student/CarelinCard";
import { CarelinCta } from "@/components/student/CarelinCta";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { CARELIN_REQUESTS } from "@/data/carelin-requests";

export default function StudentCarelin() {
  return (
    <>
      <PageHead
        titleTh="ซีดีแคร์ลิน"
        titleEn="CD Carelin"
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
        <Blurb accent="pink">
          อยากขอความช่วยเหลือเรื่องอะไรก็ได้ ★ ครู / รุ่นพี่ จะมาตอบ
        </Blurb>

        <CarelinCta />

        <SectionDivider>⚡ Public Board</SectionDivider>

        <div className="space-y-2.5">
          {CARELIN_REQUESTS.map((request) => (
            <CarelinCard key={request.title} request={request} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
