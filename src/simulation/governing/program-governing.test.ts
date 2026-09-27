import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
  nextMeasureStableKey,
  recordEnactment,
} from "../legislation";
import { createLegislativeScenario } from "../legislation-scenarios";
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
import { openAppropriationsFor } from "./program-governing";
import type { EntityId, World } from "../types";
import { fileDraft } from "../../presentation/legislation-docket";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { publishLegislativeTransition } from "../../presentation/publish-legislative-transition";

const scenario = createLegislativeScenario("nebraska");
const jurisdictionId =
  scenario.world.history.legislativeMeasures?.[0]?.jurisdictionId;
if (!jurisdictionId)
  throw new Error("The Nebraska legislature was not opened.");

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
