import Link from "next/link";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { CarelinForm } from "@/components/student/CarelinForm";

export default function NewCarelinRequest() {
  return (
    <>
      <PageHead
        titleTh="ขอความช่วยเหลือ"
        titleEn="Post a request"
        action={
          <Link
            href="/student/carelin"
            className="border-line bg-paper text-mute-700 border-[1.5px] px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <MobileBody className="space-y-3.5">
        <Blurb accent="pink">
          เขียนสั้น ๆ พอเข้าใจ ★ ครู / รุ่นพี่ จะมาตอบใน Public Board
        </Blurb>
        <CarelinForm />
      </MobileBody>
    </>
  );
}
