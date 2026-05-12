import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";

type Row = {
  key: string;
  titleEn: string;
  titleTh: string;
  blurb: string;
};

const ROWS: Row[] = [
  {
    key: "home_hero",
    titleEn: "Home hero",
    titleTh: "หน้าจอแรกของนักเรียน",
    blurb: "Eyebrow, headline lines, leading house pill, location, weather.",
  },
  {
    key: "overview_kpis",
    titleEn: "Overview KPIs",
    titleTh: "ตัวเลขสรุปหน้าหลัก",
    blurb: "Four KPI cards on /admin (Students · Events · Bookings · L&F).",
  },
  {
    key: "trend_chart",
    titleEn: "Trend chart",
    titleTh: "กราฟแนวโน้ม",
    blurb: "12 month labels + 13 SVG points. Path is server-derived.",
  },
  {
    key: "portfolio_stats",
    titleEn: "Portfolio stats",
    titleTh: "ตัวเลขโครงงาน · นักเรียน",
    blurb: "Three big numbers on /student/portfolio.",
  },
  {
    key: "portfolio_kpis",
    titleEn: "Portfolio KPIs",
    titleTh: "ตัวเลขโครงงาน · ครู",
    blurb: "Four KPI cards on /admin/portfolio.",
  },
  {
    key: "carelin_kpis",
    titleEn: "Carelin KPIs",
    titleTh: "ตัวเลขพี่แคร์ลิน · ครู",
    blurb: "Four KPI cards on /admin/carelin.",
  },
];

export default async function AdminConfigIndex() {
  return (
    <>
      <AdminTopbar
        titleTh="คอนฟิก"
        eyebrow="Site config"
      />

      <Card>
        <CardTitle th="คอนฟิกทั้งหมด" en="All keys" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Key", "Title · ชื่อ", "What it controls", ""].map((h, i) => (
                <th
                  key={i}
                  className="border-b-[1.5px] border-ink bg-cream px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const td =
                i < ROWS.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={r.key}
                  className="transition-colors hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <span className="font-mono text-[12px] text-mute-700">
                      {r.key}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-display italic text-[18px]">
                      {r.titleEn}
                    </span>
                    <small className="mt-px block font-mono text-[10px] text-mute-500">
                      {r.titleTh}
                    </small>
                  </td>
                  <td className={td}>
                    <span className="text-mute-700">{r.blurb}</span>
                  </td>
                  <td className={td}>
                    <Link
                      href={`/admin/config/${r.key}/edit`}
                      className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
