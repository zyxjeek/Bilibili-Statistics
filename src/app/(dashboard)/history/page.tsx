"use client";

import { HistoryTable } from "@/components/history-table";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { useSearchParams } from "next/navigation";

export default function HistoryPage() {
  const searchParams = useSearchParams();
  return <HistoryTable key={searchParams.toString()} rows={useDashboardData().rows} />;
}
