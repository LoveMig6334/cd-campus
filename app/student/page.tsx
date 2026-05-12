import { MobileBody } from "@/components/layout/MobileBody";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { HeroCard } from "@/components/student/HeroCard";
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
import { getHomeHero } from "@/lib/queries/siteConfig";

export default async function StudentHome() {
  const hero = await getHomeHero();
  return (
    <>
      <StudentHeader />
      <MobileBody className="space-y-[18px]">
        <HeroCard hero={hero} />

        <SectionDivider>★ Menu · เมนูหลัก ★</SectionDivider>

        <MenuGrid>
          <MenuTile
            href="/student/calendar"
            labelEn="Calendar"
            labelTh="ปฏิทินกิจกรรม"
            art="bk"
            star={{ color: "ink", position: "tl" }}
          >
            <CalendarIcon />
          </MenuTile>
          <MenuTile
            href="/student/booking"
            labelEn="Booking"
            labelTh="จองห้อง"
            art="bl"
            star={{ color: "yellow", position: "tr" }}
          >
            <BookingIcon />
          </MenuTile>
          <MenuTile
            href="/student/sport"
            labelEn="Sport Day"
            labelTh="กีฬาสี · Live"
            art="bk"
          >
            <SportIcon />
          </MenuTile>
          <MenuTile
            href="/student/portfolio"
            labelEn="Portfolio"
            labelTh="รุ่นพี่ · Alumni"
            art="bl"
            star={{ color: "ink", position: "tl" }}
          >
            <PortfolioIcon />
          </MenuTile>
          <MenuTile
            href="/student/pshare"
            labelEn="P'share"
            labelTh="พี่แชร์ น้องชัวร์"
            art="bl"
            star={{ color: "blue", position: "tr" }}
          >
            <PshareIcon />
          </MenuTile>
          <MenuTile
            href="/student/carelin"
            labelEn="CD Carelin"
            labelTh="เรื่องที่อยากเล่า"
            art="bk"
            star={{ color: "pink", position: "tl" }}
          >
            <CarelinIcon />
          </MenuTile>
        </MenuGrid>
      </MobileBody>
    </>
  );
}
