import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../dates";
import {
  introduceMeasure,
  measureActions,
  measurePosition,
  recordCommitteeDisposition,
  referMeasure,
} from "../legislation";
import { stateJurisdictionForKey } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { chamberByKey } from "../legislature-rules";
import { nextMeasureDesignation } from "../measure-numbering";
import { createWorld, createWorldId } from "../world";
import {
  automaticLawQuestionOnCooldown,
  compileAutomaticLawDraft,
  stateTransitAutomaticLawContext,
} from "./automatic-legislation";

function fixtureWorld() {
  const seed = "automatic-law-cooldown-fixture";
  const currentDate = makeIsoDate("2026-01-05");
  const stateJurisdictions = US_STATE_USPS.map((usps) => {
    const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
    if (!jurisdiction) throw new Error(`Missing state identity for ${usps}.`);
    return jurisdiction;
  });
  const extraJurisdictions = ["US-PR", "US-DC"]
    .map((key) => stateJurisdictionForKey(key))
    .filter((jurisdiction) => jurisdiction !== null);
  const jurisdictions = [...stateJurisdictions, ...extraJurisdictions];
  const homeJurisdiction = stateJurisdictionForKey("US-KY")!;
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: homeJurisdiction.id,
  });
  return createWorld({
    seed,
    currentDate,
    policyCatalog: createProductionPolicyCatalog(),
    jurisdictions,
    people: [person],
    control: { kind: "person", personId: person.id },
  });
}

describe("automatic legislation producer guards", () => {
  it("resolves state transit game profiles only for the 50 saved states", () => {
    const world = fixtureWorld();
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (entry) =>
        entry.stableKey ===
        "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    );
    expect(proposition).toBeDefined();
    for (const usps of US_STATE_USPS) {
      const jurisdiction = stateJurisdictionForKey(`US-${usps}`)!;
      const context = stateTransitAutomaticLawContext(world, jurisdiction.id);
      expect(context, `${usps} profile`).not.toBeNull();
      expect(context?.governmentLevel).toBe("state");
      expect(context?.rulePackId).toBe(
        legislativePackForJurisdiction(jurisdiction.id)?.packId,
      );
      expect(context?.predicateAuthority).toMatchObject({
        kind: "game-profile",
        publicGovernmentIdentity: {
          kind: "jurisdiction",
          jurisdictionId: jurisdiction.id,
        },
      });
      const draft = compileAutomaticLawDraft({
        world,
        jurisdictionId: jurisdiction.id,
        propositionId: proposition!.id,
        answer: "yes",
        designation: `${usps} transit bill`,
        intakeKey: `all-state-draft:${usps}`,
        context: context!,
      });
      expect(draft, `${usps} draft`).not.toBeNull();
      expect(draft?.rulePackId).toBe(context?.rulePackId);
    }
    for (const key of ["US-PR", "US-DC"]) {
      const jurisdiction = stateJurisdictionForKey(key);
      if (jurisdiction)
        expect(
          stateTransitAutomaticLawContext(world, jurisdiction.id),
        ).toBeNull();
    }
  });

  it("starts the persisted cooldown only after a terminal committee vote", () => {
    let world = fixtureWorld();
    const jurisdiction = stateJurisdictionForKey("US-KY")!;
    const pack = legislativePackForJurisdiction(jurisdiction.id)!;
    const propositionId = world.policyCatalog.propositionOrder[0]!;
    const house = chamberByKey(pack, "house");
    const committee = house.committees[0]!;
    const designation = nextMeasureDesignation(world, {
      jurisdictionId: jurisdiction.id,
      originChamber: house,
    });
    const stableKey = "legislative-intake/v1:cooldown-fixture:agenda";
    const sponsorPersonId = world.personOrder[0]!;
    world = introduceMeasure(world, {
      stableKey,
      jurisdictionId: jurisdiction.id,
      rulePackId: pack.packId,
      designation,
      shortTitle: "Transit service proposal",
      summary: "A fixture for terminal automatic-law history.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId,
      originChamberKey: house.chamberKey,
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures?.at(-1);
    if (!measure) throw new Error("Measure was not recorded.");
    const cooldownInput = {
      jurisdictionId: measure.jurisdictionId,
      propositionId,
      stableKeyPrefix: "legislative-intake/v1:",
    } as const;
    expect(automaticLawQuestionOnCooldown(world, cooldownInput)).toBe(false);

    world = referMeasure(world, {
      stableKey: `${stableKey}:referral`,
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${stableKey}:committee`,
      measureId: measure.id,
      recommendation: "favorable",
      dispositions: Array.from(
        { length: committee.appointedMembers },
        (_, index) => ({
          memberKey: `${committee.committeeKey}:member:${index + 1}`,
          personId: null,
          disposition: "nay" as const,
        }),
      ),
      rationale: "The committee did not report the proposal.",
      provenance: {
        method: "authored-fixture",
        note: "Authored vote for a legislative lifecycle test.",
        sourceEntityIds: [],
      },
    });

    expect(measurePosition(world, measure.id).terminal).toBe(true);
    const terminalAction = measureActions(world, measure.id).at(-1);
    if (!terminalAction) throw new Error("Missing terminal vote action.");
    const terminalAt = terminalAction.occurredAt;
    expect(automaticLawQuestionOnCooldown(world, cooldownInput)).toBe(true);
    expect(
      automaticLawQuestionOnCooldown(world, {
        ...cooldownInput,
        asOf: addDays(terminalAt, 365),
      }),
    ).toBe(false);
    expect(
      automaticLawQuestionOnCooldown(world, {
        ...cooldownInput,
        stableKeyPrefix: "player-filed:",
      }),
    ).toBe(false);
  });
});
