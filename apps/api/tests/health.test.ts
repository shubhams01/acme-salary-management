import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../src/config/database", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../src/config/database";
import app from "../src/app";

describe("Health API", () => {
  it("should return API liveness status", async () => {
    const response = await request(app)
      .get("/api/v1/health/live");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "API is running",
    });
  });

  it("should return database readiness status", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { "?column?": 1 },
    ]);

    const response = await request(app)
      .get("/api/v1/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return 500 when database is unavailable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
      new Error("Database unavailable")
    );

    const response = await request(app)
      .get("/api/v1/health/ready");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error",
    });
  });

  it("should return 404 for unknown routes", async () => {
    const response = await request(app)
      .get("/unknown");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});