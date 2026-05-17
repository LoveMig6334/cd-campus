import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function PshareLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("pshare"))) {
    return <FeatureUnavailable feature="pshare" />;
  }
  return <>{children}</>;
}
