import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import { stableIndex, stableUuid } from "../src/modules/seed/synthetic-data";

const prisma = new PrismaClient();
const employeeCount = 10_000;
const batchSize = 1_000;

const countries = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "JP", name: "Japan", currency: "JPY" },
] as const;

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
] as const;

const departments = [
  "Engineering",
  "People",
  "Finance",
  "Sales",
  "Marketing",
  "Operations",
  "Legal",
  "Customer Success",
] as const;

const designations = [
  "Analyst",
  "Associate",
  "Specialist",
  "Senior Specialist",
  "Manager",
  "Senior Manager",
  "Director",
  "Vice President",
] as const;

const firstNames = [
  "Aarav", "Aisha", "Amelia", "Arjun", "Benjamin", "Chloe", "Daniel",
  "Diya", "Ethan", "Fatima", "Grace", "Hana", "Isabella", "Jacob",
  "Kabir", "Liam", "Maya", "Noah", "Olivia", "Priya", "Ravi", "Sophia",
  "Wei", "Yuki",
] as const;

const lastNames = [
  "Anderson", "Brown", "Chen", "Das", "Garcia", "Gupta", "Harris",
  "Iyer", "Jones", "Khan", "Kim", "Lee", "Martin", "Miller", "Patel",
  "Roberts", "Singh", "Smith", "Taylor", "Thomas", "Wang", "Wilson",
  "Yamamoto", "Young",
] as const;

async function createBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>
) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await insert(rows.slice(offset, offset + batchSize));
  }
}

async function main() {
  const countryIds = new Map<string, string>();
  const departmentIds = new Map<string, string>();
  const designationIds = new Map<string, string>();
  const currencyIds = new Map<string, string>();

  for (const country of countries) {
    const row = await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name },
      create: { code: country.code, name: country.name },
    });
    countryIds.set(country.code, row.id);
  }

  for (const currency of currencies) {
    const row = await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol },
      create: currency,
    });
    currencyIds.set(currency.code, row.id);
  }

  for (const name of departments) {
    const row = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    departmentIds.set(name, row.id);
  }

  for (const title of designations) {
    const row = await prisma.designation.upsert({
      where: { title },
      update: {},
      create: { title },
    });
    designationIds.set(title, row.id);
  }

  const employees: Prisma.EmployeeCreateManyInput[] = [];
  const salaries: Prisma.SalaryCreateManyInput[] = [];
  const revisions: Prisma.SalaryRevisionCreateManyInput[] = [];
  const components: Prisma.SalaryComponentCreateManyInput[] = [];

  for (let number = 1; number <= employeeCount; number++) {
    const country = countries[stableIndex(number, 1, countries.length)];
    const department = departments[
      stableIndex(number, 2, departments.length)
    ];
    const designation = designations[
      stableIndex(number, 3, designations.length)
    ];
    const firstName = firstNames[
      stableIndex(number, 4, firstNames.length)
    ];
    const lastName = lastNames[
      stableIndex(number, 5, lastNames.length)
    ];
    const employeeId = stableUuid(`employee:${number}`);
    const salaryId = stableUuid(`salary:${number}`);
    const revisionId = stableUuid(`revision:${number}:2024-01-01`);
    const base = 40_000 + stableIndex(number, 6, 160_001);
    const allowance = Math.round(base * 0.1);
    const bonus = Math.round(base * 0.05);
    const deduction = Math.round(base * 0.08);
    const gross = base + allowance + bonus;
    const net = gross - deduction;
    const effectiveFrom = new Date("2024-01-01T00:00:00.000Z");
    const status: Prisma.EmployeeCreateManyInput["status"] = number % 113 === 0
      ? "TERMINATED"
      : number % 67 === 0
        ? "ON_LEAVE"
        : number % 29 === 0
          ? "INACTIVE"
          : "ACTIVE";

    employees.push({
      id: employeeId,
      employeeCode: `ACME-${String(number).padStart(6, "0")}`,
      firstName,
      lastName,
      email: `employee${String(number).padStart(5, "0")}@acme.example`,
      countryId: countryIds.get(country.code)!,
      departmentId: departmentIds.get(department)!,
      designationId: designationIds.get(designation)!,
      status,
    });
    salaries.push({ id: salaryId, employeeId });
    revisions.push({
      id: revisionId,
      salaryId,
      currencyId: currencyIds.get(country.currency)!,
      baseSalary: new Prisma.Decimal(base).toString(),
      grossSalary: new Prisma.Decimal(gross).toString(),
      netSalary: new Prisma.Decimal(net).toString(),
      effectiveFrom,
    });

    const componentAmounts = [
      { key: "base", name: "Base salary", type: "BASE", amount: base },
      { key: "allowance", name: "Allowance", type: "ALLOWANCE", amount: allowance },
      { key: "bonus", name: "Bonus", type: "BONUS", amount: bonus },
      { key: "deduction", name: "Deduction", type: "DEDUCTION", amount: deduction },
    ] as const;

    for (const component of componentAmounts) {
      components.push({
        id: stableUuid(`component:${number}:${component.key}`),
        salaryRevisionId: revisionId,
        name: component.name,
        type: component.type,
        amount: new Prisma.Decimal(component.amount).toString(),
      });
    }
  }

  await createBatches(employees, (batch) =>
    prisma.employee.createMany({ data: batch, skipDuplicates: true })
  );
  await createBatches(salaries, (batch) =>
    prisma.salary.createMany({ data: batch, skipDuplicates: true })
  );
  await createBatches(revisions, (batch) =>
    prisma.salaryRevision.createMany({ data: batch, skipDuplicates: true })
  );
  await createBatches(components, (batch) =>
    prisma.salaryComponent.createMany({ data: batch, skipDuplicates: true })
  );

  const [employeeTotal, salaryTotal] = await Promise.all([
    prisma.employee.count(),
    prisma.salary.count(),
  ]);

  console.log(
    `Seed complete: ${employeeTotal} employees and ${salaryTotal} salary records available.`
  );
}

main()
  .catch((error) => {
    console.error("Demo data seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
