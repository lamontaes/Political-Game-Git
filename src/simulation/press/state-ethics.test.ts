import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT, NEBRASKA_CONTEXT } from "../legislation-scenarios";
import { procedureForSubject } from "./matters";
import {
  STATE_LEGISLATIVE_ETHICS_PROCEDURES,
  stateJurisdictionIdForKey,
} from "./state-ethics";
import type { CampaignRecord, EntityId } from "../types";

/**
 * Which ethics procedure a subject routes to is a property of their state, and
 * of whether that state's commission has been researched — not of a state name
 * written into the selector.
 */

function campaignWithPack(candidacyPackId: string, officeKey = "") {
  return { candidacyPackId, officeKey } as unknown as CampaignRecord;
}

/** Any person in the world; the routing reads their work, not their name. */
function someone(world: { people: Record<string, unknown> }) {
  return Object.keys(world.people)[0]! as EntityId;
}

describe("state legislative ethics routing", () => {
  it("resolves a registered state's jurisdiction without naming it here", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ky",
      KENTUCKY_CONTEXT,
    );
    const entry = STATE_LEGISLATIVE_ETHICS_PROCEDURES.find(
      (candidate) => candidate.stateJurisdictionKey === "US-KY",
    )!;
    expect(stateJurisdictionIdForKey(world, entry.stateJurisdictionKey)).toBe(
      KENTUCKY_CONTEXT.jurisdiction.id,
    );
  });

  it("routes a registered state's legislative candidacy to its commission", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ky",
      KENTUCKY_CONTEXT,
    );
    const subject = someone(world);
    expect(
      procedureForSubject(
        world,
        subject,
        campaignWithPack("us-ky-general-assembly-v1:candidacy"),
      ),
    ).toBe("ky-legislative-ethics");
  });

  it("does not hand an unresearched state another state's commission", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ne",
      NEBRASKA_CONTEXT,
    );
    const subject = someone(world);
    expect(
      procedureForSubject(
        world,
        subject,
        campaignWithPack("us-ne-legislature-v1:candidacy"),
      ),
    ).toBe("simulated-inquiry");
    expect(
      STATE_LEGISLATIVE_ETHICS_PROCEDURES.some(
        (entry) => entry.stateJurisdictionKey === "US-NE",
      ),
    ).toBe(false);
  });

  it("keeps federal candidacies on the federal procedure", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ky",
      KENTUCKY_CONTEXT,
    );
    const subject = someone(world);
    expect(
      procedureForSubject(
        world,
        subject,
        campaignWithPack("us-house-v1:candidacy", "us-house"),
      ),
    ).toBe("fec-enforcement");
  });

  it("names a procedure that actually exists for every registered state", () => {
    for (const entry of STATE_LEGISLATIVE_ETHICS_PROCEDURES) {
      expect(entry.candidacyPackPrefixes.length).toBeGreaterThan(0);
      expect(/^US-[A-Z]{2}$/.test(entry.stateJurisdictionKey)).toBe(true);
    }
  });
});
