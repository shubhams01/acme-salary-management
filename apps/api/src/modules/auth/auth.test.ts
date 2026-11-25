import { beforeAll, describe, expect, it } from "vitest";
import { loginSchema } from "./auth.validation";

let authUtils: typeof import("./auth.utils");

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET =
    "test-secret-with-at-least-32-characters-long";
  authUtils = await import("./auth.utils");
});

describe("authentication token utilities", () => {
  it("round trips the access token identity claims", () => {
    const user = {
      sub: "user-123",
      email: "hr@example.com",
      role: "HR_MANAGER",
    };

    const token = authUtils.generateAccessToken(user);

    expect(authUtils.verifyAccessToken(token)).toEqual(user);
  });

  it("rejects an invalid access token", () => {
    expect(() => authUtils.verifyAccessToken("not-a-jwt")).toThrow();
  });

  it("generates opaque refresh tokens and hashes them consistently", () => {
    const firstToken = authUtils.generateRefreshToken();
    const secondToken = authUtils.generateRefreshToken();

    expect(firstToken).not.toBe(secondToken);
    expect(authUtils.hashRefreshToken(firstToken)).toBe(
      authUtils.hashRefreshToken(firstToken)
    );
    expect(authUtils.hashRefreshToken(firstToken)).not.toBe(
      authUtils.hashRefreshToken(secondToken)
    );
  });
});

describe("login request validation", () => {
  it("trims a valid email while preserving the password exactly", () => {
    expect(loginSchema.parse({ email: "  HR@example.com  ", password: " secure pass " })).toEqual({
      email: "HR@example.com",
      password: " secure pass ",
    });
  });

  it("rejects malformed email, empty password, and overlong credentials", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "secret" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "hr@example.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a".repeat(250) + "@example.com", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "hr@example.com", password: "x".repeat(129) }).success).toBe(false);
  });
});
