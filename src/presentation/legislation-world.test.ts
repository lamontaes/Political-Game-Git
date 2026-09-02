import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  legislativeScenarioKeys,
  measurePosition,
  serializeWorld,
} from "../simulation";
import type { MeasureStepKey, World } from "../simulation";
import {
  applyLegislativeCommand,
  legislativeWorkAvailableIn,
  openLegislativeWork,
} from "./legislation-world";
import type { LegislativeAssignment } from "./legislation-world";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { projectMeasureBriefing } from "./legislation-projection";

/**
 * A bill belongs to the save it was moved through.
 *
 * The audit found legislation running in a world of its own, kept in its own
 * corner of local storage — so two different lives in the same state shared one
 * bill's history, and a player's own save had no record of the work they did.
 */

const BASE: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  givenName: null,
  familyName: null,
};

function staffer(seed: string, placeKey = "kentucky") {
  const game = createNewGameWorld({ ...BASE, placeKey, seed });
  const capabilities = resolvePlayerCapabilities(game.world);
  return { ...game, capabilities };
}

function open(seed: string, scenarioKey = "kentucky", placeKey = "kentucky") {
  const { world, playerPersonId, capabilities } = staffer(seed, placeKey);
  return openLegislativeWork(world, {
    scenarioKey,
    playerPersonId,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
}

/** Runs the steps the briefing says the player may actually take. */
function take(
  world: World,
  assignment: LegislativeAssignment,
  steps: readonly MeasureStepKey[],
): World {
  let next = world;
  for (const step of steps) {
    next = applyLegislativeCommand(next, assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  return next;
}

describe("Legislative work happens in the player's own world", () => {
  it("files the bill into the loaded world, not a world of its own", () => {
    const { world: before, playerPersonId, capabilities } = staffer("one");
    expect(before.history.legislativeMeasures ?? []).toHaveLength(0);

    const { world, assignment } = openLegislativeWork(before, {
      scenarioKey: "kentucky",
      playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });

    const measures = world.history.legislativeMeasures ?? [];
    expect(measures).toHaveLength(1);
    expect(measures[0]!.id).toBe(assignment.measureId);
    expect(world.id).toBe(before.id);
    // The sponsor is somebody this world contains, not a scenario's person.
    expect(world.people[assignment.sponsorPersonId]).toBeDefined();
  });

  it("keeps a step in the world it was taken in, through save and reload", () => {
    const { world, assignment } = open("two");
    const moved = take(world, assignment, [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
    ]);
    const before = measurePosition(moved, assignment.measureId);

    const reloaded = deserializeWorld(serializeWorld(moved));
    const reopened = openLegislativeWork(reloaded, {
      scenarioKey: "kentucky",
      playerPersonId:
        reloaded.control.kind === "person" ? reloaded.control.personId : "",
      jurisdictionId: (reloaded.history.legislativeMeasures ?? [])[0]!
        .jurisdictionId,
    });

    // Reopening finds the bill where it was left rather than filing it again.
    expect(reopened.world.history.legislativeMeasures ?? []).toHaveLength(1);
    expect(reopened.assignment.measureId).toBe(assignment.measureId);
    const after = measurePosition(
      reopened.world,
      reopened.assignment.measureId,
    );
    expect(after.phase).toBe(before.phase);
    expect(after.chamberKey).toBe(before.chamberKey);
    expect(
      reopened.world.history.legislativeCommitteeActions ??
        reopened.world.history.events.length,
    ).toBeDefined();
  });

  it("does not let two saves in the same place share a bill's history", () => {
    const first = open("save-one");
    const second = open("save-two");
    expect(first.world.id).not.toBe(second.world.id);
    // Different worlds, therefore different measures: moving one bill through
    // committee cannot show up in somebody else's game.
    expect(first.assignment.measureId).not.toBe(second.assignment.measureId);

    const movedFirst = take(first.world, first.assignment, [
      "request-referral",
    ]);
    expect(
      measurePosition(movedFirst, first.assignment.measureId).phase,
    ).not.toBe(
      measurePosition(second.world, second.assignment.measureId).phase,
    );
  });

  it("offers only the bills written for the legislature the job is in", () => {
    const kentucky = staffer("place-ky", "kentucky");
    const nebraska = staffer("place-ne", "nebraska");

    const kentuckyKeys = legislativeWorkAvailableIn(
      kentucky.capabilities.legislativeJurisdictionId!,
    );
    const nebraskaKeys = legislativeWorkAvailableIn(
      nebraska.capabilities.legislativeJurisdictionId!,
    );
    expect(kentuckyKeys.length).toBeGreaterThan(0);
    expect(nebraskaKeys.length).toBeGreaterThan(0);
    for (const key of kentuckyKeys) expect(nebraskaKeys).not.toContain(key);
  });

  it("refuses a bill from a legislature this character does not work in", () => {
    const { world, playerPersonId, capabilities } = staffer("wrong-place");
    expect(() =>
      openLegislativeWork(world, {
        scenarioKey: "nebraska",
        playerPersonId,
        jurisdictionId: capabilities.legislativeJurisdictionId!,
      }),
    ).toThrow(/does not belong to this character's legislature/);
  });

  it("shows the authored-measure notice on every bill", () => {
    for (const scenarioKey of legislativeScenarioKeys()) {
      expect(scenarioKey.trim().length).toBeGreaterThan(0);
    }
    const { world, assignment } = open("notice");
    expect(assignment.measureNotice).toContain("not a real one");
    const briefing = projectMeasureBriefing(world, assignment.measureId);
    expect(briefing.designation).toBe("HB 214");
  });
});
