import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { StubCard } from "@/components/layout/StubCard";

export default function StudentPortfolio() {
  return (
    <>
      <PageHead titleTh="รุ่นพี่" titleEn="Alumni Portfolio" />
      <MobileBody>
        <StubCard titleEn="Portfolios" titleTh="พอร์ตรุ่นพี่" />
      </MobileBody>
    </>
  );
}
