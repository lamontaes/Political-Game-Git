import { describe, expect, it } from "vitest";
import { moneyText } from "./money-text";

describe("money as a player reads it", () => {
  it("writes dollars with a dollar sign, cents and thousands separators", () => {
    expect(moneyText({ currency: "USD", minorUnits: 0 })).toBe("$0");
    expect(moneyText({ currency: "USD", minorUnits: 123_450 })).toBe(
      "$1,234.50",
    );
    expect(moneyText({ currency: "USD", minorUnits: -2_000 })).toBe("-$20");
  });

  it("keeps another currency's code rather than calling it dollars", () => {
    expect(moneyText({ currency: "EUR", minorUnits: 500 })).toBe("EUR 5");
  });
});
