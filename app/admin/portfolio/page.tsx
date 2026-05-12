import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StubCard } from "@/components/layout/StubCard";

export default function AdminPortfolio() {
  return (
    <>
      <AdminTopbar titleTh="รุ่นพี่" eyebrow="Portfolio · Review" />
      <StubCard titleEn="Portfolios" titleTh="รุ่นพี่" />
    </>
  );
}
