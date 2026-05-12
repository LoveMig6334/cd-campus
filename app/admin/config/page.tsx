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
  { key: "portfolio_stats", en: "Portfolio stats", th: "ตัวเลขโครงงาน · นักเรียน" },
  { key: "portfolio_kpis", en: "Portfolio KPIs", th: "ตัวเลขโครงงาน · ครู" },
  { key: "carelin_kpis", en: "Carelin KPIs", th: "ตัวเลขพี่แคร์ลิน · ครู" },
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
        <ul className="divide-y divide-dashed divide-mute-200">
          {KEYS.map((k) => (
            <li key={k.key} className="flex items-center justify-between px-3 py-3">
              <div>
                <div className="font-display italic text-[15px]">{k.en}</div>
                <div className="font-mono text-[11px] text-mute-500">{k.key} · {k.th}</div>
              </div>
              <Link
                href={`/admin/config/${k.key}/edit`}
                className="border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700 hover:bg-cream"
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
