import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function CarelinLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("carelin"))) {
    return <FeatureUnavailable feature="carelin" />;
  }
  return <>{children}</>;
}
