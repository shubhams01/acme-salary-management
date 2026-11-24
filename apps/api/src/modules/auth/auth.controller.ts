import { Request, Response, NextFunction } from "express";

import { AuthService } from "./auth.service";
import { loginSchema } from "./auth.validation";
import { authConfig } from "../../config/auth.config";

const authService = new AuthService();

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  res.cookie(
    authConfig.accessCookieName,
    accessToken,
    {
      ...authConfig.cookieOptions,
      maxAge: authConfig.accessTokenTtlMs,
    }
  );

  res.cookie(
    authConfig.refreshCookieName,
    refreshToken,
    {
      ...authConfig.cookieOptions,
      maxAge: authConfig.refreshTokenTtlMs,
    }
  );
}

function clearAuthCookies(res: Response) {
  res.clearCookie(
    authConfig.accessCookieName,
    authConfig.cookieOptions
  );

  res.clearCookie(
    authConfig.refreshCookieName,
    authConfig.cookieOptions
  );
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login input",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await authService.login(parsed.data);

    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawToken =
      req.cookies?.[authConfig.refreshCookieName];

    if (!rawToken) {
      clearAuthCookies(res);

      res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
      return;
    }

    const result = await authService.refresh(rawToken);

    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken
    );

    res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawToken =
      req.cookies?.[authConfig.refreshCookieName];

    await authService.logout(rawToken);

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await authService.getCurrentUser(
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}