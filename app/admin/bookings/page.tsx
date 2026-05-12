import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { StubCard } from "@/components/layout/StubCard";

export default function AdminBookings() {
  return (
    <>
      <AdminTopbar titleTh="จองห้อง" eyebrow="Bookings · Management" />
      <StubCard titleEn="Bookings" titleTh="จองห้อง" />
    </>
  );
}
