import {
  AuditAction,
  EmployeeStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../config/database";
import {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "./employee.validation";

class EmployeeServiceError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "EmployeeServiceError";
  }
}

function currentCompensationInclude() {
  const now = new Date();

  return {
    country: true,
    department: true,
    designation: true,
    salary: {
      include: {
        revisions: {
          where: {
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
          orderBy: { effectiveFrom: "desc" as const },
          take: 1,
          include: { currency: true, components: true },
        },
      },
    },
  };
}

function buildWhere(query: EmployeeListQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (query.search) {
    where.OR = [
      { employeeCode: { contains: query.search, mode: "insensitive" } },
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.countryId) where.countryId = query.countryId;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.designationId) where.designationId = query.designationId;
  if (query.status) where.status = query.status;

  return where;
}

function throwNotFound() {
  throw new EmployeeServiceError("Employee not found", 404);
}

export class EmployeeService {
  async list(query: EmployeeListQuery) {
    const where = buildWhere(query);
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy,
        include: currentCompensationInclude(),
      }),
    ]);

    return {
      items: employees,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: currentCompensationInclude(),
    });

    if (!employee) throwNotFound();
    return employee;
  }

  async create(input: CreateEmployeeInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: input,
        include: currentCompensationInclude(),
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          employeeId: employee.id,
          action: AuditAction.EMPLOYEE_CREATED,
          metadata: { employeeCode: employee.employeeCode },
        },
      });

      return employee;
    });
  }

  async update(id: string, input: UpdateEmployeeInput, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.employee.updateMany({
        where: { id },
        data: input,
      });

      if (updated.count === 0) throwNotFound();

      const employee = await tx.employee.findUniqueOrThrow({
        where: { id },
        include: currentCompensationInclude(),
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          employeeId: employee.id,
          action: AuditAction.EMPLOYEE_UPDATED,
          metadata: { fields: Object.keys(input) },
        },
      });

      return employee;
    });
  }

  async changeStatus(id: string, status: EmployeeStatus, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.employee.updateMany({
        where: { id },
        data: { status },
      });

      if (updated.count === 0) throwNotFound();

      const employee = await tx.employee.findUniqueOrThrow({
        where: { id },
        include: currentCompensationInclude(),
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          employeeId: employee.id,
          action: AuditAction.EMPLOYEE_STATUS_CHANGED,
          metadata: { status },
        },
      });

      return employee;
    });
  }
}
