import type { ReactNode } from "react";
import { AdminSidebar, type NavItem } from "@/components/layout/AdminSidebar";
import { requireAdmin } from "@/lib/auth";

const ADMINS_NAV: NavItem = {
  href: "/admin/admins",
  en: "Admins",
  th: "แอดมิน",
  icon: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21c1 -3.5 4 -5 6 -5s5 1.5 6 5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M14 21c0 -2.5 2 -4 3 -4s3 1.5 3 4" />
    </>
  ),
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const extraItems: NavItem[] = admin.tier === "root" ? [ADMINS_NAV] : [];
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-6 py-6">
      <AdminSidebar extraItems={extraItems} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
