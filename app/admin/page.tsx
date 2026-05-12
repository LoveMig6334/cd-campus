import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StubCard } from "@/components/layout/StubCard";

export default function AdminOverview() {
  return (
    <>
      <AdminTopbar titleTh="ภาพรวม" eyebrow="Overview · Term 1 / Week 6 of 16" />
      <StubCard titleEn="Overview" titleTh="ภาพรวม" />
    </>
  );
}
