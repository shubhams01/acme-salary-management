import { z } from "zod";

const moneySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/, "Enter a non-negative amount with up to four decimal places");

const componentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["ALLOWANCE", "BONUS", "DEDUCTION"]),
  amount: moneySchema,
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date is invalid");

const salaryPackageSchema = z.object({
  currencyId: z.string().uuid(),
  baseSalary: moneySchema,
  effectiveFrom: dateSchema,
  components: z.array(componentSchema).max(20).default([]),
});

export const createSalarySchema = salaryPackageSchema;
export const createSalaryRevisionSchema = salaryPackageSchema;

export const employeeSalaryParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

export const salaryRevisionParamsSchema = employeeSalaryParamsSchema.extend({
  revisionId: z.string().uuid(),
});

export type SalaryPackageInput = z.infer<typeof salaryPackageSchema>;
