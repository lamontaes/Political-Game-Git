/*
 * The District of Columbia, played.
 *
 * NATIONWIDE1 asks for the District separately from the fifty states. The
 * simulation-side facts are asserted in
 * `src/simulation/nationwide-world/nationwide-chief-executives.test.ts`; this
 * file is the ordinary route: somebody who lives in the District sees its own
 * chief executive, and stands for it through the same campaign and contest
 * route a state resident uses.
 */
import { afterEach, describe, expect, it } from "vitest";

import { residentIn } from "../../tests/fixtures/state-executive-entry";
import {
  DISTRICT_OF_COLUMBIA_USPS,
  bindRuleCapabilityResolver,
  districtOfColumbiaJurisdiction,
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
  stateExecutiveTermRule,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import {
  stateExecutiveCandidacyForPerson,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("a life in the District of Columbia", () => {
  it("has the District's own mayor as its chief executive", () => {
    const { world, personId } = residentIn(DISTRICT_OF_COLUMBIA_USPS, "dc-1");
    const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
    expect(candidacy.identity.stateUsps).toBe(DISTRICT_OF_COLUMBIA_USPS);
    expect(candidacy.identity.title).toBe("Mayor");
    expect(candidacy.identity.displayName).not.toContain("Governor");
  });

  it("dates its calendar by the profile the research calibrated, and says so", () => {
    const { world } = residentIn(DISTRICT_OF_COLUMBIA_USPS, "dc-2");
    const calendar = stateExecutiveOfficeCalendar(
      world,
      DISTRICT_OF_COLUMBIA_USPS,
    )!;
    const rule = stateExecutiveTermRule(DISTRICT_OF_COLUMBIA_USPS)!;
    expect(calendar.basis).toBe("game-profile");
    expect(calendar.ruleVersion).toBe(rule.ruleVersion);
    expect(calendar.note).toContain("4-year terms");
    // The official Code section is cited, and the note does not pretend the
    // game read it word for word.
    expect(calendar.note).toContain("code.dccouncil.gov");
    expect(calendar.note).toContain("cited but not quoted here");
  });

  it("materializes one office holder, on the District's one jurisdiction", () => {
    const { world, personId } = residentIn(DISTRICT_OF_COLUMBIA_USPS, "dc-3");
    const next = ensureStateExecutiveIncumbent(
      world,
      personId,
      DISTRICT_OF_COLUMBIA_USPS,
    );
    const holders = currentStateExecutiveHolders(next).filter(
      (holder) => holder.stateUsps === DISTRICT_OF_COLUMBIA_USPS,
    );
    expect(holders).toHaveLength(1);
    expect(holders[0]!.title).toContain("Mayor");
    expect(holders[0]!.title).not.toContain("Governor");
    const jurisdictionId = districtOfColumbiaJurisdiction()!.id;
    expect(next.jurisdictions[jurisdictionId]).toBeDefined();
    // One government: no second district-wide jurisdiction was registered
    // beside the one the District's own government governs from.
    const districtJurisdictions = Object.values(next.jurisdictions).filter(
      (jurisdiction) =>
        jurisdiction.name.includes("District of Columbia") ||
        jurisdiction.parentName === "District of Columbia",
    );
    expect(districtJurisdictions.map((j) => j.id)).toEqual([jurisdictionId]);
  });
});
