import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function CalendarLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("calendar"))) {
    return <FeatureUnavailable feature="calendar" />;
  }
  return <>{children}</>;
}
