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
