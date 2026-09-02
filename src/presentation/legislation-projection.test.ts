import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
} from "../simulation/legislation-scenarios";
import { applyLegislativeStep } from "./legislation-session";
import { projectMeasureBriefing } from "./legislation-projection";
import { measurePosition } from "../simulation/legislation";
import { assertWorldIntegrity } from "../simulation/world";
import type { MeasureStepKey } from "../simulation/legislation";
import type { World } from "../simulation/types";

function run(
  scenarioKey: string,
  steps: readonly MeasureStepKey[],
): { world: World; scenario: ReturnType<typeof createLegislativeScenario> } {
  const scenario = createLegislativeScenario(scenarioKey);
  let world = scenario.world;
  for (const step of steps) {
    world = applyLegislativeStep(scenario, world, step).world;
  }
  return { world, scenario };
}

/** Plays whatever the screen currently offers, until the bill is finished. */
function playThrough(
  scenarioKey: string,
  choose: (steps: readonly MeasureStepKey[]) => MeasureStepKey,
): { world: World; scenario: ReturnType<typeof createLegislativeScenario> } {
  const scenario = createLegislativeScenario(scenarioKey);
  let world = scenario.world;
  for (let guard = 0; guard < 40; guard += 1) {
    const briefing = projectMeasureBriefing(world, scenario.measureId);
    if (briefing.finished || briefing.options.length === 0) break;
    world = applyLegislativeStep(
      scenario,
      world,
      choose(briefing.options.map((option) => option.actionKey)),
    ).world;
  }
  return { world, scenario };
}

const LAST = (steps: readonly MeasureStepKey[]) => steps.at(-1)!;

