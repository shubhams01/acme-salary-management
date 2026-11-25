import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";

vi.mock("../../config/database", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { prisma } from "../../config/database";

let authenticate: typeof import("./auth.middleware").authenticate;
let authorize: typeof import("./auth.middleware").authorize;
let generateAccessToken: typeof import("./auth.utils").generateAccessToken;

const activeUser = {
  id: "user-123",
  email: "hr@example.com",
  isActive: true,
  role: { name: "HR_ADMIN" },
};

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "test-secret-with-at-least-32-characters-long";
  ({ authenticate, authorize } = await import("./auth.middleware"));
  ({ generateAccessToken } = await import("./auth.utils"));
});

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockReset();
});

afterEach(() => vi.useRealTimers());

describe("authentication middleware", () => {
  it("loads current user and role from the database for a valid access cookie", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
    const req = {
      cookies: { acme_access_token: generateAccessToken({ sub: "user-123", email: "hr@example.com", role: "HR_MANAGER" }) },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" }, include: { role: true },
    });
    expect(req.user).toEqual({ id: "user-123", email: "hr@example.com", role: "HR_ADMIN" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects requests without an access cookie before querying the database", async () => {
    const req = { cookies: {} } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Authentication required" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens and inactive users", async () => {
    const invalidReq = { cookies: { acme_access_token: "not-a-jwt" } } as unknown as Request;
    const invalidRes = makeResponse();
    await authenticate(invalidReq, invalidRes, vi.fn());
    expect(invalidRes.status).toHaveBeenCalledWith(401);
    expect(invalidRes.json).toHaveBeenCalledWith({
      success: false, message: "Invalid or expired access token",
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...activeUser, isActive: false } as never);
    const inactiveReq = {
      cookies: { acme_access_token: generateAccessToken({ sub: "user-123", email: "hr@example.com", role: "HR_ADMIN" }) },
    } as unknown as Request;
    const inactiveRes = makeResponse();
    const next = vi.fn();
    await authenticate(inactiveReq, inactiveRes, next);

    expect(inactiveRes.status).toHaveBeenCalledWith(401);
    expect(inactiveRes.json).toHaveBeenCalledWith({ success: false, message: "Invalid or inactive account" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows only explicitly authorized roles", () => {
    const allowedReq = { user: { id: "user-123", email: "hr@example.com", role: "HR_MANAGER" } } as Request;
    const allowedNext = vi.fn();
    const allowedRes = makeResponse();
    authorize("HR_ADMIN", "HR_MANAGER")(allowedReq, allowedRes, allowedNext);
    expect(allowedNext).toHaveBeenCalledOnce();

    const deniedReq = { user: { ...allowedReq.user!, role: "EMPLOYEE" } } as Request;
    const deniedNext = vi.fn();
    const deniedRes = makeResponse();
    authorize("HR_ADMIN", "HR_MANAGER")(deniedReq, deniedRes, deniedNext);
    expect(deniedRes.status).toHaveBeenCalledWith(403);
    expect(deniedRes.json).toHaveBeenCalledWith({ success: false, message: "Insufficient permissions" });
    expect(deniedNext).not.toHaveBeenCalled();
  });
});
