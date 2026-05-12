import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { PortfolioAdminTable } from "@/components/admin/PortfolioAdminTable";
import { TabBar } from "@/components/admin/TabBar";
import { getAdminPortfolioRows } from "@/lib/queries/projects";
import { getPortfolioKpis } from "@/lib/queries/siteConfig";
import {
  PORTFOLIO_ACTIVE_TAB,
  PORTFOLIO_TABS,
} from "@/lib/ui/portfolio";

export default async function AdminPortfolio() {
  const [kpis, rows] = await Promise.all([
    getPortfolioKpis(),
    getAdminPortfolioRows(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="จัดการ Portfolio"
        eyebrow="Portfolio Manager · รุ่นพี่"
        actions={
          <>
            <AdminSearch placeholder="🔍  Search projects, authors…" />
            <Btn>Export ↓</Btn>
            <Btn variant="primary">+ Add Project</Btn>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <TabBar tabs={PORTFOLIO_TABS} activeId={PORTFOLIO_ACTIVE_TAB} />

      <Card className="!p-0">
        <PortfolioAdminTable rows={rows} />
      </Card>
    </>
  );
}
