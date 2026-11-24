import { Router } from "express";

import { authenticate, authorize } from "../auth/auth.middleware";
import {
  changeEmployeeStatus,
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from "./employee.controller";

const router = Router();

router.use(authenticate, authorize("HR_ADMIN", "HR_MANAGER"));
router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.post("/", createEmployee);
router.patch("/:id", updateEmployee);
router.patch("/:id/status", changeEmployeeStatus);

export default router;
