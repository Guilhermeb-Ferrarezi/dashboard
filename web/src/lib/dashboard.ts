import { serverApi } from "@/lib/api-server";
import type { DashboardApiResponse } from "@/types/dashboard";

export async function loadDashboardSummary(cookieHeader: string) {
  const response = await serverApi<DashboardApiResponse>("/dashboard/summary", {
    cookieHeader,
  });

  return response;
}
