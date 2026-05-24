import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { PortfolioAdminTable } from "@/components/admin/PortfolioAdminTable";
import { TabBar } from "@/components/admin/TabBar";
import {
  getAdminPortfolioRows,
  getPortfolioKpis,
} from "@/lib/queries/projects";
import { PORTFOLIO_ACTIVE_TAB, PORTFOLIO_TABS } from "@/lib/ui/portfolio";

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
            <Btn type="button">Export ↓</Btn>
            <Link
              href="/admin/portfolio/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + Add Project
            </Link>
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
