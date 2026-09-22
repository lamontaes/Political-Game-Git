import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./demo";
import { recordWorldEvent } from "./world";
import { recordGoalState, createMindProvenance } from "./mind";
import {
  activeGoalFor,
  activeOrdinaryGoals,
  goalConsiderations,
  recordGoalStepTaken,
} from "./people-goal-pursuit";
import type { EntityId, World } from "./types";

/** The demo world, because it carries the mind catalog these records need. */
function bareWorld(seed: string): World {
  return createDemoWorld(seed);
}

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error("Missing test person.");
  return id;
}

/** Give this person the ordinary-life goal the test is about. */
function withGoal(
  world: World,
  subjectId: EntityId,
  goal: "connection" | "privacy" | "learning",
): World {
  const goalKey = `opening-life:${goal}`;
  // A generated person may already hold one, so this supersedes rather than
  // pretending the record is the first.
  const existing = world.history.goalStates
    .filter(
      (record) => record.personId === subjectId && record.goalKey === goalKey,
    )
    .at(-1);
  return recordGoalState(world, {
    stableKey: `pursuit-test:${subjectId}:${goal}`,
    personId: subjectId,
    goalKey,
    recordedAt: world.currentDate,
    objective: "Make time for people you know",
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", { note: "Test fixture." }),
    replacesGoalId: null,
    supersedesGoalStateId: existing?.id ?? null,
  });
}

