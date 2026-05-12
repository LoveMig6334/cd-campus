import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StubCard } from "@/components/layout/StubCard";

export default function AdminCalendar() {
  return (
    <>
      <AdminTopbar titleTh="ปฏิทิน" eyebrow="Calendar · Term 1 / Week 6" />
      <StubCard titleEn="Calendar" titleTh="ปฏิทิน" />
    </>
  );
}
