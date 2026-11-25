import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import argon2 from "argon2";

vi.mock("argon2", () => ({
  default: { verify: vi.fn() },
}));

vi.mock("../../config/database", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    refreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../config/database";

const fixedNow = new Date("2026-11-25T12:00:00.000Z");
const activeUser = {
  id: "user-123",
  email: "hr@example.com",
  passwordHash: "argon-hash",
  isActive: true,
  role: { name: "HR_MANAGER" },
};

let AuthService: typeof import("./auth.service").AuthService;
let verifyAccessToken: typeof import("./auth.utils").verifyAccessToken;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "test-secret-with-at-least-32-characters-long";
  ({ AuthService } = await import("./auth.service"));
  ({ verifyAccessToken } = await import("./auth.utils"));
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fixedNow);
  vi.mocked(prisma.user.findUnique).mockReset();
  vi.mocked(prisma.refreshToken.create).mockReset();
  vi.mocked(prisma.refreshToken.updateMany).mockReset();
  vi.mocked(prisma.$transaction).mockReset();
  vi.mocked(argon2.verify).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AuthService", () => {
  it("authenticates case-insensitively and stores only a hash of the refresh token", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(true);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
    const service = new AuthService();

    const result = await service.login({ email: "HR@Example.com", password: "secret" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "hr@example.com" },
      include: { role: true },
    });
    expect(argon2.verify).toHaveBeenCalledWith("argon-hash", "secret");
    expect(result.user).toEqual({ id: "user-123", email: "hr@example.com", role: "HR_MANAGER" });
    expect(verifyAccessToken(result.accessToken)).toMatchObject({
      sub: "user-123",
      email: "hr@example.com",
      role: "HR_MANAGER",
    });

    const savedRefreshToken = vi.mocked(prisma.refreshToken.create).mock.calls[0][0].data;
    expect(savedRefreshToken.userId).toBe("user-123");
    expect(savedRefreshToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(savedRefreshToken.tokenHash).not.toBe(result.refreshToken);
    expect(savedRefreshToken.expiresAt).toEqual(new Date("2026-12-02T12:00:00.000Z"));
  });

  it("rejects invalid passwords without creating a refresh session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
    vi.mocked(argon2.verify).mockResolvedValue(false);
    const service = new AuthService();

    await expect(service.login({ email: "hr@example.com", password: "wrong" }))
      .rejects.toMatchObject({ message: "Invalid email or password", statusCode: 401 });

    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects inactive accounts before checking the password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...activeUser, isActive: false } as never);
    const service = new AuthService();

    await expect(service.login({ email: "hr@example.com", password: "secret" }))
      .rejects.toMatchObject({ message: "Invalid email or password", statusCode: 401 });

    expect(argon2.verify).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rotates a refresh token in one transaction and issues a matching access token", async () => {
    const rawRefreshToken = "presented-refresh-token";
    const nextRefreshToken = {
      id: "token-123",
      userId: "user-123",
      tokenHash: "stored-hash",
      revokedAt: null,
      expiresAt: new Date("2026-12-01T12:00:00.000Z"),
      user: {
        id: "user-123",
        email: "hr@example.com",
        isActive: true,
        role: { name: "HR_MANAGER" },
      },
    };
    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue(nextRefreshToken),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({} as never),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const service = new AuthService();

    const result = await service.refresh(rawRefreshToken);

    expect(tx.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String) },
      include: { user: { include: { role: true } } },
    });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: "token-123", revokedAt: null, expiresAt: { gt: fixedNow } },
      data: { revokedAt: fixedNow },
    });
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        tokenHash: expect.any(String),
        expiresAt: new Date("2026-12-02T12:00:00.000Z"),
      },
    });
    expect(result.refreshToken).not.toBe(rawRefreshToken);
    expect(verifyAccessToken(result.accessToken)).toMatchObject({
      sub: "user-123",
      email: "hr@example.com",
      role: "HR_MANAGER",
    });
  });

  it.each([
    ["expired", new Date("2026-11-25T11:59:59.000Z"), null],
    ["revoked", new Date("2026-12-01T12:00:00.000Z"), fixedNow],
  ])("rejects a %s refresh token", async (_label, expiresAt, revokedAt) => {
    const tx = {
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: "token-123",
          userId: "user-123",
          revokedAt,
          expiresAt,
          user: { ...activeUser, role: { name: "HR_MANAGER" } },
        }),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const service = new AuthService();

    await expect(service.refresh("stale-refresh-token"))
      .rejects.toMatchObject({ message: "Invalid refresh token", statusCode: 401 });

    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it("revokes a refresh token by its hash on logout", async () => {
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as never);
    const service = new AuthService();

    await service.logout("refresh-token-to-revoke");

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: fixedNow },
    });
  });
});
