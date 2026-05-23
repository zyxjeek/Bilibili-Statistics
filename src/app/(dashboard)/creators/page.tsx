"use client";

import { CreatorView } from "@/components/creator-view";
import { useDashboardData } from "@/components/dashboard-data-provider";

export default function CreatorsPage() {
  return <CreatorView data={useDashboardData()} />;
}
