import type { ReactNode } from "react";
import { PhoneShell } from "@/components/layout/PhoneShell";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { StudentHeader } from "@/components/layout/StudentHeader";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <PhoneShell header={<StudentHeader />} footer={<StudentBottomNav />}>
      <div className="px-[18px] py-4">{children}</div>
    </PhoneShell>
  );
}
