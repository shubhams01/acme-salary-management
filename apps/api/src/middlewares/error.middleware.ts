import {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import { Prisma } from "@prisma/client";

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  const prismaStatusCode =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? ({ P2002: 409, P2003: 400, P2025: 404 } as Record<string, number>)[
          error.code
        ]
      : undefined;
  const statusCode =
    prismaStatusCode ??
    (typeof error.statusCode === "number" ? error.statusCode : 500);

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : prismaStatusCode
          ? "Request conflicts with existing or related data"
          : error.message,
  });
};
