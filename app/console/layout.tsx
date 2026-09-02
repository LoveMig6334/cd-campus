import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ConsoleSidebar } from "@/components/console/ConsoleSidebar";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Scoreboard Console · CD Smart Campus" };

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  // proxy.ts already gates /console on a session; this catches a signed-in
  // user who isn't an active admin.
  try {
    await requireAdmin();
  } catch {
    redirect("/login?next=/console/match");
  }
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
      <ConsoleSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
