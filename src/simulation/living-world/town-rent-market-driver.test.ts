import { describe, expect, it } from "vitest";
import { marketRentRenewalReason } from "./town-rent";

describe("market rent renewal driver", () => {
  it("records the local housing price movement in the saved bill reason", () => {
    expect(marketRentRenewalReason(1.047)).toContain("changed rent by 4.7%");
  });

  it("preserves the source estimate basis on an estimated rent row", () => {
    expect(
      marketRentRenewalReason(
        0.98,
        "ESTIMATED FROM AVERAGE: no HUD row for this place.",
      ),
    ).toBe(
      "The local housing-market level changed rent by -2.0% over the renewal year. ESTIMATED FROM AVERAGE: no HUD row for this place.",
    );
  });

  it("rejects a nonpositive market level instead of writing a false zero driver", () => {
    expect(() => marketRentRenewalReason(0)).toThrow();
  });
});
