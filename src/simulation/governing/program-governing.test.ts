import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../dates";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
  nextMeasureStableKey,
  recordEnactment,
} from "../legislation";
import {
  createLegislativeScenario,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import { stateJurisdictionForKey } from "../life-places";
import { legislatureProfilePackId } from "../legislature-game-profile";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "../legislation-transit-families";
import { resolveTransitFunding } from "../transit-funding";
import { createWorld, createWorldId } from "../world";
import { introduceAutomaticLawMeasure } from "./automatic-legislation";
import {
  appropriationFromEnactedMeasure,
  openAppropriationsFor,
} from "./program-governing";
import type { EntityId, World } from "../types";
import { fileDraft } from "../../presentation/legislation-docket";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { publishLegislativeTransition } from "../../presentation/publish-legislative-transition";

const scenario = createLegislativeScenario("nebraska");
const jurisdictionId = (() => {
  const id = scenario.world.history.legislativeMeasures?.[0]?.jurisdictionId;
  if (!id) throw new Error("The Nebraska legislature was not opened.");
  return id;
})();

function enact(
  startingWorld: World,
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
  },
): {
  readonly world: World;
  readonly measureId: EntityId;
  readonly docketKey: string;
} {
  const filed = fileDraft(startingWorld, {
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    ...draft,
  });
  const measureId = filed.bill.measureId;
  let world = filed.world;
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) break;
    if (step === "record-enactment") {
      world = publishLegislativeTransition(
        world,
        recordEnactment(world, {
          stableKey: nextMeasureStableKey(
            world,
            measureId,
            `measure:${measureId}:enactment`,
          ),
          measureId,
          effectiveAt: addDays(world.currentDate, 13),
        }),
      );
      continue;
    }
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep({ ...scenario, measureId }, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return { world, measureId, docketKey: filed.bill.docketKey };
}

function appropriations(world: World) {
  return (world.history.publicProgramRecords ?? []).filter(
    (record) => record.kind === "appropriation",
  );
}

describe("one program identity per named spending target", () => {
  it("keeps the legacy Alaska transit clause out of Nebraska while v2 writes its own authority", () => {
    // This core fixture bypasses the ordinary operative-section filing gate,
    // as an older save might. The enacted writer and payment adapter must
    // still refuse the pinned Alaska-specific v1 text in Nebraska.
    const legacy = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: TRANSIT_VARIANT_KEY,
      authorityKey: TRANSIT_PROGRAM_KEY,
    });
    expect(
      appropriations(legacy.world).filter(
        (record) => record.sourceMeasureId === legacy.measureId,
      ),
    ).toHaveLength(0);
    expect(resolveTransitFunding(legacy.world, legacy.measureId)).toEqual({
      kind: "unavailable",
      reason:
        "The explicit ninety-day transit clause is compiled only for Alaska.",
    });

    const statewide = enact(legacy.world, {
      familyKey: "appropriations",
      variantKey: STATE_TRANSIT_VARIANT_KEY,
      authorityKey: TRANSIT_PROGRAM_KEY,
    });
    expect(
      appropriations(statewide.world).filter(
        (record) => record.sourceMeasureId === statewide.measureId,
      ),
    ).toMatchObject([{ programKey: "transit:ne" }]);
  });

  it("has one distinct state transit game profile in every state", () => {
    const keys = new Set<string>();
    for (const stateUsps of US_STATE_USPS) {
      const jurisdictionKey = `US-${stateUsps}`;
      const jurisdiction = stateJurisdictionForKey(jurisdictionKey);
      expect(jurisdiction).not.toBeNull();
      if (!jurisdiction) continue;
      const profile = stateTransitServiceProfileForMeasure(
        { jurisdictions: { [jurisdiction.id]: jurisdiction } },
        {
          jurisdictionId: jurisdiction.id,
          rulePackId: legislatureProfilePackId(jurisdictionKey),
        },
      );
      expect(profile?.jurisdictionKey).toBe(jurisdictionKey);
      expect(profile?.programKey).toBe(`transit:${stateUsps.toLowerCase()}`);
      expect(profile?.availabilityDays).toBe(365);
      if (profile) keys.add(profile.programKey);
    }
    expect(keys.size).toBe(50);
  });
  it("keeps separate standing funds in the same state distinct", () => {
    const schools = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const transit = enact(schools.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:rural-transit-assistance",
    });
    expect(
      openAppropriationsFor(transit.world, jurisdictionId).map(
        (record) => record.sourceMeasureId,
      ),
    ).not.toContain(transit.measureId);
    expect(appropriations(transit.world)).toMatchObject([
      {
        sourceMeasureId: schools.measureId,
        programKey: "appropriations:ne",
      },
      { sourceMeasureId: transit.measureId, programKey: "transit:ne" },
    ]);
  });

  it("keeps a supplemental in its named program with a separate edition after reload", () => {
    const first = enact(scenario.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const resumed = deserializeWorld(serializeWorld(first.world));
    const supplemental = enact(resumed, {
      familyKey: "appropriations",
      variantKey: "supplemental",
      authorityKey: "standing:school-facilities",
    });
    const records = appropriations(supplemental.world);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.programKey)).toEqual([
      "appropriations:ne",
      "appropriations:ne",
    ]);
    expect(new Set(records.map((record) => record.id)).size).toBe(2);
    expect(records.map((record) => record.sourceMeasureId)).toEqual([
      first.measureId,
      supplemental.measureId,
    ]);
    const replayed = applyEnactedLawEffects(
      deserializeWorld(serializeWorld(supplemental.world)),
      supplemental.measureId,
    );
    expect(serializeWorld(replayed)).toBe(serializeWorld(supplemental.world));
  });

  it("does not assign a docket bill's aggregate ceiling to an unnamed program", () => {
    const authorized = enact(scenario.world, {
      familyKey: "bridge-maintenance",
      variantKey: "worst-first-condition",
    });
    const funded = enact(authorized.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: `docket:${authorized.docketKey}`,
    });
    expect(
      appropriations(funded.world).filter(
        (record) => record.sourceMeasureId === funded.measureId,
      ),
    ).toEqual([]);
  });
});

