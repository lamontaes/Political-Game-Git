import { describe, expect, it } from "vitest";

import { daysInMonth } from "./GameDateField";

describe("GameDateField", () => {
  it("never offers a day the month does not have", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});
