import { Router } from "express";

import { prisma } from "../../config/database";
import { authenticate, authorize } from "../auth/auth.middleware";

const router = Router();
router.use(authenticate, authorize("HR_ADMIN", "HR_MANAGER"));

router.get("/countries", async (_req, res, next) => {
  try {
    const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });
    res.json({ success: true, data: { countries } });
  } catch (error) {
    next(error);
  }
});

router.get("/departments", async (_req, res, next) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json({ success: true, data: { departments } });
  } catch (error) {
    next(error);
  }
});

router.get("/designations", async (_req, res, next) => {
  try {
    const designations = await prisma.designation.findMany({ orderBy: { title: "asc" } });
    res.json({ success: true, data: { designations } });
  } catch (error) {
    next(error);
  }
});

router.get("/currencies", async (_req, res, next) => {
  try {
    const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
    res.json({ success: true, data: { currencies } });
  } catch (error) {
    next(error);
  }
});

export default router;
