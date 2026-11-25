import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditAction, Prisma } from "@prisma/client";
import { SalaryPackageInput } from "./salary.validation";

vi.mock("../../config/database", () => ({
  prisma: {
    salary: { findUnique: vi.fn() },
    salaryRevision: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../config/database";
import { SalaryService } from "./salary.service";

const employeeId = "11111111-1111-4111-8111-111111111111";
const currencyId = "22222222-2222-4222-8222-222222222222";
const actorId = "33333333-3333-4333-8333-333333333333";
const fixedNow = new Date("2026-11-25T12:00:00.000Z");
const input: SalaryPackageInput = {
  currencyId,
  baseSalary: "80000.25",
  effectiveFrom: "2026-03-01",
  components: [
    { name: "Allowance", type: "ALLOWANCE", amount: "10000.25" },
    { name: "Deduction", type: "DEDUCTION", amount: "5000.50" },
  ],
};

function transactionFor(overrides: Record<string, unknown> = {}) {
  const defaults = {
    employee: { findUnique: vi.fn().mockResolvedValue({ id: employeeId }) },
    currency: { findUnique: vi.fn().mockResolvedValue({ id: currencyId }) },
    salary: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "salary-1", employeeId }),
    },
    salaryRevision: {
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "revision-2" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return {
    ...defaults,
    employee: { ...defaults.employee, ...(overrides.employee as object | undefined) },
    currency: { ...defaults.currency, ...(overrides.currency as object | undefined) },
    salary: { ...defaults.salary, ...(overrides.salary as object | undefined) },
    salaryRevision: { ...defaults.salaryRevision, ...(overrides.salaryRevision as object | undefined) },
    auditLog: { ...defaults.auditLog, ...(overrides.auditLog as object | undefined) },
  };
}

function useTransaction(tx: ReturnType<typeof transactionFor>) {
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fixedNow);
  vi.mocked(prisma.$transaction).mockReset();
  vi.mocked(prisma.salary.findUnique).mockReset();
  vi.mocked(prisma.salaryRevision.findFirst).mockReset();
});

afterEach(() => vi.useRealTimers());

describe("SalaryService", () => {
  it("creates a salary with exact decimal totals, components, and an audit event", async () => {
    const tx = transactionFor();
    useTransaction(tx);

    await expect(new SalaryService().create(employeeId, input, actorId))
      .resolves.toMatchObject({ id: "salary-1", employeeId });

    expect(tx.employee.findUnique).toHaveBeenCalledWith({ where: { id: employeeId }, select: { id: true } });
    expect(tx.currency.findUnique).toHaveBeenCalledWith({ where: { id: currencyId }, select: { id: true } });
    const createData = tx.salary.create.mock.calls[0][0].data;
    const revision = createData.revisions.create;
    expect(createData.employeeId).toBe(employeeId);
    expect(revision.baseSalary.toString()).toBe("80000.25");
    expect(revision.grossSalary.toString()).toBe("90000.5");
    expect(revision.netSalary.toString()).toBe("85000");
    expect(revision.effectiveFrom).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    expect(revision.components.create).toEqual([
      { name: "Base salary", type: "BASE", amount: new Prisma.Decimal("80000.25") },
      { name: "Allowance", type: "ALLOWANCE", amount: new Prisma.Decimal("10000.25") },
      { name: "Deduction", type: "DEDUCTION", amount: new Prisma.Decimal("5000.50") },
    ]);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        employeeId,
        action: AuditAction.SALARY_CREATED,
        metadata: { revisionId: revision.id, effectiveFrom: input.effectiveFrom },
      },
    });
  });

  it.each([
    ["employee", { employee: { findUnique: vi.fn().mockResolvedValue(null) } }, "Employee not found", 404],
    ["currency", { currency: { findUnique: vi.fn().mockResolvedValue(null) } }, "Currency not found", 400],
  ])("rejects salary creation when the %s reference is missing", async (_label, override, message, statusCode) => {
    const tx = transactionFor(override as Record<string, unknown>);
    useTransaction(tx);

    await expect(new SalaryService().create(employeeId, input, actorId))
      .rejects.toMatchObject({ message, statusCode });

    expect(tx.salary.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("prevents a second initial salary record for the same employee", async () => {
    const tx = transactionFor({
      salary: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-salary" }),
        create: vi.fn(),
      },
    });
    useTransaction(tx);

    await expect(new SalaryService().create(employeeId, input, actorId))
      .rejects.toMatchObject({ message: "Salary record already exists", statusCode: 409 });

    expect(tx.salary.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("closes the previous revision the day before the new revision", async () => {
    const previousRevision = { id: "revision-1", effectiveFrom: new Date("2026-01-01T00:00:00.000Z") };
    const tx = transactionFor({
      salary: {
        findUnique: vi.fn().mockResolvedValue({ id: "salary-1", revisions: [previousRevision] }),
      },
    });
    useTransaction(tx);

    await new SalaryService().revise(employeeId, { ...input, effectiveFrom: "2026-04-01" }, actorId);

    expect(tx.salaryRevision.update).toHaveBeenCalledWith({
      where: { id: "revision-1" },
      data: { effectiveTo: new Date("2026-03-31T00:00:00.000Z") },
    });
    expect(tx.salaryRevision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        salaryId: "salary-1",
        effectiveFrom: new Date("2026-04-01T00:00:00.000Z"),
      }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        employeeId,
        action: AuditAction.SALARY_REVISED,
        metadata: { revisionId: expect.any(String), effectiveFrom: "2026-04-01" },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("rejects a revision that overlaps the latest salary period", async () => {
    const tx = transactionFor({
      salary: {
        findUnique: vi.fn().mockResolvedValue({
          id: "salary-1",
          revisions: [{ id: "revision-1", effectiveFrom: new Date("2026-03-01T00:00:00.000Z") }],
        }),
      },
    });
    useTransaction(tx);

    await expect(new SalaryService().revise(employeeId, input, actorId))
      .rejects.toMatchObject({ message: "A revision must start after the latest existing revision", statusCode: 409 });

    expect(tx.salaryRevision.update).not.toHaveBeenCalled();
    expect(tx.salaryRevision.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("reads current salary, empty or populated history, and employee-scoped revisions", async () => {
    const revisions = [{ id: "revision-2" }, { id: "revision-1" }];
    const currentSalary = { id: "salary-1", revisions: [revisions[0]] };
    const revision = { id: "revision-2", salaryId: "salary-1" };
    vi.mocked(prisma.salary.findUnique)
      .mockResolvedValueOnce(currentSalary as never)
      .mockResolvedValueOnce({ revisions } as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.salaryRevision.findFirst).mockResolvedValueOnce(revision as never);
    const service = new SalaryService();

    await expect(service.getCurrent(employeeId)).resolves.toBe(currentSalary);
    await expect(service.getHistory(employeeId)).resolves.toBe(revisions);
    expect(prisma.salary.findUnique).toHaveBeenNthCalledWith(1, {
      where: { employeeId },
      include: {
        revisions: {
          where: { effectiveFrom: { lte: fixedNow } },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          include: { currency: true, components: true },
        },
      },
    });
    expect(prisma.salary.findUnique).toHaveBeenNthCalledWith(2, {
      where: { employeeId },
      include: { revisions: { orderBy: { effectiveFrom: "desc" }, include: { currency: true, components: true } } },
    });
    await expect(service.getHistory(employeeId)).resolves.toEqual([]);
    await expect(service.getRevision(employeeId, "revision-2")).resolves.toBe(revision);
    expect(prisma.salaryRevision.findFirst).toHaveBeenCalledWith({
      where: { id: "revision-2", salary: { employeeId } },
      include: { currency: true, components: true },
    });
    await expect(service.getCurrent(employeeId))
      .rejects.toMatchObject({ message: "Salary record not found", statusCode: 404 });
  });
});
