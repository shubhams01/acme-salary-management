import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../config/database", () => ({
  prisma: {
    country: { findMany: vi.fn() },
    department: { findMany: vi.fn() },
    designation: { findMany: vi.fn() },
    currency: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../config/database";
import organizationRoutes from "./organization.routes";

const app = express();
app.use("/api/v1", organizationRoutes);

beforeEach(() => {
  vi.mocked(prisma.country.findMany).mockReset();
  vi.mocked(prisma.department.findMany).mockReset();
  vi.mocked(prisma.designation.findMany).mockReset();
  vi.mocked(prisma.currency.findMany).mockReset();
});

describe("organization reference routes", () => {
  it.each([
    ["countries", "country", "findMany", [{ id: "country-1", name: "India" }], { countries: [{ id: "country-1", name: "India" }] }, "name"],
    ["departments", "department", "findMany", [{ id: "department-1", name: "Engineering" }], { departments: [{ id: "department-1", name: "Engineering" }] }, "name"],
    ["designations", "designation", "findMany", [{ id: "designation-1", title: "Engineer" }], { designations: [{ id: "designation-1", title: "Engineer" }] }, "title"],
    ["currencies", "currency", "findMany", [{ id: "currency-1", code: "INR" }], { currencies: [{ id: "currency-1", code: "INR" }] }, "code"],
  ])("returns sorted %s reference data", async (path, model, _method, rows, data, sortField) => {
    const findMany = prisma[model as "country"].findMany;
    vi.mocked(findMany).mockResolvedValue(rows as never);

    const response = await request(app).get(`/api/v1/${path}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data });
    expect(findMany).toHaveBeenCalledWith({ orderBy: { [sortField as string]: "asc" } });
  });
});