function enactedFederalRailFixture(): { world: World; measureId: EntityId } {
  const seed = "federal-mapped-appropriation-writer";
  const currentDate = makeIsoDate("2026-01-05");
  const home = stateJurisdictionForKey("US-KY")!;
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: home.id,
  });
  const world = createWorld({
    seed,
    currentDate,
    policyCatalog: createProductionPolicyCatalog(),
    jurisdictions: [home, NATIONAL_ELECTION_JURISDICTION],
    people: [person],
    control: { kind: "person", personId: person.id },
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) =>
      row.stableKey ===
      "us-federal-positions:transport-water.expand-passenger-rail",
  );
  if (!proposition) throw new Error("The federal rail question is missing.");
  const filed = introduceAutomaticLawMeasure(world, {
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    governmentLevel: "federal",
    propositionId: proposition.id,
    answer: "yes",
    intakeKey: "federal-mapped-appropriation-writer",
    stableKey: "federal-mapped-appropriation-writer:measure",
    designation: "H.R. 101",
    sponsorPersonId: person.id,
    originChamberKey: "house",
    principleRecordIds: [],
    principleScore: 1,
  });
  if (!filed) throw new Error("The federal rail bill was not compiled.");
  // Walk the canonical procedure so the writer sees an enactment with its
  // legal action history and outcome event, rather than a forged ledger row.
  const bodies = US_CONGRESS_RULE_PACK.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      chamber.chamberKey === "senate" ? 100 : 435,
      [],
      false,
    ),
  );
  const votePlan = Object.fromEntries(
    US_CONGRESS_RULE_PACK.chambers.flatMap((chamber) => {
      const body = bodies.find((row) => row.chamberKey === chamber.chamberKey)!;
      return [
        ...chamber.committees.map(
          (committee) =>
            [
              votePlanKeyForCommittee(committee.committeeKey),
              { yea: committee.appointedMembers },
            ] as const,
        ),
        ...chamber.floorStages.map(
          (stage) =>
            [
              votePlanKeyForFloor(chamber.chamberKey, stage.stageKey),
              { yea: body.members.length },
            ] as const,
        ),
      ];
    }),
  );
  const procedure = {
    pack: US_CONGRESS_RULE_PACK,
    measureId: filed.measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "The President signed the fixture bill.",
  };
  let enacted = filed.world;
  for (
    let guard = 0;
    guard < 24 && measurePosition(enacted, filed.measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(enacted, filed.measureId).find(
      (key) => key !== "offer-amendment" && key !== "request-committee-hearing",
    );
    if (!step) break;
    enacted = applyLegislativeStep(procedure, enacted, step).world;
  }
  expect(measurePosition(enacted, filed.measureId).outcome).toBe("enacted");
  return { world: enacted, measureId: filed.measureId };
}

describe("mapped federal appropriation writer", () => {
  it("records one authority from the exact enacted amount and remains idempotent", () => {
    const { world, measureId } = enactedFederalRailFixture();
    const amount = world.history.legislativeProvisions?.find(
      (row) =>
        row.measureId === measureId && row.provisionKey === "amount-provided",
    )?.fiscalExposureMinorUnits;
    const next = appropriationFromEnactedMeasure(world, measureId);
    const records = appropriations(next).filter(
      (row) => row.sourceMeasureId === measureId,
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      programKey: "appropriations:us",
      amount: { minorUnits: amount, currency: "USD" },
    });
    expect(next.history.resourceFlows).toHaveLength(
      world.history.resourceFlows.length,
    );
    const replayed = appropriationFromEnactedMeasure(next, measureId);
    expect(
      appropriations(replayed).filter(
        (row) => row.sourceMeasureId === measureId,
      ),
    ).toHaveLength(1);
  });

  it("refuses mismatched authority, unknown amount and an effectless ceiling", () => {
    const { world, measureId } = enactedFederalRailFixture();
    const wrongAuthority: World = {
      ...world,
      history: {
        ...world.history,
        legislativeDraftLineages: (
          world.history.legislativeDraftLineages ?? []
        ).map((row) =>
          row.measureId === measureId
            ? { ...row, authorityKey: "game-profile:unrelated" }
            : row,
        ),
      },
    };
    expect(appropriationFromEnactedMeasure(wrongAuthority, measureId)).toBe(
      wrongAuthority,
    );
    const mutateProvision = (
      patch: Partial<
        NonNullable<World["history"]["legislativeProvisions"]>[number]
      >,
    ): World => ({
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: (world.history.legislativeProvisions ?? []).map(
          (row) =>
            row.measureId === measureId &&
            row.provisionKey === "amount-provided"
              ? { ...row, ...patch }
              : row,
        ),
      },
    });
    const unknown = mutateProvision({ fiscalExposureMinorUnits: null });
    expect(appropriationFromEnactedMeasure(unknown, measureId)).toBe(unknown);
    const ceiling = mutateProvision({ operativeEffect: undefined });
    expect(appropriationFromEnactedMeasure(ceiling, measureId)).toBe(ceiling);
  });
});
