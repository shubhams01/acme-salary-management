import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/database";
import { authConfig } from "../../config/auth.config";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.utils";

import { LoginInput } from "./auth.validation";

class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email.toLowerCase(),
      },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthError("Invalid email or password", 401);
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      input.password
    );

    if (!passwordValid) {
      throw new AuthError("Invalid email or password", 401);
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    const refreshToken = generateRefreshToken();

    const now = Date.now();

    await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(
          now + authConfig.refreshTokenTtlMs
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async refresh(rawToken: string) {
    const tokenHash = hashRefreshToken(rawToken);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const existingToken = await tx.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
      });

      if (
        !existingToken ||
        existingToken.revokedAt ||
        existingToken.expiresAt <= now ||
        !existingToken.user.isActive
      ) {
        throw new AuthError("Invalid refresh token", 401);
      }

      // Atomic one-time consumption prevents concurrent reuse.
      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: existingToken.id,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          revokedAt: now,
        },
      });

      if (consumed.count !== 1) {
        throw new AuthError("Invalid refresh token", 401);
      }

      const newRefreshToken = generateRefreshToken();

      await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: hashRefreshToken(newRefreshToken),
          expiresAt: new Date(
            now.getTime() + authConfig.refreshTokenTtlMs
          ),
        },
      });

      return {
        id: existingToken.user.id,
        email: existingToken.user.email,
        role: existingToken.user.role.name,
        refreshToken: newRefreshToken,
      };
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: user.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(rawToken?: string) {
    if (!rawToken) {
      return;
    }

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashRefreshToken(rawToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthError("User not found", 401);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };
  }
}
