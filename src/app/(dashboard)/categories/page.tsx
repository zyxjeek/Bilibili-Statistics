"use client";

import { CategoryView } from "@/components/category-view";
import { useDashboardData } from "@/components/dashboard-data-provider";

export default function CategoriesPage() {
  return <CategoryView data={useDashboardData()} />;
}
