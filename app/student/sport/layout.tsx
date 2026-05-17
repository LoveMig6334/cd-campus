import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function SportLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("sport"))) {
    return <FeatureUnavailable feature="sport" />;
  }
  return <>{children}</>;
}
