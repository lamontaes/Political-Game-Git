import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
} from "../simulation/legislation-scenarios";
import { applyLegislativeStep } from "./legislation-session";
import { projectMeasureBriefing } from "./legislation-projection";
import type { LegislativeActionKind, World } from "../simulation/types";

function run(
  scenarioKey: string,
  steps: readonly LegislativeActionKind[],
): { world: World; scenario: ReturnType<typeof createLegislativeScenario> } {
  const scenario = createLegislativeScenario(scenarioKey);
  let world = scenario.world;
  for (const step of steps) {
    world = applyLegislativeStep(scenario, world, step).world;
  }
  return { world, scenario };
}

describe("What the player is told about a bill", () => {
  it("answers where the bill is, who decides next, and what it takes", () => {
    const { world, scenario } = run("kentucky", ["referred"]);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    expect(briefing.designation).toBe("HB 214");
    expect(briefing.whereItStands).toContain("standing committee");
    expect(briefing.whoDecidesNext).toContain("standing committee");
    expect(briefing.whatHappensNext).toContain(
      "report the measure to the floor",
    );
    expect(briefing.requirementNote).toContain(
      "a majority of the committee's appointed members",
    );
    expect(briefing.whatJustHappened).toContain("Sent to committee");
    expect(briefing.options.map((option) => option.actionKey)).toContain(
      "committee-reported",
    );
    expect(briefing.finished).toBe(false);
  });

  it("says plainly what the rules do not settle", () => {
    const steps: LegislativeActionKind[] = [
      "referred",
      "committee-hearing-held",
      "committee-reported",
      "placed-on-calendar",
      "floor-stage-passed",
      "transmitted",
      "referred",
      "committee-reported",
      "placed-on-calendar",
      "floor-stage-passed",
      "enrolled",
      "presented-to-executive",
    ];
    const { world, scenario } = run("kentucky", steps);
    const briefing = projectMeasureBriefing(world, scenario.measureId);
    expect(briefing.uncertainties.join(" ")).toContain(
      "not settled in our sources",
    );
    expect(briefing.deadlines.join(" ")).toContain("60 legislative days");
  });

  it("describes each institution's own shape rather than a generic legislature", () => {
    const nebraska = run("nebraska", ["referred"]);
    const nebraskaBriefing = projectMeasureBriefing(
      nebraska.world,
      nebraska.scenario.measureId,
    );
    expect(nebraskaBriefing.legislatureName).toBe("Nebraska Legislature");
    expect(nebraskaBriefing.uncertainties.join(" ")).toContain(
      "guaranteed a public hearing",
    );

    const kentucky = run("kentucky", ["referred"]);
    const kentuckyBriefing = projectMeasureBriefing(
      kentucky.world,
      kentucky.scenario.measureId,
    );
    expect(kentuckyBriefing.uncertainties.join(" ")).toContain(
      "can simply decline to take the bill up",
    );
  });

  it("reports a finished bill and its vote record", () => {
    const steps: LegislativeActionKind[] = [
      "referred",
      "committee-hearing-held",
      "committee-reported",
      "placed-on-calendar",
      "floor-stage-passed",
      "transmitted",
      "referred",
      "committee-reported",
      "placed-on-calendar",
      "floor-stage-passed",
      "enrolled",
      "presented-to-executive",
      "signed",
      "override-succeeded",
      "enacted",
    ];
    const { world, scenario } = run("kentucky", steps);
    const briefing = projectMeasureBriefing(world, scenario.measureId);

    expect(briefing.finished).toBe(true);
    expect(briefing.outcomeNote).toBe("The bill is law.");
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
    ];
    for (const key of legislativeScenarioKeys()) {
      const { world, scenario } = run(key, ["referred"]);
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
