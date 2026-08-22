import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "./dates";
import type { IsoDate } from "./types";

describe("simulation dates", () => {
  it("advances through month and leap-year boundaries in UTC-safe date space", () => {
    expect(addDays(makeIsoDate("2026-01-31"), 1)).toBe("2026-02-01");
    expect(addDays(makeIsoDate("2024-02-28"), 1)).toBe("2024-02-29");
    expect(addDays(makeIsoDate("2024-02-28"), 2)).toBe("2024-03-01");
    expect(addDays(makeIsoDate("2025-02-28"), 1)).toBe("2025-03-01");
  });

  it("rejects invalid dates and non-integer movement", () => {
    expect(() => makeIsoDate("2025-02-29")).toThrow();
    expect(() => makeIsoDate("2026-04-31")).toThrow();
    expect(() => addDays("2026-02-31" as IsoDate, 1)).toThrow();
    expect(() => addDays(makeIsoDate("2026-01-01"), 1.5)).toThrow();
  });
});
