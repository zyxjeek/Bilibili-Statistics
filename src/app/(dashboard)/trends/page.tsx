import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getDashboardData();
  return <DashboardShell data={data} activeView="trends" />;
}
