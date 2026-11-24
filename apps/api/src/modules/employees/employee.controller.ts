import { NextFunction, Request, Response } from "express";

import { EmployeeService } from "./employee.service";
import {
  createEmployeeSchema,
  employeeIdSchema,
  employeeListQuerySchema,
  employeeStatusSchema,
  updateEmployeeSchema,
} from "./employee.validation";

const employeeService = new EmployeeService();

export async function listEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = employeeListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid employee query",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    res.json({ success: true, data: await employeeService.list(parsed.data) });
  } catch (error) {
    next(error);
  }
}

export async function getEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = employeeIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid employee ID" });
    return;
  }

  try {
    res.json({
      success: true,
      data: { employee: await employeeService.getById(parsed.data.id) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid employee input",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    const employee = await employeeService.create(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: { employee } });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeIdSchema.safeParse(req.params);
  const body = updateEmployeeSchema.safeParse(req.body);
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
      message: "Invalid employee input",
      errors: body.error.flatten(),
    });
    return;
  }

  try {
    const employee = await employeeService.update(
      params.data.id,
      body.data,
      req.user!.id
    );
    res.json({ success: true, data: { employee } });
  } catch (error) {
    next(error);
  }
}

export async function changeEmployeeStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const params = employeeIdSchema.safeParse(req.params);
  const body = employeeStatusSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      success: false,
      message: "Invalid employee status request",
    });
    return;
  }

  try {
    const employee = await employeeService.changeStatus(
      params.data.id,
      body.data.status,
      req.user!.id
    );
    res.json({ success: true, data: { employee } });
  } catch (error) {
    next(error);
  }
}
