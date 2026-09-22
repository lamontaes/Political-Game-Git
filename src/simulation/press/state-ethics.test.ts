import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT, NEBRASKA_CONTEXT } from "../legislation-scenarios";
import { canInstitutionAct } from "../governing/institution-authority";
import { LEGISLATIVE_RULE_PACKS } from "../legislature-rule-packs";
import { procedureForSubject } from "./matters";
import { procedureDefinition } from "./procedures";
import { PROCEDURE_KEYS } from "./records";
import {
  ethicsInstitutionKey,
  STATE_LEGISLATIVE_ETHICS_BODIES,
} from "./state-ethics-bodies";
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

  it("routes a researched state to its own body, never to Kentucky's", () => {
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
    ).toBe("state-legislative-ethics:us-ne");
  });

  it("does not hand an unresearched state another state's commission", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ne",
      NEBRASKA_CONTEXT,
    );
    const subject = someone(world);
    // Arizona is one of the twenty-seven states nobody has read yet. A
    // candidacy there must reach the simulated inquiry, which says on its face
    // that it is simulated, rather than the nearest researched commission.
    expect(
      STATE_LEGISLATIVE_ETHICS_PROCEDURES.some(
        (entry) => entry.stateJurisdictionKey === "US-AZ",
      ),
    ).toBe(false);
    expect(
      procedureForSubject(
        world,
        subject,
        campaignWithPack("us-az-legislature-v1:candidacy"),
      ),
    ).toBe("simulated-inquiry");
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
      expect(/^US-[A-Z]{2}$/.test(entry.stateJurisdictionKey)).toBe(true);
      expect(PROCEDURE_KEYS).toContain(entry.procedureKey);
      // A prefix is a claim that a candidacy pack exists for it to match. An
      // empty list is the honest statement that no legislature pack has been
      // compiled for that state yet, which is a gap in the packs rather than
      // in the routing: a seated legislator there still routes by their work.
      // A prefix naming no pack would route a candidacy by wishful spelling.
      for (const prefix of entry.candidacyPackPrefixes) {
        expect(
          LEGISLATIVE_RULE_PACKS.some((pack) => pack.packId.startsWith(prefix)),
        ).toBe(true);
      }
    }
  });

  it("gives every researched body a named institution and its own sources", () => {
    for (const body of STATE_LEGISLATIVE_ETHICS_BODIES) {
      const definition = procedureDefinition(body.procedureKey);
      expect(definition.institutionLabel).toBe(body.intakeBody);
      expect(definition.sourceRefs.length).toBeGreaterThan(0);
      expect(body.authority.length).toBeGreaterThan(0);
    }
  });

  it("compiles procedure for a researched body and nothing beyond it", () => {
    const world = createScenarioWorld(
      "press-state-ethics-ne",
      NEBRASKA_CONTEXT,
    );
    const subject = someone(world);
    const body = STATE_LEGISLATIVE_ETHICS_BODIES.find(
      (candidate) => candidate.stateJurisdictionKey === "US-NE",
    )!;
    const ask = (action: Parameters<typeof canInstitutionAct>[1]["action"]) =>
      canInstitutionAct(world, {
        institution: ethicsInstitutionKey(body),
        action,
        subjectPersonId: subject,
        onDate: world.currentDate,
      }).status;
    // The research read who hears a complaint. It did not read what any of
    // these bodies may impose, so a sanction stays uncompiled rather than
    // borrowing Kentucky's reprimand power.
    expect(ask("receive-complaint")).toBe("available");
    expect(ask("issue-finding")).toBe("available");
    expect(ask("reprimand")).toBe("unknown");
    expect(ask("expel")).toBe("unknown");
  });
});
