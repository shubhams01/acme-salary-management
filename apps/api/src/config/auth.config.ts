import "dotenv/config";

const accessSecret = process.env.JWT_ACCESS_SECRET;

if (!accessSecret || accessSecret.length < 32) {
  throw new Error(
    "JWT_ACCESS_SECRET must contain at least 32 characters"
  );
}

export const authConfig = {
  accessSecret,
  accessTokenTtl: "15m" as const,
  accessTokenTtlMs: 15 * 60 * 1000,
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,

  accessCookieName: "acme_access_token",
  refreshCookieName: "acme_refresh_token",

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  },
};