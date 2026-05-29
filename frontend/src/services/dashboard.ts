import api from "./api";
import { DashboardResponse } from "../types/dashboard";

export const dashboardService = {
  /**
   * Fetch all dashboard metrics, charts, and recent jobs
   */
  async getDashboardData(): Promise<DashboardResponse> {
    const response = await api.get<DashboardResponse>("/dashboard");
    return response.data;
  },
};

export default dashboardService;