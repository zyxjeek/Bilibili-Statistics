"use client";

import { useDashboardData } from "@/components/dashboard-data-provider";
import { OverviewView } from "@/components/dashboard-shell";

export default function OverviewPage() {
  return <OverviewView data={useDashboardData()} />;
}
