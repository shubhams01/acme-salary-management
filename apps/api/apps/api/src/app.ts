import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./modules/health/health.routes";
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

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "ACME Salary Management API",
    version: "1.0.0",
  });
});

app.use("/api/v1/health", healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;