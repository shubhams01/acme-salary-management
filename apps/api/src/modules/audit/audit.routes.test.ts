import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../config/database", () => ({
  prisma: {
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../../config/database";
import auditRoutes from "./audit.routes";

const app = express();
app.use("/api/v1/audit-logs", auditRoutes);
const validId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.mocked(prisma.auditLog.count).mockReset();
  vi.mocked(prisma.auditLog.findMany).mockReset();
  vi.mocked(prisma.auditLog.findUnique).mockReset();
});

describe("audit log routes", () => {
  it("returns descending audit history with server-side pagination", async () => {
    const items = [{ id: validId, action: "EMPLOYEE_UPDATED" }];
    vi.mocked(prisma.auditLog.count).mockResolvedValue(23);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(items as never);

    const response = await request(app).get("/api/v1/audit-logs?page=2&pageSize=10");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { items, pagination: { page: 2, pageSize: 10, total: 23, totalPages: 3 } },
    });
    expect(prisma.auditLog.count).toHaveBeenCalledOnce();
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
      include: {
        user: { select: { id: true, email: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });
  });

  it("rejects invalid pagination before querying storage", async () => {
    const response = await request(app).get("/api/v1/audit-logs?page=0&pageSize=101");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, message: "Invalid audit log query" });
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("validates audit IDs and returns 404 for a missing log entry", async () => {
    const invalidResponse = await request(app).get("/api/v1/audit-logs/not-a-uuid");
    expect(invalidResponse.status).toBe(400);
    expect(prisma.auditLog.findUnique).not.toHaveBeenCalled();

    vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(null);
    const missingResponse = await request(app).get(`/api/v1/audit-logs/${validId}`);
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body).toEqual({ success: false, message: "Audit log not found" });
    expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
      where: { id: validId },
      include: {
        user: { select: { id: true, email: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });
  });
});
