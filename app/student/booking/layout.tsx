import type { ReactNode } from "react";
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function BookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isFeatureEnabled("booking"))) {
    return <FeatureUnavailable feature="booking" />;
  }
  return <>{children}</>;
}
