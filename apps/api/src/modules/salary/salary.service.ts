import { randomUUID } from "node:crypto";
import {
  AuditAction,
  ComponentType,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../config/database";
import { calculateSalary, previousDay } from "./salary.math";
import { SalaryPackageInput } from "./salary.validation";

class SalaryServiceError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "SalaryServiceError";
  }
}

function componentsForRevision(
  revisionId: string,
  input: SalaryPackageInput
) {
  return [
    {
      name: "Base salary",
      type: ComponentType.BASE,
      amount: input.baseSalary,
    },
    ...input.components,
  ].map((component) => ({
    salaryRevisionId: revisionId,
    name: component.name,
    type: component.type,
    amount: new Prisma.Decimal(component.amount),
  }));
}

async function verifyReferences(
  employeeId: string,
  currencyId: string,
  tx: Prisma.TransactionClient
) {
  const [employee, currency] = await Promise.all([
    tx.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
    tx.currency.findUnique({ where: { id: currencyId }, select: { id: true } }),
  ]);

  if (!employee) throw new SalaryServiceError("Employee not found", 404);
  if (!currency) throw new SalaryServiceError("Currency not found", 400);
}

export class SalaryService {
  async getCurrent(employeeId: string) {
    const salary = await prisma.salary.findUnique({
      where: { employeeId },
      include: {
        revisions: {
          where: { effectiveFrom: { lte: new Date() } },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          include: { currency: true, components: true },
        },
      },
    });

    if (!salary) throw new SalaryServiceError("Salary record not found", 404);
    return salary;
  }

  async getHistory(employeeId: string) {
    const salary = await prisma.salary.findUnique({
      where: { employeeId },
      include: {
        revisions: {
          orderBy: { effectiveFrom: "desc" },
          include: { currency: true, components: true },
        },
      },
    });

    if (!salary) throw new SalaryServiceError("Salary record not found", 404);
    return salary.revisions;
  }

  async getRevision(employeeId: string, revisionId: string) {
    const revision = await prisma.salaryRevision.findFirst({
      where: { id: revisionId, salary: { employeeId } },
      include: { currency: true, components: true },
    });

    if (!revision) throw new SalaryServiceError("Salary revision not found", 404);
    return revision;
  }

  async create(employeeId: string, input: SalaryPackageInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      await verifyReferences(employeeId, input.currencyId, tx);
      const existing = await tx.salary.findUnique({ where: { employeeId } });
      if (existing) throw new SalaryServiceError("Salary record already exists", 409);

      const calculated = calculateSalary(input);
      const revisionId = randomUUID();
      const salary = await tx.salary.create({
        data: {
          employeeId,
          revisions: {
            create: {
              id: revisionId,
              currencyId: input.currencyId,
              ...calculated,
              effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
              components: {
                create: componentsForRevision(revisionId, input),
              },
            },
          },
        },
        include: {
          revisions: {
            include: { currency: true, components: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          employeeId,
          action: AuditAction.SALARY_CREATED,
          metadata: { revisionId, effectiveFrom: input.effectiveFrom },
        },
      });
      return salary;
    });
  }

  async revise(employeeId: string, input: SalaryPackageInput, actorId: string) {
    return prisma.$transaction(
      async (tx) => {
        await verifyReferences(employeeId, input.currencyId, tx);
        const salary = await tx.salary.findUnique({
          where: { employeeId },
          include: {
            revisions: {
              orderBy: { effectiveFrom: "desc" },
              take: 1,
            },
          },
        });
        if (!salary) throw new SalaryServiceError("Salary record not found", 404);

        const effectiveFrom = new Date(`${input.effectiveFrom}T00:00:00.000Z`);
        const previous = salary.revisions[0];
        if (previous && effectiveFrom <= previous.effectiveFrom) {
          throw new SalaryServiceError(
            "A revision must start after the latest existing revision",
            409
          );
        }

        const calculated = calculateSalary(input);
        const revisionId = randomUUID();

        if (previous) {
          await tx.salaryRevision.update({
            where: { id: previous.id },
            data: { effectiveTo: previousDay(effectiveFrom) },
          });
        }

        const revision = await tx.salaryRevision.create({
          data: {
            id: revisionId,
            salaryId: salary.id,
            currencyId: input.currencyId,
            ...calculated,
            effectiveFrom,
            components: {
              create: componentsForRevision(revisionId, input),
            },
          },
          include: { currency: true, components: true },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            employeeId,
            action: AuditAction.SALARY_REVISED,
            metadata: { revisionId, effectiveFrom: input.effectiveFrom },
          },
        });

        return revision;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
