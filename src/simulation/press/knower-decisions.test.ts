import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { recordTraitChange } from "../people-traits";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { evaluateMisconductKnowerDecision } from "./knower-decisions";

function event(world: World, stableKey: string, personId: EntityId): World {
  return recordWorldEvent(world, {
    stableKey,
    type: "fixture.misconduct-knower-occasion",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "agency:decided", detail: "Was part of the occasion" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "A generated occasion for a knower decision test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("misconduct knowers decide from their cause and temperament", () => {
  it("replays the same decision and a grievance changes silence to disclosure", () => {
    const seed = "b14-knower-grievance-decision";
    const place = drawRandomPlace(seed);
    const opening = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
    });
    const initial = opening.world;
    const actor = opening.playerPersonId;
    const knower = initial.personOrder.find((id) => id !== actor)!;
    let world = event(initial, "fixture:act-event", actor);
    world = event(world, "fixture:record-reviewed", knower);
    world = event(world, "fixture:grievance", knower);
    const causeId = world.history.events.at(-1)!.id;
    for (const trait of ["risk", "conflict", "sociability"] as const) {
      world = recordTraitChange(world, {
        personId: knower,
        trait,
        value: -2,
        eventId: causeId,
        reason:
          "The generated fixture records a cautious, conciliatory tendency.",
      });
    }
    const occurrenceEventId = world.history.events.find(
      (item) => item.stableKey === "fixture:act-event",
    )!.id;
    const occurrenceId = "fixture-occurrence" as EntityId;
    const baseInput = {
      knowerPersonId: knower,
      actorPersonId: actor,
      occurrenceId,
      occurrenceEventId,
    } as const;
    const baseline = evaluateMisconductKnowerDecision(world, {
      ...baseInput,
      stableKey: "fixture:baseline",
      occasion: "record-reviewed",
      occasionEventId: world.history.events.find(
        (item) => item.stableKey === "fixture:record-reviewed",
      )!.id,
    });
    const replay = evaluateMisconductKnowerDecision(world, {
      ...baseInput,
      stableKey: "fixture:baseline",
      occasion: "record-reviewed",
      occasionEventId: world.history.events.find(
        (item) => item.stableKey === "fixture:record-reviewed",
      )!.id,
    });
    const withGrievance = evaluateMisconductKnowerDecision(world, {
      ...baseInput,
      stableKey: "fixture:grievance",
      occasion: "wronged",
      occasionEventId: causeId,
    });

    expect(baseline.evaluation.selectedOptionKey).toBe("stay-quiet");
    expect(replay.evaluation).toEqual(baseline.evaluation);
    expect(withGrievance.evaluation.selectedOptionKey).toBe("talk");
    console.info("B14 part 3 random new-game decision proof", {
      seed,
      place: place.displayName,
      state: place.context.jurisdiction.parentName,
      worldId: initial.id,
      playerActor: actor,
      knower,
      withoutCause: baseline.evaluation.selectedOptionKey,
      withGrievance: withGrievance.evaluation.selectedOptionKey,
    });
  });

  it("routes the ignored-bookkeeper grievance through the shared deterministic decision", () => {
    const source = readFileSync(
      new URL("./matters.ts", import.meta.url),
      "utf8",
    );
    const body = source.match(
      /function bookkeeperGoesOutside\([\s\S]*?\n\}/,
    )?.[0];

    expect(body).toContain("evaluateMisconductKnowerDecision");
    expect(body).toContain('occasion: "wronged"');
    expect(body).not.toContain('randomness: "close-choices"');
  });
});
