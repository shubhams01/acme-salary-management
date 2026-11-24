import { describe, expect, it } from "vitest";

import {
  employeeListQuerySchema,
  updateEmployeeSchema,
} from "./employee.validation";

describe("employee request validation", () => {
  it("provides safe server-side pagination defaults", () => {
    expect(employeeListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: "employeeCode",
      sortOrder: "asc",
    });
  });

  it("rejects invalid page sizes and unsupported sort fields", () => {
    expect(
      employeeListQuerySchema.safeParse({ pageSize: "101" }).success
    ).toBe(false);
    expect(
      employeeListQuerySchema.safeParse({ sortBy: "passwordHash" }).success
    ).toBe(false);
  });

  it("requires a field for employee updates and trims names", () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false);
    expect(updateEmployeeSchema.parse({ firstName: "  Asha  " })).toEqual({
      firstName: "Asha",
    });
  });
});
