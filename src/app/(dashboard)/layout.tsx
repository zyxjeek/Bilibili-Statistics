import { DashboardDataProvider } from "@/components/dashboard-data-provider";
import { DashboardFrame } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getDashboardData();

  return (
    <DashboardDataProvider data={data}>
      <DashboardFrame>{children}</DashboardFrame>
    </DashboardDataProvider>
  );
}
