import { describe, expect, it } from "vitest";

import { stableIndex, stableUuid } from "./synthetic-data";

describe("synthetic seed helpers", () => {
  it("produces stable RFC 4122 version 5 UUIDs", () => {
    const first = stableUuid("employee:1");

    expect(first).toBe(stableUuid("employee:1"));
    expect(first).not.toBe(stableUuid("employee:2"));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("selects reproducible indices within the requested range", () => {
    const selected = stableIndex(421, 7, 8);

    expect(selected).toBe(stableIndex(421, 7, 8));
    expect(selected).toBeGreaterThanOrEqual(0);
    expect(selected).toBeLessThan(8);
  });
});
