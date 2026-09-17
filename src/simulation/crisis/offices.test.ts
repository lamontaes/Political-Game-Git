import { describe, expect, it } from "vitest";
import { congressSeats } from "../living-world/congress-seats";

describe("CRISIS office keys", () => {
  it("uses Congress seat keys as office keys without a doubled chamber", () => {
    const keys = congressSeats().map((seat) => seat.seatKey);
    expect(keys).toContain("us-house:KY-03");
    expect(keys.some((key) => key.startsWith("us-senate:KY:class-"))).toBe(
      true,
    );
    expect(keys.every((key) => !/^us-(house|senate):us-/.test(key))).toBe(true);
  });
});
