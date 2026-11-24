import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../config/database";
import { authenticate, authorize } from "../auth/auth.middleware";

const router = Router();
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const idSchema = z.string().uuid();

router.use(authenticate, authorize("HR_ADMIN", "HR_MANAGER"));

router.get("/", async (req, res, next) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid audit log query",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const { page, pageSize } = parsed.data;
  try {
    const [total, items] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true } },
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid audit log ID" });
    return;
  }

  try {
    const item = await prisma.auditLog.findUnique({
      where: { id: parsed.data },
      include: {
        user: { select: { id: true, email: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });
    if (!item) {
      res.status(404).json({ success: false, message: "Audit log not found" });
      return;
    }
    res.json({ success: true, data: { item } });
  } catch (error) {
    next(error);
  }
});

export default router;
