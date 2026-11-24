import { Prisma } from "@prisma/client";

import { SalaryPackageInput } from "./salary.validation";

export class SalaryCalculationError extends Error {
  readonly statusCode = 400;

  constructor(message = "Deductions cannot exceed gross salary") {
    super(message);
    this.name = "SalaryCalculationError";
  }
}

export function calculateSalary(input: SalaryPackageInput) {
  const base = new Prisma.Decimal(input.baseSalary);
  let gross = base;
  let deductions = new Prisma.Decimal(0);

  for (const component of input.components) {
    const amount = new Prisma.Decimal(component.amount);
    if (component.type === "DEDUCTION") deductions = deductions.plus(amount);
    else gross = gross.plus(amount);
  }

  const net = gross.minus(deductions);
  if (net.isNegative()) throw new SalaryCalculationError();
  if (
    base.precision() > 19 ||
    gross.precision() > 19 ||
    net.precision() > 19 ||
    base.decimalPlaces() > 4 ||
    gross.decimalPlaces() > 4 ||
    net.decimalPlaces() > 4
  ) {
    throw new SalaryCalculationError("Calculated amount exceeds DECIMAL(19,4)");
  }

  return {
    baseSalary: base,
    grossSalary: gross,
    netSalary: net,
  };
}

export function previousDay(date: Date): Date {
  const previous = new Date(date);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous;
}
