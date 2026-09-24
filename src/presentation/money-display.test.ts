import { describe, expect, it } from "vitest";
import { displayMoney } from "./money-display";

describe("money as a player reads it", () => {
  it("uses the dollar sign and thousands separators", () => {
    expect(displayMoney({ minorUnits: 0, currency: "USD" })).toBe("$0");
    expect(displayMoney({ minorUnits: 3_541_000, currency: "USD" })).toBe(
      "$35,410",
    );
    expect(displayMoney({ minorUnits: 1703, currency: "USD" })).toBe("$17.03");
    expect(displayMoney({ minorUnits: -250, currency: "USD" })).toBe("-$2.50");
  });
});
