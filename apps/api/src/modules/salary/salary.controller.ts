import { NextFunction, Request, Response } from "express";

import { SalaryService } from "./salary.service";
import {
  createSalaryRevisionSchema,
  createSalarySchema,
  employeeSalaryParamsSchema,
  salaryRevisionParamsSchema,
} from "./salary.validation";

const salaryService = new SalaryService();

export async function getCurrentSalary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeSalaryParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: "Invalid employee ID" });
    return;
  }

  try {
    res.json({
      success: true,
      data: { salary: await salaryService.getCurrent(params.data.employeeId) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalaryHistory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeSalaryParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: "Invalid employee ID" });
    return;
  }

  try {
    res.json({
      success: true,
      data: { revisions: await salaryService.getHistory(params.data.employeeId) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalaryRevision(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = salaryRevisionParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: "Invalid salary revision ID" });
    return;
  }

  try {
    const revision = await salaryService.getRevision(
      params.data.employeeId,
      params.data.revisionId
    );
    res.json({ success: true, data: { revision } });
  } catch (error) {
    next(error);
  }
}

export async function createSalary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeSalaryParamsSchema.safeParse(req.params);
  const body = createSalarySchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({
      success: false,
      message: "Invalid employee ID",
      errors: params.error.flatten(),
    });
    return;
  }
  if (!body.success) {
    res.status(400).json({
      success: false,
      message: "Invalid salary request",
      errors: body.error.flatten(),
    });
    return;
  }

  try {
    const salary = await salaryService.create(
      params.data.employeeId,
      body.data,
      req.user!.id
    );
    res.status(201).json({ success: true, data: { salary } });
  } catch (error) {
    next(error);
  }
}

export async function createSalaryRevision(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeSalaryParamsSchema.safeParse(req.params);
  const body = createSalaryRevisionSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({
      success: false,
      message: "Invalid employee ID",
      errors: params.error.flatten(),
    });
    return;
  }
  if (!body.success) {
    res.status(400).json({
      success: false,
      message: "Invalid salary revision request",
      errors: body.error.flatten(),
    });
    return;
  }

  try {
    const revision = await salaryService.revise(
      params.data.employeeId,
      body.data,
      req.user!.id
    );
    res.status(201).json({ success: true, data: { revision } });
  } catch (error) {
    next(error);
  }
}
