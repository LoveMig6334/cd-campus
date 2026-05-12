import type { ReactNode } from "react";
import { PhoneShell } from "@/components/layout/PhoneShell";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <PhoneShell footer={<StudentBottomNav />}>{children}</PhoneShell>;
}
