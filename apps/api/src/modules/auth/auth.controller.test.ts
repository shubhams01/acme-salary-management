import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response, NextFunction } from "express";

const authServiceMocks = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("./auth.service", () => ({
  AuthService: class {
    login = authServiceMocks.login;
    refresh = authServiceMocks.refresh;
    logout = authServiceMocks.logout;
    getCurrentUser = authServiceMocks.getCurrentUser;
  },
}));

const originalEnvironment = {
  jwtSecret: process.env.JWT_ACCESS_SECRET,
  nodeEnv: process.env.NODE_ENV,
};
let login: typeof import("./auth.controller").login;
let refresh: typeof import("./auth.controller").refresh;

function responseMock() {
  return {
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "test-secret-with-at-least-32-characters-long";
  process.env.NODE_ENV = "production";
  ({ login, refresh } = await import("./auth.controller"));
});

afterAll(() => {
  if (originalEnvironment.jwtSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
  else process.env.JWT_ACCESS_SECRET = originalEnvironment.jwtSecret;
  if (originalEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment.nodeEnv;
});

beforeEach(() => {
  authServiceMocks.login.mockReset();
  authServiceMocks.refresh.mockReset();
});

describe("authentication controller", () => {
  it("sets secure HTTP-only session cookies without returning token values in JSON", async () => {
    authServiceMocks.login.mockResolvedValue({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      user: { id: "user-123", email: "hr@example.com", role: "HR_MANAGER" },
    });
    const req = {
      body: { email: "hr@example.com", password: "correct-password" },
    } as Request;
    const res = responseMock();

    await login(req, res, vi.fn() as NextFunction);

    expect(authServiceMocks.login).toHaveBeenCalledWith(req.body);
    expect(res.cookie).toHaveBeenNthCalledWith(1, "acme_access_token", "access-secret", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });
    expect(res.cookie).toHaveBeenNthCalledWith(2, "acme_refresh_token", "refresh-secret", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Login successful",
      data: { user: { id: "user-123", email: "hr@example.com", role: "HR_MANAGER" } },
    });
  });

  it("rejects invalid login input before calling the authentication service", async () => {
    const req = { body: { email: "not-an-email", password: "" } } as Request;
    const res = responseMock();

    await login(req, res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Invalid login input",
    }));
    expect(authServiceMocks.login).not.toHaveBeenCalled();
  });

  it("rotates both session cookies when refreshing a valid refresh token", async () => {
    authServiceMocks.refresh.mockResolvedValue({
      accessToken: "new-access-secret",
      refreshToken: "new-refresh-secret",
      user: { id: "user-123", email: "hr@example.com", role: "HR_MANAGER" },
    });
    const req = { cookies: { acme_refresh_token: "old-refresh-secret" } } as unknown as Request;
    const res = responseMock();

    await refresh(req, res, vi.fn() as NextFunction);

    expect(authServiceMocks.refresh).toHaveBeenCalledWith("old-refresh-secret");
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie).toHaveBeenNthCalledWith(1, "acme_access_token", "new-access-secret", expect.objectContaining({ secure: true, httpOnly: true }));
    expect(res.cookie).toHaveBeenNthCalledWith(2, "acme_refresh_token", "new-refresh-secret", expect.objectContaining({ secure: true, httpOnly: true }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
