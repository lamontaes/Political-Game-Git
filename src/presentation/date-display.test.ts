import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../simulation";
import { formatDisplayDate, formatDisplayDateShort } from "./date-display";

describe("date display", () => {
  const date = makeIsoDate("2026-09-14");

  it("defaults to month-then-day and never prints the ISO string", () => {
    expect(formatDisplayDate(date)).toBe("September 14, 2026");
    expect(formatDisplayDate(date, "mdy")).toBe("September 14, 2026");
    expect(formatDisplayDate(date, "dmy")).toBe("14 September 2026");
    expect(formatDisplayDate(date)).not.toContain("2026-09-14");
  });

  it("keeps numeric short labels ordered by the same preference", () => {
    expect(formatDisplayDateShort(date, "mdy")).toBe("9/14");
    expect(formatDisplayDateShort(date, "dmy")).toBe("14/9");
  });
});
