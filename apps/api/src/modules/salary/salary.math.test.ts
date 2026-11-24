import { describe, expect, it } from "vitest";

import { calculateSalary, previousDay } from "./salary.math";
import { createSalarySchema } from "./salary.validation";

const validInput = {
  currencyId: "11111111-1111-4111-8111-111111111111",
  baseSalary: "100000.1250",
  effectiveFrom: "2026-01-01",
  components: [
    { name: "Allowance", type: "ALLOWANCE" as const, amount: "10000.1250" },
    { name: "Bonus", type: "BONUS" as const, amount: "5000" },
    { name: "Deduction", type: "DEDUCTION" as const, amount: "12000.25" },
  ],
};

describe("salary calculations", () => {
  it("calculates gross and net amounts with decimal precision", () => {
    const amounts = calculateSalary(validInput);

    expect(amounts.baseSalary.toString()).toBe("100000.125");
    expect(amounts.grossSalary.toString()).toBe("115000.25");
    expect(amounts.netSalary.toString()).toBe("103000");
  });

  it("rejects deductions greater than gross salary", () => {
    expect(() =>
      calculateSalary({
        ...validInput,
        components: [
          { name: "Deduction", type: "DEDUCTION" as const, amount: "100001" },
        ],
      })
    ).toThrow("Deductions cannot exceed gross salary");
  });

  it("validates the date and precision before storing salary data", () => {
    expect(createSalarySchema.safeParse(validInput).success).toBe(true);
    expect(
      createSalarySchema.safeParse({ ...validInput, effectiveFrom: "2026-02-30" }).success
    ).toBe(false);
    expect(
      createSalarySchema.safeParse({ ...validInput, baseSalary: "1.12345" }).success
    ).toBe(false);
  });

  it("closes the preceding salary period on the day before a revision", () => {
    expect(previousDay(new Date("2026-03-01T00:00:00.000Z")).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z"
    );
  });
});
