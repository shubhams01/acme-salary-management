import crypto from "node:crypto";
import jwt, { SignOptions } from "jsonwebtoken";

import { authConfig } from "../../config/auth.config";
import { AccessTokenPayload } from "./auth.types";

export function generateAccessToken(
  payload: AccessTokenPayload
): string {
  return jwt.sign(
    payload,
    authConfig.accessSecret,
    {
      algorithm: "HS256",
      expiresIn: authConfig.accessTokenTtl,
    } satisfies SignOptions
  );
}

export function verifyAccessToken(
  token: string
): AccessTokenPayload {
  const payload = jwt.verify(
    token,
    authConfig.accessSecret,
    {
      algorithms: ["HS256"],
    }
  );

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}