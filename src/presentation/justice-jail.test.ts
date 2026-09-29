import { describe, expect, it } from "vitest";

import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import {
  OFFICE_CONSEQUENCE_EVENT,
  officesHeldBy,
} from "../simulation/governing/office-consequence";
import {
  jailTermOn,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "../simulation/justice/prosecution";
import { ensurePressOpening } from "../simulation/press/transitions";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * A sitting legislator sentenced to jail. Before this, a sentence was a line
 * in the paper and nothing else: the officeholder kept the seat.
 */
describe("a legislator sentenced to jail", () => {
  const fixture = recordedTermFixture("player");
  const personId = fixture.personId;
  // The recorded-term fixture predates the press, whose weekly sweep moves a
  // case along; a new life gets it at its opening.
  const world = ensurePressOpening(
    enterSupportedTerm(fixture.world, personId),
    personId,
  );
  const held = officesHeldBy(world, personId);

  // A violent offense with two findings already standing: every judge the
  // game seats weighs both toward jail (court-reasoning.ts), so this case
  // ends in jail whichever judge sentences it and however the legislator
  // pleads.
  const key = "legislator-jail";
  const referred = referForProsecution(world, {
    stableKey: key,
    subjectPersonId: personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    offenseKey: "crime:robbery",
    referredBy: { kind: "police", label: "Police", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 3,
  }).world;
  const later = passOrdinaryDays(
    referred,
    UNRESEARCHED_PROSECUTION.chargeDecisionDays +
      UNRESEARCHED_PROSECUTION.resolveAfterDays +
      14,
  );

  it("held an office to lose", () => {
    expect(key).not.toBe("");
    expect(held.length).toBeGreaterThan(0);
  });

  it("is in jail and no longer holds any office", () => {
    expect(jailTermOn(later, personId)?.kind).toBe("jail");
    expect(officesHeldBy(later, personId)).toEqual([]);
    const removal = later.history.events.filter(
      (event) =>
        event.type === OFFICE_CONSEQUENCE_EVENT &&
        event.tags.includes("consequence:removed-on-sentence"),
    );
    expect(removal).toHaveLength(held.length);
    for (const event of removal) {
      expect(event.visibility).toBe("public");
      expect(event.summary).toContain("after being sentenced to jail");
    }
  });
});
