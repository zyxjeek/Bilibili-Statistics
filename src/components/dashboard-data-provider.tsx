"use client";

import { createContext, useContext } from "react";
import type { DashboardData } from "@/lib/types";

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({
  children,
  data,
}: {
  children: React.ReactNode;
  data: DashboardData;
}) {
  return <DashboardDataContext.Provider value={data}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const data = useContext(DashboardDataContext);

  if (!data) {
    throw new Error("useDashboardData must be used inside DashboardDataProvider");
  }

  return data;
}
