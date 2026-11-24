import { EmployeeStatus } from "@prisma/client";
import { z } from "zod";

const uuidSchema = z.string().uuid();

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  countryId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  designationId: uuidSchema.optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  sortBy: z
    .enum([
      "employeeCode",
      "firstName",
      "lastName",
      "email",
      "status",
      "createdAt",
    ])
    .default("employeeCode"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const createEmployeeSchema = z.object({
  employeeCode: z.string().trim().min(1).max(32),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  countryId: uuidSchema,
  departmentId: uuidSchema,
  designationId: uuidSchema,
  status: z.nativeEnum(EmployeeStatus).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ status: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one employee field must be provided",
  });

export const employeeStatusSchema = z.object({
  status: z.nativeEnum(EmployeeStatus),
});

export const employeeIdSchema = z.object({
  id: uuidSchema,
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
