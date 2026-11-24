import { Request, Response, NextFunction } from "express";

import { authConfig } from "../../config/auth.config";
import { prisma } from "../../config/database";
import { verifyAccessToken } from "./auth.utils";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[authConfig.accessCookieName];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const payload = verifyAccessToken(token);

    // Fetch current role and active status from DB.
    // This prevents stale JWT role claims from granting access.
    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid or inactive account",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
      return;
    }

    next();
  };
}