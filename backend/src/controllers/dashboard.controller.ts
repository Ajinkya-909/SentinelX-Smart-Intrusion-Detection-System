import { Request, Response, NextFunction } from "express";
import { dashboardService } from "@/services/dashboard.service";

class DashboardController {
  async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;

      const dashboard =
        await dashboardService.getDashboard(userId);

      return res.status(200).json({
        success: true,
        message: "Dashboard fetched successfully",
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController =
  new DashboardController();