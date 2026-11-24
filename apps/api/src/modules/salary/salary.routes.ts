import { Router } from "express";

import { authenticate, authorize } from "../auth/auth.middleware";
import {
  createSalary,
  createSalaryRevision,
  getCurrentSalary,
  getSalaryHistory,
  getSalaryRevision,
} from "./salary.controller";

const router = Router();

router.use(authenticate, authorize("HR_ADMIN", "HR_MANAGER"));
router.get("/employees/:employeeId/salary", getCurrentSalary);
router.post("/employees/:employeeId/salary", createSalary);
router.post("/employees/:employeeId/salary/revisions", createSalaryRevision);
router.get("/employees/:employeeId/salary/history", getSalaryHistory);
router.get(
  "/employees/:employeeId/salary/history/:revisionId",
  getSalaryRevision
);

export default router;
