import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-6 py-6">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
