import { describe, expect, it } from "vitest";

import { applyLegislativeStep } from "../presentation/legislation-session";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { candidacyEligibility } from "./candidacy";
import { addDays, ageOnDate, daysBetween } from "./dates";
import {
  enactedRuleChanges,
  fileRuleChangeProvision,
} from "./enacted-rule-changes";
import { availableMeasureSteps, measurePosition } from "./legislation";
import { createLegislativeScenario } from "./legislation-scenarios";
import { advanceWorld } from "./world";
import type { World } from "./types";

/**
 * A law the game passes changes who may stand for the office it names. Alaska
 * is used because its House carries a compiled qualification rule set, so the
 * law has a compiled rule to replace rather than an empty one to fill.
 */
function enactThrough(
  scenario: ReturnType<typeof createLegislativeScenario>,
  world: World,
): World {
  let next = world;
  for (
    let index = 0;
    index < 40 && measurePosition(next, scenario.measureId).phase !== "enacted";
    index++
  ) {
    const step = availableMeasureSteps(next, scenario.measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No supported next step: ${measurePosition(next, scenario.measureId).phase}`,
      );
    next = publishLegislativeTransition(
      next,
      applyLegislativeStep(scenario, next, step).world,
    );
  }
  expect(measurePosition(next, scenario.measureId).phase).toBe("enacted");
  return next;
}

describe("a law passed in the game changes who may stand", () => {
  it("applies an enacted minimum age from the day it operates, and names the law", () => {
    const scenario = createLegislativeScenario("alaska");
    const officeKey = `${scenario.pack.packId}:house`;
    const personId = scenario.playerPersonId;
    const jurisdictionId = scenario.world.people[personId]!.homeJurisdictionId;
    const age = ageOnDate(
      scenario.world.people[personId]!.birthDate,
      scenario.world.currentDate,
    );
    // Set above this person's age so the law, and only the law, bars them.
    const minimum = Math.min(100, Math.max(age + 5, 18));
    const filed = fileRuleChangeProvision(scenario.world, {
      stableKey: "house-age",
      measureId: scenario.measureId,
      officeKey,
      field: "qualification.minimumAge",
      value: minimum,
    });
    const eligibility = (world: World) =>
      candidacyEligibility(world, {
        personId,
        jurisdictionId,
        officeKey,
        alreadyACandidate: false,
      });
    const lawBlock = (world: World) =>
      eligibility(world).blocks.find(
        (block) =>
          block.kind === "sourced-minimum-age" &&
          block.reason.includes(`minimum age of ${minimum}`),
      );

    const enacted = enactThrough(scenario, filed);
    const change = enactedRuleChanges(enacted)[0]!;
    expect(change.field).toBe("qualification.minimumAge");
    // Passed but not yet operative: the compiled rule still decides.
    expect(lawBlock(enacted)).toBeUndefined();

    const operative = advanceWorld(
      enacted,
      daysBetween(enacted.currentDate, addDays(change.operativeAt, 1)),
    );
    const block = lawBlock(operative);
    expect(block?.reason).toContain(change.designation);
    expect(eligibility(operative).eligible).toBe(false);
    // The compiled age rule is replaced, not reported alongside it.
    expect(
      eligibility(operative).blocks.filter(
        (entry) => entry.kind === "sourced-minimum-age",
      ),
    ).toHaveLength(1);
  });

  it("lets a law remove a residence period the compiled rule required", () => {
    const scenario = createLegislativeScenario("alaska");
    const officeKey = `${scenario.pack.packId}:house`;
    const personId = scenario.playerPersonId;
    const jurisdictionId = scenario.world.people[personId]!.homeJurisdictionId;
    // Before the law, Alaska's three years of state residence bar this life.
    expect(
      candidacyEligibility(scenario.world, {
        personId,
        jurisdictionId,
        officeKey,
        alreadyACandidate: false,
      }).blocks.some((block) => block.kind === "sourced-state-residence"),
    ).toBe(true);
    const filed = fileRuleChangeProvision(scenario.world, {
      stableKey: "house-residence",
      measureId: scenario.measureId,
      officeKey,
      field: "qualification.stateResidenceYears",
      value: 0,
    });
    const enacted = enactThrough(scenario, filed);
    const change = enactedRuleChanges(enacted)[0]!;
    const operative = advanceWorld(
      enacted,
      daysBetween(enacted.currentDate, addDays(change.operativeAt, 1)),
    );
    const result = candidacyEligibility(operative, {
      personId,
      jurisdictionId,
      officeKey,
      alreadyACandidate: false,
    });
    expect(
      result.blocks.some((block) => block.kind === "sourced-state-residence"),
    ).toBe(false);
    expect(
      result.qualificationAssessments.find(
        (assessment) => assessment.field === "STATE_RESIDENCE",
      ),
    ).toMatchObject({ verdict: "meets" });
  });
});
