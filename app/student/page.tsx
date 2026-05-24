import { connection } from "next/server";
import { MobileBody } from "@/components/layout/MobileBody";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { MenuGrid } from "@/components/student/MenuGrid";
import {
  BookingIcon,
  CalendarIcon,
  CarelinIcon,
  PortfolioIcon,
  PshareIcon,
  SportIcon,
} from "@/components/student/MenuIcons";
import { MenuTile } from "@/components/student/MenuTile";
import { SectionDivider } from "@/components/ui/SectionDivider";

export default async function StudentHome() {
  // No DB read here anymore, but StudentHeader renders new Date() — opt into
  // runtime rendering so the date header isn't frozen at build time.
  await connection();
  return (
    <>
      <StudentHeader />
      <MobileBody className="space-y-[18px]">
        <SectionDivider>★ Menu · เมนูหลัก ★</SectionDivider>

        <MenuGrid>
          <MenuTile
            href="/student/calendar"
            labelEn="Calendar"
            labelTh="ปฏิทินกิจกรรม"
            star={{ color: "ink", position: "tl" }}
          >
            <CalendarIcon />
          </MenuTile>
          <MenuTile
            href="/student/booking"
            labelEn="Booking"
            labelTh="จองห้อง"
            star={{ color: "yellow", position: "tr" }}
          >
            <BookingIcon />
          </MenuTile>
          <MenuTile
            href="/student/sport"
            labelEn="Sport Day"
            labelTh="กีฬาสี · Live"
          >
            <SportIcon />
          </MenuTile>
          <MenuTile
            href="/student/portfolio"
            labelEn="Portfolio"
            labelTh="รุ่นพี่ · Alumni"
            star={{ color: "ink", position: "tl" }}
          >
            <PortfolioIcon />
          </MenuTile>
          <MenuTile
            href="/student/pshare"
            labelEn="P'share"
            labelTh="พี่แชร์ น้องชัวร์"
            star={{ color: "blue", position: "tr" }}
          >
            <PshareIcon />
          </MenuTile>
          <MenuTile
            href="/student/carelin"
            labelEn="CD Carelin"
            labelTh="เรื่องที่อยากเล่า"
            star={{ color: "pink", position: "tl" }}
          >
            <CarelinIcon />
          </MenuTile>
        </MenuGrid>
      </MobileBody>
    </>
  );
}
