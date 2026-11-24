import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import salaryRoutes from "./modules/salary/salary.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import auditRoutes from "./modules/audit/audit.routes";

import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "ACME Salary Management API",
    version: "1.0.0",
  });
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1", organizationRoutes);
app.use("/api/v1", salaryRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/audit-logs", auditRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
