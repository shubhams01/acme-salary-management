import { beforeAll, describe, expect, it } from "vitest";

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
