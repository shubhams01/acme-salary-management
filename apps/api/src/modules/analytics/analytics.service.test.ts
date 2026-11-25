import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    employee: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "../../config/database";
import { AnalyticsService } from "./analytics.service";

const fixedNow = new Date("2026-11-25T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fixedNow);
  vi.mocked(prisma.employee.count).mockReset();
  vi.mocked(prisma.$queryRaw).mockReset();
});

afterEach(() => vi.useRealTimers());

describe("AnalyticsService", () => {
  it("combines organization counts with currency, country, and department totals", async () => {
    const byCurrency = [{ group_name: "USD", employee_count: 5 }];
    const byCountry = [{ group_name: "United States", employee_count: 3 }];
    const byDepartment = [{ group_name: "Engineering", employee_count: 4 }];
    vi.mocked(prisma.employee.count)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(10);
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(byCurrency as never)
      .mockResolvedValueOnce(byCountry as never)
      .mockResolvedValueOnce(byDepartment as never);

    const result = await new AnalyticsService().overview();

    expect(result).toEqual({
      employeeCount: 12,
      activeEmployeeCount: 10,
      byCurrency,
      byCountry,
      byDepartment,
    });
    expect(prisma.employee.count).toHaveBeenNthCalledWith(1);
    expect(prisma.employee.count).toHaveBeenNthCalledWith(2, { where: { status: "ACTIVE" } });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("uses the as-of date and groups country totals by currency", async () => {
    const rows = [{ group_name: "India", currency_code: "INR", employee_count: 2 }];
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(rows as never);

    await expect(new AnalyticsService().byCountry()).resolves.toBe(rows);

    const [template, asOf] = vi.mocked(prisma.$queryRaw).mock.calls[0];
    expect((template as TemplateStringsArray).join("?")).toContain('GROUP BY country."name", c."code", c."symbol"');
    expect((template as TemplateStringsArray).join("?")).toContain('r."effectiveTo" IS NULL OR r."effectiveTo" >= ?');
    expect(asOf).toEqual(fixedNow);
  });

  it("keeps distribution limited to active employees and uses salary ranges", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never);

    await new AnalyticsService().distribution();

    const [template, asOf] = vi.mocked(prisma.$queryRaw).mock.calls[0];
    const sql = (template as TemplateStringsArray).join("?");
    expect(sql).toContain('e."status" = \'ACTIVE\'');
    expect(sql).toContain('r."grossSalary" < 50000');
    expect(sql).toContain('r."grossSalary" < 100000');
    expect(sql).toContain('r."grossSalary" < 150000');
    expect(asOf).toEqual(fixedNow);
  });

  it("selects the latest salary revision applicable to each trend month", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never);

    await new AnalyticsService().trends();

    const [template] = vi.mocked(prisma.$queryRaw).mock.calls[0];
    const sql = (template as TemplateStringsArray).join("?");
    expect(sql).toContain("generate_series(");
    expect(sql).toContain("INNER JOIN LATERAL (");
    expect(sql).toContain('r."effectiveFrom" < months.month_start + interval \'1 month\'');
    expect(sql).toContain('ORDER BY r."effectiveFrom" DESC');
  });
});
