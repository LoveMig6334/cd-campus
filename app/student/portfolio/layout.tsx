import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function PortfolioLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("portfolio"))) {
    return <FeatureUnavailable feature="portfolio" />;
  }
  return <>{children}</>;
}
