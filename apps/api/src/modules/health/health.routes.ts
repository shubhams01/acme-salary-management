import { Router } from "express";
import { prisma } from "../../config/database";

const router = Router();

// Liveness check
router.get("/live", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// Readiness check
router.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "API and database are ready",
    });
  } catch (error) {
    next(error);
  }
});

export default router;