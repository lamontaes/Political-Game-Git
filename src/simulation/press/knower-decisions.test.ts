import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { makeIsoDate } from "../dates";
import { searchLifePlaces } from "../life-places";
import { recordTraitChange } from "../people-traits";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
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
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-OR",
      scope: "locality",
    })[0]!;
    const initial = createScenarioWorld(
      "b14-knower-grievance-decision",
      {
        jurisdiction: place.context.jurisdiction,
        initialMoment: {
          date: makeIsoDate("2026-09-14"),
          minuteOfDay: 540,
          timeZone: "America/Los_Angeles",
          utcOffsetMinutes: -420,
        },
        creationSummary: "Generated fixture for knower decisions.",
        goalScope: "Generated fixture",
        householdLocationLabel: "A generated household",
      },
      { peopleCount: 6 },
    );
    const knower = initial.personOrder.find(
      (id) =>
        initial.control.kind !== "person" || id !== initial.control.personId,
    )!;
    const actor = initial.personOrder.find((id) => id !== knower)!;
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
  });
});
