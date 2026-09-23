import { describe, expect, it } from "vitest";

import { createLegislativeScenario, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  applyEnactedLawEffects,
  enactedLawEffects,
  enactedLawsWithEffects,
} from "../simulation/enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import { fileDraft } from "./legislation-docket";
import { projectMeasureBriefing } from "./legislation-projection";
import { applyLegislativeStep } from "./legislation-session";
import { publishLegislativeTransition } from "./publish-legislative-transition";

/**
 * A law the player passes changes the records it governs, through the same
 * transition the game runs after every legislative action — and the player
 * can read back what it changed and what it could not change yet.
 *
 * Nebraska and Alaska, not Kentucky: the owner asked that tests span places.
 */

function enactFromDocket(
  scenarioKey: "nebraska" | "alaska",
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
  },
): { readonly world: World; readonly measureId: EntityId } {
  const scenario = createLegislativeScenario(scenarioKey);
  const filed = fileDraft(scenario.world, {
    scenarioKey,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
    ...draft,
  });
  const measureId = filed.bill.measureId;
  const context = { ...scenario, measureId };
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
    // The same boundary the game runs after every player legislative action.
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(context, world, step).world,
    );
  }
  return { world, measureId };
}

const appropriations = (world: World, measureId: EntityId) =>
  (world.history.publicProgramRecords ?? []).filter(
    (row) => row.kind === "appropriation" && row.sourceMeasureId === measureId,
  );

describe("a law the player passes changes what it governs", () => {
  it("turns a passed Nebraska appropriation into money the state can spend", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    // Before this step existed, the player's route wrote no spending
    // authority at all: only the institution clock did.
    expect(appropriations(world, measureId)).toHaveLength(1);

    const effects = enactedLawEffects(world, measureId)!;
    expect(effects.level).toBe("state");
    const money = effects.lines.find((line) => line.kind === "appropriation");
    expect(money).toBeDefined();
    if (money?.kind !== "appropriation") return;
    const record = appropriations(world, measureId)[0]!;
    expect(record.kind === "appropriation" && record.amount.minorUnits).toBe(
      money.amountMinorUnits,
    );
    expect(money.amountMinorUnits).toBeGreaterThan(0);
    // Nothing has been committed or paid yet; the reading says so rather
    // than implying delivery.
    expect(money.committedMinorUnits).toBe(0);
    expect(money.paidMinorUnits).toBe(0);
  });

  it("writes each effect once, however many routes apply it", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const twice = applyEnactedLawEffects(
      applyEnactedLawEffects(world, measureId),
      measureId,
    );
    expect(appropriations(twice, measureId)).toHaveLength(1);
  });

  it("says plainly which parts of a passed Alaska law the world cannot act on yet", () => {
    const { world, measureId } = enactFromDocket("alaska", {
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    expect(appropriations(world, measureId)).toHaveLength(0);
    const effects = enactedLawEffects(world, measureId)!;
    expect(effects.lines.length).toBeGreaterThan(0);
    // A reporting duty has no consumer, so every line is an honest gap with
    // the research question behind it, never an invented effect.
    for (const line of effects.lines) {
      expect(line.kind).toBe("not-modeled");
      if (line.kind !== "not-modeled") continue;
      expect(line.heading.length).toBeGreaterThan(0);
      expect(line.researchQuestionId).toBe("law-clause-effects-by-family");
    }
  });

  it("reads a law's effects without spending a day or writing a fact", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const before = serializeWorld(world);
    enactedLawEffects(world, measureId);
    enactedLawsWithEffects(world);
    expect(serializeWorld(world)).toBe(before);
  });

  it("tells the player on the bill's page what the law changed", () => {
    const { world, measureId } = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const briefing = projectMeasureBriefing(world, measureId);
    expect(briefing.whatItChanged.length).toBeGreaterThan(0);
    const money = briefing.whatItChanged.find((line) => line.includes("$"));
    expect(money).toMatch(/available to spend|can be spent from/);
    // No source, research id or internal key reaches the page.
    for (const line of briefing.whatItChanged)
      expect(line).not.toMatch(/law-clause|research|standing:/i);

    const reporting = enactFromDocket("alaska", {
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    const gaps = projectMeasureBriefing(
      reporting.world,
      reporting.measureId,
    ).whatItChanged;
    expect(
      gaps.every((line) =>
        line.endsWith("nothing in the world acts on this part of the law yet."),
      ),
    ).toBe(true);
  });

  it("shows nothing on the page of a bill that is not law", () => {
    const scenario = createLegislativeScenario("alaska");
    const filed = fileDraft(scenario.world, {
      scenarioKey: "alaska",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId:
        scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(
      projectMeasureBriefing(filed.world, filed.bill.measureId).whatItChanged,
    ).toEqual([]);
  });

  it("has nothing to say about a bill that is not law", () => {
    const scenario = createLegislativeScenario("alaska");
    const filed = fileDraft(scenario.world, {
      scenarioKey: "alaska",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId:
        scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
      familyKey: "agency-reporting",
      variantKey: "annual-legislative-report",
    });
    expect(enactedLawEffects(filed.world, filed.bill.measureId)).toBeNull();
    expect(applyEnactedLawEffects(filed.world, filed.bill.measureId)).toBe(
      filed.world,
    );
  });
});
