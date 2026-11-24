import { describe, expect, it } from "vitest";
import { bookkeeping, setBookkeeping } from "./bookkeeping";
import { FinanceReadGuard } from "./finance-plan";

describe("bookkeeping switch", () => {
  it("is on in tests and can be turned off for play", () => {
    expect(bookkeeping()).toBe(true);
    const previous = setBookkeeping(false);
    try {
      const guard = new FinanceReadGuard(),
        row = { value: 1 },
        map = new Map([["a", row]]);
      expect(guard.mapGet(map, "a")).toBe(row);
      row.value = 2;
      // Off: nothing was recorded, so a later change is not a stale read.
      expect(() => guard.verify()).not.toThrow();
    } finally {
      setBookkeeping(previous);
    }
    const guard = new FinanceReadGuard(),
      row = { value: 1 };
    guard.field(row, "value");
    row.value = 2;
    expect(() => guard.verify()).toThrow();
  });
});