/** An ordinary recorded event this person took part in. */
function anEvent(world: World, subjectId: EntityId): [World, EntityId] {
  const next = recordWorldEvent(world, {
    stableKey: `pursuit-test:event:${subjectId}:${world.history.nextSequence}`,
    type: "life.conversation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0] ?? null,
    involvedEntityIds: [subjectId],
    participants: [
      {
        personId: subjectId,
        role: "agency:acted",
        detail: "They made the time themselves.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.talk"],
    summary: "They made time for somebody they know.",
    context: {
      location: null,
      socialContext: "An ordinary afternoon.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const recorded = next.history.events.at(-1);
  if (!recorded) throw new Error("The event was not recorded.");
  return [next, recorded.id];
}

describe("private goals somebody actually pursues", () => {
  it("leans on a choice without deciding it", () => {
    let world = bareWorld("pursuit-leans");
    const subjectId = personId(world, 1);
    world = withGoal(world, subjectId, "connection");

    const considerations = goalConsiderations(world, subjectId, "test", [
      {
        optionKey: "get-in-touch",
        goalKey: "opening-life:connection",
        direction: "supports",
        explanation: "They have been meaning to keep up with people.",
      },
      {
        optionKey: "leave-it",
        goalKey: "opening-life:privacy",
        direction: "supports",
        explanation: "They have been keeping their own time lately.",
      },
    ]);

    // Only the goal they actually hold speaks. The other lean is silent rather
    // than opposed: not wanting privacy is not evidence of anything.
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("get-in-touch");
    expect(considerations[0]!.importance).not.toBe("decisive");
    expect(considerations[0]!.sourceRefs[0]).toEqual({
      kind: "goal-state",
      goalStateId: activeGoalFor(world, subjectId, "opening-life:connection")!
        .id,
    });
  });

  it("says nothing at all for somebody with no goal, so they decide as before", () => {
    const world = bareWorld("pursuit-no-goal");
    const subjectId = personId(world, 1);
    expect(activeOrdinaryGoals(world, subjectId)).toHaveLength(0);
    expect(
      goalConsiderations(world, subjectId, "test", [
        {
          optionKey: "get-in-touch",
          goalKey: "opening-life:connection",
          direction: "supports",
          explanation: "They have been meaning to keep up with people.",
        },
      ]),
    ).toHaveLength(0);
  });

  it("refuses a step with no event behind it", () => {
    let world = bareWorld("pursuit-no-event");
    const subjectId = personId(world, 1);
    world = withGoal(world, subjectId, "connection");
    expect(() =>
      recordGoalStepTaken(world, {
        personId: subjectId,
        goalKey: "opening-life:connection",
        eventId: "event:never-happened" as unknown as EntityId,
      }),
    ).toThrow(/event that happened/);
  });

  it("refuses a step on an event this person had no part in", () => {
    let world = bareWorld("pursuit-not-theirs");
    const subjectId = personId(world, 1);
    const strangerId = personId(world, 2);
    world = withGoal(world, subjectId, "connection");
    const [withEvent, eventId] = anEvent(world, strangerId);
    expect(() =>
      recordGoalStepTaken(withEvent, {
        personId: subjectId,
        goalKey: "opening-life:connection",
        eventId,
      }),
    ).toThrow(/took part in/);
  });

  it("records a step as the event that was it, and leaves the goal running", () => {
    let world = bareWorld("pursuit-step");
    const subjectId = personId(world, 1);
    world = withGoal(world, subjectId, "connection");
    const [withEvent, eventId] = anEvent(world, subjectId);
    const before = activeGoalFor(
      withEvent,
      subjectId,
      "opening-life:connection",
    )!;

    const stepped = recordGoalStepTaken(withEvent, {
      personId: subjectId,
      goalKey: "opening-life:connection",
      eventId,
    });
    const after = activeGoalFor(stepped, subjectId, "opening-life:connection")!;

    // One step is not finishing it: somebody who rings a friend has not
    // completed "make time for people you know".
    expect(after.status).toBe("active");
    expect(after.supersedesGoalStateId).toBe(before.id);
    expect(after.outcome).toBe("They made time for somebody they know.");
    expect(after.provenance.sourceRefs).toContainEqual({
      kind: "historical-event",
      eventId,
    });
    // The earlier record is not rewritten; the goal's history is a chain.
    expect(
      stepped.history.goalStates.filter(
        (record) => record.personId === subjectId,
      ).length,
    ).toBe(2);
  });

  it("refuses a step toward a goal that is no longer being pursued", () => {
    let world = bareWorld("pursuit-abandoned");
    const subjectId = personId(world, 1);
    world = withGoal(world, subjectId, "connection");
    const live = activeGoalFor(world, subjectId, "opening-life:connection")!;
    world = recordGoalState(world, {
      stableKey: `pursuit-test:${subjectId}:abandoned`,
      personId: subjectId,
      goalKey: live.goalKey,
      createdAt: live.createdAt,
      recordedAt: world.currentDate,
      objective: live.objective,
      domain: live.domain,
      scope: live.scope,
      priority: live.priority,
      status: "abandoned",
      targetEntityId: null,
      deadline: null,
      outcome: "They stopped trying.",
      provenance: createMindProvenance("reflection", {
        note: "Test fixture.",
      }),
      replacesGoalId: null,
      supersedesGoalStateId: live.id,
    });
    const [withEvent, eventId] = anEvent(world, subjectId);

    expect(activeGoalFor(withEvent, subjectId, "opening-life:connection")).toBe(
      null,
    );
    expect(
      goalConsiderations(withEvent, subjectId, "test", [
        {
          optionKey: "get-in-touch",
          goalKey: "opening-life:connection",
          direction: "supports",
          explanation: "They have been meaning to keep up with people.",
        },
      ]),
    ).toHaveLength(0);
    expect(() =>
      recordGoalStepTaken(withEvent, {
        personId: subjectId,
        goalKey: "opening-life:connection",
        eventId,
      }),
    ).toThrow(/active goal/);
  });

  it("keeps a private goal off every surface it could leak onto", () => {
    let world = bareWorld("pursuit-private");
    const subjectId = personId(world, 1);
    world = withGoal(world, subjectId, "connection");
    // The goal lives in history, where the player has no reader, and nothing is
    // written onto the person. A player learns an agenda from behaviour.
    expect(world.people[subjectId]).not.toHaveProperty("goal");
    expect(JSON.stringify(world.people[subjectId])).not.toMatch(
      /opening-life|objective/i,
    );
  });
});
