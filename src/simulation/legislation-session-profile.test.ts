import { describe, expect, it } from "vitest";

import { applyLegislativeStep } from "../presentation/legislation-session";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import {
  LEGISLATIVE_INSTITUTION_STEP,
  scheduleInstitutionStep,
} from "./governing/legislative-clock";
import { createStableId } from "./ids";
import {
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
} from "./legislation";
import { createLegislativeScenario } from "./legislation-scenarios";
import {
  drawLegislativeStartingProcedures,
  LEGISLATIVE_STARTING_PROCEDURES_VERSION,
  type LegislativeStartingProcedureEntry,
} from "./legislative-starting-procedures";
import { regularSessionDateStatus } from "./legislative-procedure-world";
import { legislativeRulePackForWorld } from "./legislative-procedure-world";
import { advanceWorld } from "./world";
import type { World } from "./types";

function withSavedKentuckyProcedure(
  world: World,
  entry: LegislativeStartingProcedureEntry,
): World {
  const stableKey = "test:legislative-starting-procedures";
  const record = {
    id: createStableId("world-condition", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    effectiveDate: world.currentDate,
    policyVersion: "test-legislative-starting-procedures/v1",
    provenanceClass: "simulated-condition" as const,
    kind: "legislative-starting-procedures" as const,
    contractVersion: LEGISLATIVE_STARTING_PROCEDURES_VERSION,
    procedures: {
      ...drawLegislativeStartingProcedures({ seed: "session-route" }),
      "US-KY": entry,
    },
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      worldConditions: [...(world.history.worldConditions ?? []), record],
    },
  };
}

function scenarioAt(date: string, entry: LegislativeStartingProcedureEntry) {
  const scenario = createLegislativeScenario("kentucky");
  const advanced = advanceWorld(
    scenario.world,
    daysBetween(scenario.world.currentDate, makeIsoDate(date)),
  );
  const world = withSavedKentuckyProcedure(advanced, entry);
  const committeeKey = scenario.pack.chambers[0]!.committees[0]!.committeeKey;
  return { scenario, world, committeeKey };
}

function pendingExecutiveDecision() {
  const scenario = createLegislativeScenario("kentucky");
  let world = scenario.world;
  for (
    let index = 0;
    index < 40 &&
    measurePosition(world, scenario.measureId).phase !== "awaiting-executive";
    index++
  ) {
    const step = availableMeasureSteps(world, scenario.measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) throw new Error("No supported step before executive review.");
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(scenario, world, step).world,
    );
  }
  expect(measurePosition(world, scenario.measureId).phase).toBe(
    "awaiting-executive",
  );
  return { scenario, world };
}

describe("saved regular-session procedure at a pending measure", () => {
  const drawn = drawLegislativeStartingProcedures({ seed: "session-route" })[
    "US-KY"
  ]!;

  it("hides a referral in an off year and refuses a direct referral write", () => {
    const entry: LegislativeStartingProcedureEntry = {
      ...drawn,
      sessionCadence: "biennial",
      sessionYearParity: "even",
    };
    const { scenario, world, committeeKey } = scenarioAt("2027-01-05", entry);
    const pack = legislativeRulePackForWorld(world, scenario.pack.packId);
    expect(regularSessionDateStatus(pack, world.currentDate).kind).toBe(
      "outside-regular-session-year",
    );
    expect(availableMeasureSteps(world, scenario.measureId)).toEqual([]);
    expect(() =>
      referMeasure(world, {
        stableKey: "off-year-referral",
        measureId: scenario.measureId,
        committeeKey,
      }),
    ).toThrow(/regular session is not scheduled in 2027/);
    expect(world.history.committeeReferrals ?? []).toHaveLength(0);
  });

  it("hides a referral after the saved outer limit and refuses a direct write", () => {
    const cutoff = drawn.baselinePack.session.regularSessionLatestAdjournment;
    expect(cutoff).not.toBeNull();
    const lastDay = makeIsoDate(
      `2026-${String(cutoff!.value.evenYear.month).padStart(2, "0")}-${String(cutoff!.value.evenYear.day).padStart(2, "0")}`,
    );
    const firstDayAfter = addDays(lastDay, 1);
    const { scenario, world, committeeKey } = scenarioAt(firstDayAfter, drawn);
    const pack = legislativeRulePackForWorld(world, scenario.pack.packId);
    expect(regularSessionDateStatus(pack, world.currentDate).kind).toBe(
      "past-outer-limit",
    );
    expect(availableMeasureSteps(world, scenario.measureId)).toEqual([]);
    expect(() =>
      referMeasure(world, {
        stableKey: "past-limit-referral",
        measureId: scenario.measureId,
        committeeKey,
      }),
    ).toThrow(/regular session cannot continue after/);
    expect(world.history.committeeReferrals ?? []).toHaveLength(0);
  });

  it("keeps executive review and enactment available after the session limit", () => {
    const { scenario, world: pending } = pendingExecutiveDecision();
    const cutoff = drawn.baselinePack.session.regularSessionLatestAdjournment!;
    const lastDay = makeIsoDate(
      `2026-${String(cutoff.value.evenYear.month).padStart(2, "0")}-${String(cutoff.value.evenYear.day).padStart(2, "0")}`,
    );
    const firstDayAfter = addDays(lastDay, 1);
    expect(pending.currentDate <= lastDay).toBe(true);
    const advanced = advanceWorld(
      pending,
      daysBetween(pending.currentDate, firstDayAfter),
    );
    const afterSession = withSavedKentuckyProcedure(advanced, drawn);
    expect(availableMeasureSteps(afterSession, scenario.measureId)).toEqual([
      "await-executive-decision",
    ]);
    const signed = recordExecutiveAction(afterSession, {
      stableKey: "post-session-signature",
      measureId: scenario.measureId,
      action: "signed",
      rationale: "The Governor signed the measure.",
    });
    expect(availableMeasureSteps(signed, scenario.measureId)).toEqual([
      "record-enactment",
    ]);
    const scheduled = scheduleInstitutionStep(signed, scenario.measureId);
    expect(
      scheduled.history.futureDueItems.some(
        (item) =>
          item.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
          item.entityIds.includes(scenario.measureId) &&
          item.dueAt > firstDayAfter,
      ),
    ).toBe(true);
    const enacted = recordEnactment(signed, {
      stableKey: "post-session-enactment",
      measureId: scenario.measureId,
      actDesignation: "2026 Ky. Acts ch. 80",
    });
    expect(measurePosition(enacted, scenario.measureId).phase).toBe("enacted");
    expect(enacted.history.legislativeEnactments?.at(-1)).toMatchObject({
      effectiveAt: addDays(firstDayAfter, drawn.effectiveDateDays),
      effectiveDateBasis: "game-default",
    });
  });
});
