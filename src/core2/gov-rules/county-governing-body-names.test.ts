import { describe, expect, it } from "vitest";
import { countyGoverningBodyRules } from "./county-governing-body-rules.js";
import {
  governmentUnitStates,
  governmentUnitsForState,
} from "../reference/government-units.js";

// A county's governing body takes its name from its own state's form in the
// record, never from the national average where the state has a usual name.
describe("county governing body names", () => {
  const counties = governmentUnitStates().flatMap((state) =>
    governmentUnitsForState(state).filter(
      (u) => u.unitType === "county" && u.functionalActive,
    ),
  );

  it("never falls back to the national average name in a state that names its body differently", () => {
    const byState = new Map<string, Set<string>>();
    for (const unit of counties) {
      const rules = countyGoverningBodyRules(unit);
      if (!rules) continue;
      const set = byState.get(unit.stateUsps) ?? new Set<string>();
      set.add(rules.bodyName);
      byState.set(unit.stateUsps, set);
    }
    // Hawaii's counties have councils, not commissions.
    expect([...(byState.get("HI") ?? [])]).toEqual(["County Council"]);
    // Every state resolves a name, and a state whose counties share one form
    // does not mix the average into it.
    expect(byState.size).toBeGreaterThan(40);
    for (const [, names] of byState) expect(names.size).toBeGreaterThan(0);
  });

  it("names Hawaii members council members", () => {
    const hi = counties.find((u) => u.stateUsps === "HI");
    expect(hi).toBeDefined();
    expect(countyGoverningBodyRules(hi!)?.memberTitle).toBe("Council member");
  });
});
