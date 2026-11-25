import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditAction } from "@prisma/client";

vi.mock("../../config/database", () => ({
  prisma: {
    employee: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../config/database";
import { EmployeeService } from "./employee.service";
import { employeeListQuerySchema } from "./employee.validation";

const fixedNow = new Date("2026-11-25T12:00:00.000Z");
const employeeId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const employee = { id: employeeId, employeeCode: "ACM-1001", status: "ACTIVE" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fixedNow);
  vi.mocked(prisma.employee.count).mockReset();
  vi.mocked(prisma.employee.findMany).mockReset();
  vi.mocked(prisma.employee.findUnique).mockReset();
  vi.mocked(prisma.$transaction).mockReset();
});

afterEach(() => vi.useRealTimers());

describe("EmployeeService", () => {
  it("applies filters, current-compensation rules, and pagination to employee listings", async () => {
    vi.mocked(prisma.employee.count).mockResolvedValue(31);
    vi.mocked(prisma.employee.findMany).mockResolvedValue([employee] as never);
    const query = employeeListQuerySchema.parse({
      page: "3",
      pageSize: "10",
      search: "  Maya  ",
      countryId: employeeId,
      departmentId: actorId,
      designationId: "33333333-3333-4333-8333-333333333333",
      status: "ACTIVE",
      sortBy: "lastName",
      sortOrder: "desc",
    });

    const result = await new EmployeeService().list(query);

    const expectedWhere = {
      OR: [
        { employeeCode: { contains: "Maya", mode: "insensitive" } },
        { firstName: { contains: "Maya", mode: "insensitive" } },
        { lastName: { contains: "Maya", mode: "insensitive" } },
        { email: { contains: "Maya", mode: "insensitive" } },
      ],
      countryId: employeeId,
      departmentId: actorId,
      designationId: "33333333-3333-4333-8333-333333333333",
      status: "ACTIVE",
    };
    expect(prisma.employee.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(prisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expectedWhere,
      skip: 20,
      take: 10,
      orderBy: { lastName: "desc" },
      include: {
        country: true,
        department: true,
        designation: true,
        salary: {
          include: {
            revisions: {
              where: {
                effectiveFrom: { lte: fixedNow },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: fixedNow } }],
              },
              orderBy: { effectiveFrom: "desc" },
              take: 1,
              include: { currency: true, components: true },
            },
          },
        },
      },
    }));
    expect(result).toEqual({
      items: [employee],
      pagination: { page: 3, pageSize: 10, total: 31, totalPages: 4 },
    });
  });

  it("creates an employee and audit record in the same transaction", async () => {
    const tx = {
      employee: { create: vi.fn().mockResolvedValue(employee) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));
    const input = {
      employeeCode: "ACM-1001",
      firstName: "Maya",
      lastName: "Shah",
      email: "maya@example.com",
      countryId: employeeId,
      departmentId: actorId,
      designationId: "33333333-3333-4333-8333-333333333333",
    };

    await expect(new EmployeeService().create(input, actorId)).resolves.toBe(employee);

    expect(tx.employee.create).toHaveBeenCalledWith(expect.objectContaining({ data: input }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        employeeId,
        action: AuditAction.EMPLOYEE_CREATED,
        metadata: { employeeCode: "ACM-1001" },
      },
    });
  });

  it("records only changed fields when updating an employee", async () => {
    const updatedEmployee = { ...employee, firstName: "Maya" };
    const tx = {
      employee: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updatedEmployee),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    const result = await new EmployeeService().update(employeeId, { firstName: "Maya" }, actorId);

    expect(result).toBe(updatedEmployee);
    expect(tx.employee.updateMany).toHaveBeenCalledWith({
      where: { id: employeeId }, data: { firstName: "Maya" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        employeeId,
        action: AuditAction.EMPLOYEE_UPDATED,
        metadata: { fields: ["firstName"] },
      },
    });
  });

  it("does not write an audit event when an update targets a missing employee", async () => {
    const tx = {
      employee: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await expect(new EmployeeService().update(employeeId, { firstName: "Maya" }, actorId))
      .rejects.toMatchObject({ message: "Employee not found", statusCode: 404 });

    expect(tx.employee.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("changes employee status and records the new value", async () => {
    const updatedEmployee = { ...employee, status: "INACTIVE" };
    const tx = {
      employee: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updatedEmployee),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

    await new EmployeeService().changeStatus(employeeId, "INACTIVE", actorId);

    expect(tx.employee.updateMany).toHaveBeenCalledWith({
      where: { id: employeeId }, data: { status: "INACTIVE" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        employeeId,
        action: AuditAction.EMPLOYEE_STATUS_CHANGED,
        metadata: { status: "INACTIVE" },
      },
    });
  });
});