describe("What the player is told about a bill", () => {
  it("answers where the bill is, who decides next, and what it takes", () => {
    const { world, scenario } = run("kentucky", ["request-referral"]);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    expect(briefing.designation).toBe("HB 214");
    expect(briefing.whereItStands).toContain("Committee on Transportation");
    expect(briefing.whoDecidesNext).toContain("Committee on Transportation");
    expect(briefing.whatHappensNext).toContain(
      "report the measure to the floor",
    );
    expect(briefing.requirementNote).toContain(
      "a majority of the committee's membership",
    );
    expect(briefing.whatJustHappened).toContain("Sent to committee");
    expect(briefing.options.map((option) => option.actionKey)).toContain(
      "move-committee-report",
    );
    expect(briefing.finished).toBe(false);
  });

  it("never offers the governor's decision as something the player picks", () => {
    const steps: MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "transmit-to-second-chamber",
      "request-referral",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "request-enrollment",
      "present-to-executive",
    ];
    const { world, scenario } = run("kentucky", steps);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    // One neutral wait, and nothing that claims to choose the outcome.
    expect(briefing.options).toHaveLength(1);
    const only = briefing.options[0]!;
    expect(only.actionKey).toBe("await-executive-decision");
    expect(only.playerMayAct).toBe(false);
    expect(only.label).toBe("Wait for the governor's decision");
    const labels = briefing.options.map((option) => option.label).join(" ");
    expect(labels).not.toMatch(/signs|vetoes/i);

    // The outcome is only known after the wait, and it is the scenario's, not
    // the player's: this governor vetoes.
    const after = applyLegislativeStep(
      scenario,
      world,
      "await-executive-decision",
    ).world;
    expect(measurePosition(after, scenario.measureId).phase).toBe(
      "awaiting-override",
    );
  });

  it("makes the second chamber's changes go back for agreement", () => {
    const steps: MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "transmit-to-second-chamber",
      "request-referral",
      "move-committee-report",
      "request-calendar-placement",
      "offer-amendment",
      "move-floor-vote",
    ];
    const { world, scenario } = run("kentucky", steps);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    // The Senate changed the bill, so the House has to live with that first.
    expect(briefing.whereItStands).toContain("has to decide whether to live");
    expect(briefing.whereItStands).not.toContain("final form");
    expect(briefing.options.map((option) => option.actionKey)).toEqual([
      "move-concurrence",
    ]);

    const agreed = applyLegislativeStep(
      scenario,
      world,
      "move-concurrence",
    ).world;
    expect(measurePosition(agreed, scenario.measureId).phase).toBe(
      "awaiting-enrollment",
    );
    assertWorldIntegrity(agreed);
  });

  it("sends an unamended bill straight on without an agreement vote", () => {
    const steps: MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "transmit-to-second-chamber",
      "request-referral",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
    ];
    const { world, scenario } = run("kentucky", steps);
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-enrollment",
    );
  });

  it("says plainly what the rules do not settle", () => {
    const steps: MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "transmit-to-second-chamber",
      "request-referral",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "request-enrollment",
      "present-to-executive",
    ];
    const { world, scenario } = run("kentucky", steps);
    const briefing = projectMeasureBriefing(world, scenario.measureId);
    expect(briefing.uncertainties.join(" ")).toContain(
      "Nobody has been able to tell you",
    );
    expect(briefing.deadlines.join(" ")).toContain("60 legislative days");
  });

  it("describes each institution's own shape rather than a generic legislature", () => {
    const nebraska = run("nebraska", ["request-referral"]);
    const nebraskaBriefing = projectMeasureBriefing(
      nebraska.world,
      nebraska.scenario.measureId,
    );
    expect(nebraskaBriefing.legislatureName).toBe("Nebraska Legislature");
    // "Most bills" is not "every bill", and the screen says so.
    expect(nebraskaBriefing.uncertainties.join(" ")).toContain(
      "Most bills get a hearing here",
    );
    expect(nebraskaBriefing.uncertainties.join(" ")).not.toContain(
      "guaranteed",
    );

    const kentucky = run("kentucky", ["request-referral"]);
    const kentuckyBriefing = projectMeasureBriefing(
      kentucky.world,
      kentucky.scenario.measureId,
    );
    expect(kentuckyBriefing.uncertainties.join(" ")).toContain(
      "can simply decline to take the bill up",
    );
  });

  it("makes Nebraska wait a day between its three floor stages", () => {
    // Take the plainest route: hold the hearing, report, and move the
    // question at each stage rather than amending.
    const { world, scenario } = playThrough("nebraska", LAST);
    const briefing = projectMeasureBriefing(world, scenario.measureId);
    expect(briefing.finished).toBe(true);

    const stageDates = briefing.votes
      .filter((vote) => vote.question === "Pass the bill")
      .map((vote) => vote.when);
    expect(stageDates).toHaveLength(3);
    expect(new Set(stageDates).size).toBe(3);
    assertWorldIntegrity(world);
  });

  it("reports a finished bill and its vote record", () => {
    const { world, scenario } = playThrough("kentucky", LAST);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    expect(briefing.finished).toBe(true);
    expect(briefing.whereItStands).toBe("The bill is law.");
    // The standing panel renders `whereItStands` and `outcomeNote` together, so
    // an outcome note that only repeated the headline would print it twice.
    expect(briefing.outcomeNote).toBeNull();
    expect(briefing.options).toEqual([]);
    const senate = briefing.votes.find(
      (vote) => vote.where === "Senate" && vote.question === "Pass the bill",
    );
    expect(senate).toMatchObject({ needed: 20, outOf: 38, result: "Carried" });
    expect(briefing.history.at(-1)?.headline).toBe("Became law");
  });

  it("keeps internal vocabulary out of everything a player reads", () => {
    const forbidden = [
      "run a",
      "run b",
      "run c",
      "fixture",
      "simulation",
      "presentation-only",
      "canonical",
      "stablekey",
      "minuteofday",
      "not settled in our sources",
    ];
    for (const key of legislativeScenarioKeys()) {
      const { world, scenario } = run(key, ["request-referral"]);
      const briefing = projectMeasureBriefing(world, scenario.measureId);
      const text = [
        briefing.summary,
        briefing.whereItStands,
        briefing.whatJustHappened ?? "",
        briefing.whoDecidesNext,
        briefing.whatHappensNext,
        briefing.requirementNote ?? "",
        ...briefing.options.flatMap((option) => [option.label, option.detail]),
        ...briefing.deadlines,
        ...briefing.uncertainties,
        ...briefing.history.flatMap((line) => [line.headline, line.detail]),
      ]
        .join(" ")
        .toLowerCase();
      for (const term of forbidden) {
        expect(text, `${key} briefing should not say "${term}"`).not.toContain(
          term,
        );
      }
    }
  });
});
