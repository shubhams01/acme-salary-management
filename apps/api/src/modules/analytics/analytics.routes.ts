import { Router } from "express";

import { authenticate, authorize } from "../auth/auth.middleware";
import { AnalyticsService } from "./analytics.service";

const router = Router();
const analyticsService = new AnalyticsService();

router.use(authenticate, authorize("HR_ADMIN", "HR_MANAGER"));

router.get("/overview", async (_req, res, next) => {
  try {
    res.json({ success: true, data: await analyticsService.overview() });
  } catch (error) {
    next(error);
  }
});

router.get("/by-country", async (_req, res, next) => {
  try {
    res.json({ success: true, data: { items: await analyticsService.byCountry() } });
  } catch (error) {
    next(error);
  }
});

router.get("/by-department", async (_req, res, next) => {
  try {
    res.json({ success: true, data: { items: await analyticsService.byDepartment() } });
  } catch (error) {
    next(error);
  }
});

router.get("/distribution", async (_req, res, next) => {
  try {
    res.json({ success: true, data: { items: await analyticsService.distribution() } });
  } catch (error) {
    next(error);
  }
});

router.get("/trends", async (_req, res, next) => {
  try {
    res.json({ success: true, data: { items: await analyticsService.trends() } });
  } catch (error) {
    next(error);
  }
});

export default router;
