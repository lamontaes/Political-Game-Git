import { describe, expect, it } from "vitest";
import { allGovernmentUnits } from "../../src/simulation/government-units";
import { sessionLegalLimit } from "../../src/simulation/governing/session-adjournments";
import { localOrdinanceGameRulePack } from "../../src/simulation/local-ordinance-game-profile";
import { countyGoverningBodyRules } from "../../src/simulation/nationwide-world/county-governing-body-rules";

/**
 * CO-5 follow-up: a county board votes under a pack made for it. Seats come
 * from the same rule the county's members are seated from, and the state
 * legislature's session never closes the board. One rule answers for every
 * county in all 56 places; no place is named here.
 */

const counties = allGovernmentUnits().filter(
  (unit) => unit.unitType === "county" && unit.functionalActive,
);

describe("a county board's rule pack", () => {
  it("is built for every active county", () => {
    expect(counties.length).toBeGreaterThan(1000);
  });

  it("seats the board at the size its state's law sets, never fewer than its members", () => {
    let checked = 0;
    for (const unit of counties) {
      const pack = localOrdinanceGameRulePack(unit);
      const rules = countyGoverningBodyRules(unit);
      if (!pack || !rules) continue;
      expect(pack.chambers[0]!.seats).toMatchObject({
        kind: "known",
        value: rules.seats,
      });
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("has no state legislative session that could close it", () => {
    for (const unit of counties) {
      const pack = localOrdinanceGameRulePack(unit);
      if (!pack) continue;
      expect(sessionLegalLimit(pack, 2026)).toBeNull();
    }
  });
});
