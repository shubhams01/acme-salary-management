import { Prisma } from "@prisma/client";

import { prisma } from "../../config/database";

type CompensationGroup = {
  group_name: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
  average_gross: Prisma.Decimal | null;
  minimum_gross: Prisma.Decimal | null;
  maximum_gross: Prisma.Decimal | null;
};

type DistributionBucket = {
  range_label: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
};

type TrendPoint = {
  month: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
  average_gross: Prisma.Decimal | null;
};

async function getCurrencyTotals() {
  const asOf = new Date();
  return prisma.$queryRaw<CompensationGroup[]>`
    SELECT
      c."code" AS currency_code,
      c."symbol" AS currency_symbol,
      c."code" AS group_name,
      COUNT(DISTINCT e."id")::int AS employee_count,
      AVG(r."grossSalary") AS average_gross,
      MIN(r."grossSalary") AS minimum_gross,
      MAX(r."grossSalary") AS maximum_gross
    FROM "Employee" e
    INNER JOIN "Salary" s ON s."employeeId" = e."id"
    INNER JOIN "SalaryRevision" r ON r."salaryId" = s."id"
    INNER JOIN "Currency" c ON c."id" = r."currencyId"
    WHERE r."effectiveFrom" <= ${asOf}
      AND (r."effectiveTo" IS NULL OR r."effectiveTo" >= ${asOf})
    GROUP BY c."code", c."symbol"
    ORDER BY c."code"
  `;
}

async function getCountryTotals() {
  const asOf = new Date();
  return prisma.$queryRaw<CompensationGroup[]>`
    SELECT
      country."name" AS group_name,
      c."code" AS currency_code,
      c."symbol" AS currency_symbol,
      COUNT(DISTINCT e."id")::int AS employee_count,
      AVG(r."grossSalary") AS average_gross,
      MIN(r."grossSalary") AS minimum_gross,
      MAX(r."grossSalary") AS maximum_gross
    FROM "Employee" e
    INNER JOIN "Country" country ON country."id" = e."countryId"
    INNER JOIN "Salary" s ON s."employeeId" = e."id"
    INNER JOIN "SalaryRevision" r ON r."salaryId" = s."id"
    INNER JOIN "Currency" c ON c."id" = r."currencyId"
    WHERE r."effectiveFrom" <= ${asOf}
      AND (r."effectiveTo" IS NULL OR r."effectiveTo" >= ${asOf})
    GROUP BY country."name", c."code", c."symbol"
    ORDER BY country."name", c."code"
  `;
}

async function getDepartmentTotals() {
  const asOf = new Date();
  return prisma.$queryRaw<CompensationGroup[]>`
    SELECT
      department."name" AS group_name,
      c."code" AS currency_code,
      c."symbol" AS currency_symbol,
      COUNT(DISTINCT e."id")::int AS employee_count,
      AVG(r."grossSalary") AS average_gross,
      MIN(r."grossSalary") AS minimum_gross,
      MAX(r."grossSalary") AS maximum_gross
    FROM "Employee" e
    INNER JOIN "Department" department ON department."id" = e."departmentId"
    INNER JOIN "Salary" s ON s."employeeId" = e."id"
    INNER JOIN "SalaryRevision" r ON r."salaryId" = s."id"
    INNER JOIN "Currency" c ON c."id" = r."currencyId"
    WHERE r."effectiveFrom" <= ${asOf}
      AND (r."effectiveTo" IS NULL OR r."effectiveTo" >= ${asOf})
    GROUP BY department."name", c."code", c."symbol"
    ORDER BY department."name", c."code"
  `;
}

async function getDistribution() {
  const asOf = new Date();
  return prisma.$queryRaw<DistributionBucket[]>`
    SELECT
      CASE
        WHEN r."grossSalary" < 50000 THEN '< 50,000'
        WHEN r."grossSalary" < 100000 THEN '50,000–99,999'
        WHEN r."grossSalary" < 150000 THEN '100,000–149,999'
        ELSE '150,000+'
      END AS range_label,
      c."code" AS currency_code,
      c."symbol" AS currency_symbol,
      COUNT(DISTINCT e."id")::int AS employee_count
    FROM "Employee" e
    INNER JOIN "Salary" s ON s."employeeId" = e."id"
    INNER JOIN "SalaryRevision" r ON r."salaryId" = s."id"
    INNER JOIN "Currency" c ON c."id" = r."currencyId"
    WHERE e."status" = 'ACTIVE'
      AND r."effectiveFrom" <= ${asOf}
      AND (r."effectiveTo" IS NULL OR r."effectiveTo" >= ${asOf})
    GROUP BY range_label, c."code", c."symbol"
    ORDER BY c."code", MIN(r."grossSalary")
  `;
}

async function getTrends() {
  return prisma.$queryRaw<TrendPoint[]>`
    WITH months AS (
      SELECT generate_series(
        COALESCE(
          (SELECT date_trunc('month', MIN("effectiveFrom")) FROM "SalaryRevision"),
          date_trunc('month', CURRENT_DATE)
        ),
        date_trunc('month', CURRENT_DATE),
        interval '1 month'
      ) AS month_start
    )
    SELECT
      to_char(months.month_start, 'YYYY-MM') AS month,
      c."code" AS currency_code,
      c."symbol" AS currency_symbol,
      COUNT(DISTINCT e."id")::int AS employee_count,
      AVG(current_revision."grossSalary") AS average_gross
    FROM months
    INNER JOIN "Employee" e ON e."status" = 'ACTIVE'
    INNER JOIN LATERAL (
      SELECT r."grossSalary", r."currencyId"
      FROM "Salary" s
      INNER JOIN "SalaryRevision" r ON r."salaryId" = s."id"
      WHERE s."employeeId" = e."id"
        AND r."effectiveFrom" < months.month_start + interval '1 month'
        AND (r."effectiveTo" IS NULL OR r."effectiveTo" >= months.month_start)
      ORDER BY r."effectiveFrom" DESC
      LIMIT 1
    ) current_revision ON TRUE
    INNER JOIN "Currency" c ON c."id" = current_revision."currencyId"
    GROUP BY months.month_start, c."code", c."symbol"
    ORDER BY months.month_start, c."code"
  `;
}

export class AnalyticsService {
  async overview() {
    const [employeeCount, activeEmployeeCount, byCurrency, byCountry, byDepartment] =
      await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: "ACTIVE" } }),
        getCurrencyTotals(),
        getCountryTotals(),
        getDepartmentTotals(),
      ]);

    return {
      employeeCount,
      activeEmployeeCount,
      byCurrency,
      byCountry,
      byDepartment,
    };
  }

  async byCountry() {
    return getCountryTotals();
  }

  async byDepartment() {
    return getDepartmentTotals();
  }

  async distribution() {
    return getDistribution();
  }

  async trends() {
    return getTrends();
  }
}
