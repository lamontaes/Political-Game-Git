import { describe, expect, it } from "vitest";

import { createDemoWorld } from "../demo";
import { stateJurisdictionForKey } from "../life-places";
import { ensureStateJurisdiction } from "./state-executives";
import { recordGovernorCandidacyIntent } from "./state-executive-turnover";

/*
 * A governorship nobody holds still has an election. Measured in the browser
 * at dc0155a4: a Lexington childhood reached July 2030, the Kentucky field
 * closed with no governor on record, and recording "no sitting governor is on
 * record" threw "A historical event must involve at least one entity." inside
 * the day advance, so "Let the year run on" did nothing, every time, for good.
 */
describe("the decision to stand for an empty governorship", () => {
  it("is recorded against the state when no one holds the seat", () => {
    const world = ensureStateJurisdiction(createDemoWorld(), "KY");
    const stateId = stateJurisdictionForKey("US-KY")!.id;
    const next = recordGovernorCandidacyIntent(world, {
      office: {
        officeKey: "test:governor:KY",
        displayName: "Governor of Kentucky",
      },
      year: 2031,
      jurisdictionId: stateId,
      incumbentPersonId: null,
      seeking: false,
      reason: "no sitting governor is on record.",
    });
    const event = next.history.events.at(-1)!;
    expect(event.type).toBe("election.governor-candidacy-intent");
    expect(event.involvedEntityIds).toEqual([stateId]);
    expect(event.jurisdictionId).toBe(stateId);
  });
});
