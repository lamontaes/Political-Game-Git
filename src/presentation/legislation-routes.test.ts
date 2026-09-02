import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
  measurePosition,
} from "../simulation";
import type { MeasureStepKey, World } from "../simulation";
import { applyLegislativeStep } from "./legislation-session";
import { projectMeasureBriefing } from "./legislation-projection";

/**
 * Where a bill can end up, and how.
 *
 * The six measures this branch inherited all ended one of three ways: signed,
 * killed in committee, or vetoed and overridden. That made concurrence look
 * like a formality, a floor vote look like a rubber stamp once committee had
 * reported, and a veto look like a speed bump. Three more measures exercise the
 * routes the state machine already supports and nothing had asked it for.
 *
 * These are authored bills, not real ones, and the vote counts are authored
 * decisions rather than a model of how anybody would actually vote.
 */

function play(
  scenarioKey: string,
  steps: readonly MeasureStepKey[],
): { readonly world: World; readonly measureId: string } {
  const scenario = createLegislativeScenario(scenarioKey);
  let world = scenario.world;
  for (const step of steps) {
    world = applyLegislativeStep(scenario, world, step).world;
  }
  return { world, measureId: scenario.measureId };
}

function lastMessage(scenarioKey: string, steps: readonly MeasureStepKey[]) {
  const scenario = createLegislativeScenario(scenarioKey);
  let world = scenario.world;
  let message = "";
  for (const step of steps) {
    const result = applyLegislativeStep(scenario, world, step);
    world = result.world;
    message = result.message;
  }
  return message;
}

const THROUGH_KENTUCKY_HOUSE: readonly MeasureStepKey[] = [
  "request-referral",
  "request-committee-hearing",
  "move-committee-report",
  "request-calendar-placement",
  "move-floor-vote",
  "transmit-to-second-chamber",
  "request-referral",
  "request-committee-hearing",
  "move-committee-report",
  "request-calendar-placement",
];

describe("Ways a bill can end that nothing was proving", () => {
  it("lets the two chambers fail to agree on one text", () => {
    // HB 502: the Senate narrows the bill, and the House will not accept the
    // change. Fifty-one of the hundred members elected are needed and the
    // authored decisions give it forty-four.
    const steps: readonly MeasureStepKey[] = [
      ...THROUGH_KENTUCKY_HOUSE,
      "offer-amendment",
      "move-floor-vote",
      "move-concurrence",
    ];
    const { world, measureId } = play("kentucky-crossing-signals", steps);
    expect(measurePosition(world, measureId).phase).toBe("failed");
    expect(lastMessage("kentucky-crossing-signals", steps)).toContain(
      "never agreed on one bill",
    );

    const briefing = projectMeasureBriefing(world, measureId);
    expect(briefing.designation).toBe("HB 502");
    expect(briefing.finished).toBe(true);
  });

  it("lets an override fall short so the veto stands", () => {
    // LB 219: twenty-eight senators pass a bill and do not override a veto.
    // Twenty-five of the forty-nine elected pass; three fifths — thirty — are
    // needed to override.
    const steps: readonly MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "await-next-legislative-day",
      "move-floor-vote",
      "await-next-legislative-day",
      "move-floor-vote",
      "request-enrollment",
      "present-to-executive",
      "await-executive-decision",
      "move-veto-override",
    ];
    const { world, measureId } = play("nebraska-winter-clearing", steps);
    expect(measurePosition(world, measureId).phase).toBe("failed");
    expect(lastMessage("nebraska-winter-clearing", steps)).toContain(
      "the veto stands",
    );
    expect(projectMeasureBriefing(world, measureId).designation).toBe("LB 219");
  });

  it("lets the second chamber vote a bill down on the floor", () => {
    // HB 95: the House passes it, the Senate does not. Nine of twenty is not
    // the eleven a majority of the membership takes, and there is no veto to
    // override because the bill never reached a desk.
    const steps: readonly MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
      "transmit-to-second-chamber",
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
    ];
    const { world, measureId } = play("alaska-harbor-dredging", steps);
    expect(measurePosition(world, measureId).phase).toBe("failed");
    expect(lastMessage("alaska-harbor-dredging", steps)).toContain(
      "did not give your bill the votes it needed",
    );

    const briefing = projectMeasureBriefing(world, measureId);
    expect(briefing.designation).toBe("HB 95");
    // Nothing claims a governor acted on a bill that never reached one.
    expect(briefing.history.map((line) => line.headline).join(" ")).not.toMatch(
      /veto|signed/i,
    );
  });

  it("keeps every measure clearly fictional and sourced-procedure", () => {
    for (const scenarioKey of legislativeScenarioKeys()) {
      const scenario = createLegislativeScenario(scenarioKey);
      expect(scenario.measureNotice).toBe(
        "Written for development. The procedure is sourced; the bill is not a real one.",
      );
    }
  });

  it("gives each place more than one bill, taking different routes", () => {
    const keys = legislativeScenarioKeys();
    expect(keys).toHaveLength(9);
    for (const place of ["kentucky", "nebraska", "alaska"]) {
      const forPlace = keys.filter((key) => key.startsWith(place));
      expect(forPlace.length).toBeGreaterThanOrEqual(3);
    }
  });
});
