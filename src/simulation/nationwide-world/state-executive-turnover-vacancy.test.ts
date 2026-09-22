import { describe, expect, it } from "vitest";

import { stateJurisdictionForKey } from "../life-places";
import { ensureStateJurisdiction } from "./state-executives";
import { recordGovernorCandidacyIntent } from "./state-executive-turnover";
import { makeIsoDate } from "../dates";
import { createWorld } from "../world";
import { requireLifePlace } from "../life-places";

/**
 * A governor who dies in office leaves the seat empty, and the next regular
 * election's field still closes. The intent record written at that moment has
 * no person to name, and a historical event must involve at least one entity —
 * so before this was fixed, advancing an ordinary save through that election
 * threw and the save could not be carried forward at all.
 *
 * The state whose office it is, is the thing the record is about.
 */
describe("a governor's candidacy intent with nobody in the office", () => {
  it("records against the state rather than refusing to exist", () => {
    let world = createWorld({
      seed: "vacant-governor-intent",
      currentDate: makeIsoDate("2031-06-01"),
      jurisdictions: [requireLifePlace("kentucky").context.jurisdiction],
      people: [],
    });
    world = ensureStateJurisdiction(world, "KY");
    const stateId = stateJurisdictionForKey("US-KY")!.id;

    const next = recordGovernorCandidacyIntent(world, {
      office: { officeKey: "ky-governor", displayName: "Governor of Kentucky" },
      year: 2031,
      stateJurisdictionId: stateId,
      incumbentPersonId: null,
      seeking: false,
      reason: "no sitting governor is on record.",
    });

    const event = next.history.events.at(-1)!;
    expect(event.type).toBe("election.governor-candidacy-intent");
    expect(event.involvedEntityIds).toEqual([stateId]);
    expect(event.jurisdictionId).toBe(stateId);
    expect(event.participants).toEqual([]);
    expect(event.summary).toContain("no sitting governor is on record.");
  });
});
