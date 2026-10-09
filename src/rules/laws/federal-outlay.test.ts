import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import {
  federalAidFactorFromFacts,
  federalDeficitChangePctOfGdpFromFacts,
} from "./federal-outlay";

describe("standalone federal outlay rules", () => {
  it.each(Object.keys(STATES))(
    "matches selected outlay math for US-%s",
    (usps) => {
      const gdp = 25_000_000_000_000 + usps.charCodeAt(0) * 1_000_000;
      const cuts = 8_000_000_000 + usps.charCodeAt(0) * 100_000;
      const aid = 2_000_000_000 + usps.charCodeAt(1) * 100_000;
      expect(federalDeficitChangePctOfGdpFromFacts(cuts, aid, gdp)).toBe(
        (100 * (aid - cuts)) / gdp,
      );
      const base = 6_000_000_000_000;
      expect(federalAidFactorFromFacts(cuts, base)).toBe(
        Math.max(0, 1 - cuts / base),
      );
    },
  );

  it("preserves the legacy unknown-facts defaults", () => {
    expect(federalDeficitChangePctOfGdpFromFacts(null, 1, 10)).toBeNull();
    expect(federalDeficitChangePctOfGdpFromFacts(1, 1, 0)).toBeNull();
    expect(federalAidFactorFromFacts(null, 10)).toBe(1);
    expect(federalAidFactorFromFacts(1, null)).toBe(1);
  });
});
