import { describe, expect, it } from "vitest";
import {
  advanceWorld,
  createLegislativeScenario,
  daysBetween,
  deserializeWorld,
  makeIsoDate,
  serializeWorld,
} from "../simulation";
import {
  applyLegislativeCommand,
  openLegislativeWork,
  type LegislativeAssignment,
} from "./legislation-world";
import { regularSessionWindow } from "./legislative-session-window";

function fixture(onDate: string) {
  const scenario = createLegislativeScenario("kentucky");
  const world = advanceWorld(
    scenario.world,
    daysBetween(scenario.world.currentDate, makeIsoDate(onDate)),
  );
  const assignment: LegislativeAssignment = {
    scenarioKey: scenario.scenarioKey,
    label: scenario.label,
    measureNotice: scenario.measureNotice,
    measureId: scenario.measureId,
    sponsorPersonId: scenario.playerPersonId,
    procedure: scenario,
  };
  return { world, assignment };
}

describe("P12 sourced regular-session outer boundary", () => {
  it("refuses the reported March 31, 2037 action without expiring or replacing the bill", () => {
    const { world, assignment } = fixture("2037-03-31");
    const before = serializeWorld(world);
    expect(() =>
      applyLegislativeCommand(world, assignment, {
        kind: "take-step",
        step: "request-referral",
      }),
    ).toThrow(/2037-03-30/);
    expect(serializeWorld(world)).toBe(before);
    expect(serializeWorld(deserializeWorld(before))).toBe(before);
    expect(
      world.history.legislativeMeasures?.some(
        (m) => m.id === assignment.measureId,
      ),
    ).toBe(true);
  });
  it("keeps the inclusive outer deadline distinct from proof that a session convened", () => {
    const { world, assignment } = fixture("2037-03-30");
    expect(
      regularSessionWindow(assignment.procedure.pack, world.currentDate).kind,
    ).toBe("within-outer-limit");
    expect(() =>
      applyLegislativeCommand(world, assignment, {
        kind: "take-step",
        step: "request-referral",
      }),
    ).not.toThrow();
    expect(
      regularSessionWindow(assignment.procedure.pack, makeIsoDate("2038-04-15"))
        .kind,
    ).toBe("within-outer-limit");
    expect(
      regularSessionWindow(assignment.procedure.pack, makeIsoDate("2038-04-16"))
        .kind,
    ).toBe("past-outer-limit");
  });
  it("checks the actual future hearing date before scheduling or advancing time", () => {
    const { world, assignment } = fixture("2037-03-25");
    const referred = applyLegislativeCommand(world, assignment, {
      kind: "take-step",
      step: "request-referral",
    }).world;
    const before = serializeWorld(referred);
    expect(() =>
      applyLegislativeCommand(referred, assignment, {
        kind: "take-step",
        step: "request-committee-hearing",
      }),
    ).toThrow(/2037-03-30/);
    expect(serializeWorld(referred)).toBe(before);
  });
  it("refuses a new legacy introduction but keeps an existing assignment readable", () => {
    const { world, assignment } = fixture("2037-03-30");
    const input = {
      scenarioKey: "kentucky",
      playerPersonId: assignment.sponsorPersonId,
      jurisdictionId: world.history.legislativeMeasures![0]!.jurisdictionId,
    };
    const opened = openLegislativeWork(world, input);
    const later = advanceWorld(opened.world, 1);
    const before = serializeWorld(later);
    expect(openLegislativeWork(later, input).world).toBe(later);
    expect(serializeWorld(later)).toBe(before);
    const unfiledLater = advanceWorld(world, 1);
    expect(() => openLegislativeWork(unfiledLater, input)).toThrow(
      /2037-03-30/,
    );
  });

  it("does not parse another pack's explanatory text into an invented deadline", () => {
    const scenario = createLegislativeScenario("nebraska");
    expect(
      regularSessionWindow(scenario.pack, makeIsoDate("2037-03-31")),
    ).toEqual({ kind: "unresolved" });
  });
});
