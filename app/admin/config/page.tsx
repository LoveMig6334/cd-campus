import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";

type KeyRow = {
  key: string;
  en: string;
  th: string;
};

const KEYS: KeyRow[] = [
  { key: "home_hero", en: "Home hero", th: "หน้าจอแรกของนักเรียน" },
  { key: "overview_kpis", en: "Overview KPIs", th: "ตัวเลขสรุปหน้าหลัก" },
  { key: "trend_chart", en: "Trend chart", th: "กราฟแนวโน้ม" },
  {
    key: "portfolio_stats",
    en: "Portfolio stats",
    th: "ตัวเลขโครงงาน · นักเรียน",
  },
  { key: "portfolio_kpis", en: "Portfolio KPIs", th: "ตัวเลขโครงงาน · ครู" },
  { key: "carelin_kpis", en: "Carelin KPIs", th: "ตัวเลขพี่แคร์ลิน · ครู" },
];

export default async function AdminConfigIndex() {
  return (
    <>
      <AdminTopbar titleTh="คอนฟิก" eyebrow="Site config" />

      <Card>
        <CardTitle th="คอนฟิกทั้งหมด" en="All keys" />
        <ul className="divide-mute-200 divide-y divide-dashed">
          {KEYS.map((k) => (
            <li
              key={k.key}
              className="flex items-center justify-between px-3 py-3"
            >
              <div>
                <div className="font-display text-[15px] italic">{k.en}</div>
                <div className="text-mute-500 font-mono text-[11px]">
                  {k.key} · {k.th}
                </div>
              </div>
              <Link
                href={`/admin/config/${k.key}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit →
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
