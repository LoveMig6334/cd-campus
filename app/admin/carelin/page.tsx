import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { CarelinDeskTable } from "@/components/admin/CarelinDeskTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { TabBar } from "@/components/admin/TabBar";
import { getCarelinDeskRows } from "@/lib/queries/carelin";
import { getCarelinKpis } from "@/lib/queries/siteConfig";
import {
  CARELIN_DESK_ACTIVE_TAB,
  CARELIN_DESK_TABS,
} from "@/lib/ui/carelin";

export default async function AdminCarelin() {
  const [kpis, rows] = await Promise.all([
    getCarelinKpis(),
    getCarelinDeskRows(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="ซีดีแคร์ลิน"
        eyebrow="Carelin Desk · the campus care line"
        actions={
          <>
            <AdminSearch />
            <Btn>Export ↓</Btn>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <Card>
        <CardTitle th="คำขอความช่วยเหลือ" en="All requests" />
        <TabBar tabs={CARELIN_DESK_TABS} activeId={CARELIN_DESK_ACTIVE_TAB} />
        <CarelinDeskTable rows={rows} />
      </Card>
    </>
  );
}
