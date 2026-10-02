import { smallWorld } from "../../tests/fixtures/small-world";
import * as callDecisions from "../simulation/decisions";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { createMindProvenance, recordGoalState } from "../simulation/mind";
import { describe, expect, it, vi } from "vitest";

import { createWorkRelationship, recordWorkStatus } from "../simulation/life";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  workStatusAt,
} from "../simulation/life-queries";
import {
  applicationsFor,
  jobOpening,
  openWeeklyListings,
  townEmployerRoles,
} from "../simulation/job-market";
import { seatLocalBusinesses } from "../simulation/local-economy";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  LIVELIHOOD_GOAL_KEY,
} from "../simulation/people-goal-pursuit-content";
import { goalBlockerOf } from "../simulation/people-goal-pursuit";
import {
  ensurePeopleGoalReview,
  reviewPeopleGoals,
  pursuitCandidates,
} from "../simulation/people-goal-review";
import { recordRelationshipInteraction } from "../simulation/records";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type {
  EntityId,
  GoalStateRecord,
  World,
  DecisionOutcomeKind,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
  projectOrdinaryDay,
} from "./ordinary-life";
import { projectWorld39Journal } from "./world39-journal";

/**
 * People pursue their own goals while the player looks elsewhere.
 *
 * One real life, walked forward on the ordinary clock with nobody opening a
 * screen. Every assertion is about the canonical history the clock wrote:
 * which openings were applied to, who was called, what was blocked and why.
 */
function life(seed = "goal-pursuit-life") {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "kentucky",
    household: "shares-a-home",
  });
  const personId = game.playerPersonId;
  const local = seatLocalBusinesses(
    game.world,
    game.world.people[personId]!.homeJurisdictionId,
  );
  const world = openWeeklyListings(openOrdinaryLife(local, personId), personId);
  expect(
    townEmployerRoles(world, personId).length,
    "Recorded town employers expose actual roles",
  ).toBeGreaterThan(0);
  expect(
    world.history.jobOpenings?.length,
    "Actual market producer lists roles before pursuit",
  ).toBeGreaterThan(0);
  return { world, playerId: personId };
}

function goalsOf(world: World, personId: EntityId, from = 0) {
  return world.history.goalStates
    .slice(from)
    .filter((record) => record.personId === personId);
}

/** Ends a resident's paid job, the circumstance a search grows out of. */
function loseJob(world: World, personId: EntityId, reason: string): World {
  const work = world.history.workRelationships.find(
    (relationship) =>
      relationship.personId === personId &&
      relationship.compensation === "paid" &&
      workStatusAt(world, relationship.id)?.status === "active",
  )!;
  return recordWorkStatus(world, {
    stableKey: `test:lost-job:${personId}`,
    workRelationshipId: work.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason,
    provenance: { kind: "authored", note: "Test circumstance." },
    supersedesStatusId: workStatusAt(world, work.id)!.id,
  });
}

function residentWithJob(world: World, playerId: EntityId): EntityId {
  return world.history.workRelationships.find(
    (relationship) =>
      relationship.personId !== playerId &&
      relationship.compensation === "paid" &&
      relationship.kind.startsWith("employment:") &&
      relationship.organizationId !== null &&
      workStatusAt(world, relationship.id)?.status === "active",
  )!.personId;
}

/** A goal state written by the review is one of four things, never a meter. */
function kindOf(record: GoalStateRecord): string {
  if (record.stableKey.startsWith("goal-step:")) return "step";
  if (goalBlockerOf(record)) return "blocked";
  if (record.status !== "active") return "settled";
  return "formed";
}

describe("generated people pursue their own goals", () => {
  it("two adults left alone for twelve weeks act, stay blocked, or set a goal aside, each for a recorded reason", () => {
    const start = life();
    const worker = residentWithJob(start.world, start.playerId);
    let world = loseJob(
      start.world,
      worker,
      "The shop cut back to family staff.",
    );
    const learner = pursuitCandidates(world).find((id) =>
      world.history.goalStates.some(
        (record) =>
          record.personId === id &&
          record.goalKey === LEARNING_GOAL_KEY &&
          record.status === "active",
      ),
    )!;
    expect(learner).toBeDefined();
    const before = world.history.goalStates.length;
    world = passOrdinaryDays(world, 12 * 7);
    const twelveWeeks = world;
    world = passOrdinaryDays(world, 2 * 7);

    // The worker: a search that grew out of the job ending, cited to it.
    const search = goalsOf(world, worker, before);
    expect(search[0]).toMatchObject({
      goalKey: LIVELIHOOD_GOAL_KEY,
      status: "active",
    });
    expect(search[0]!.provenance.sourceRefs[0]).toMatchObject({
      kind: "life-history",
      reference: { family: "work-status" },
    });
    // Every application is to an opening the market actually listed, and
    // that was taking applications on the day it was sent.
    const applications = applicationsFor(world, worker);

    expect(applications.length).toBeGreaterThan(0);
    for (const application of applications) {
      const opening = jobOpening(world, application.openingId)!;
      expect(opening).not.toBeNull();
      expect(application.submittedAt >= opening.opensAt).toBe(true);
      expect(application.submittedAt <= opening.closesAt).toBe(true);
    }
    // No more than one step on any one day for the same person.
    const stepDays = search
      .filter((record) => kindOf(record) === "step")
      .map((record) => record.recordedAt);
    expect(new Set(stepDays).size).toBe(stepDays.length);
    const last = search.at(-1)!;
    expect(
      last.status === "completed" ||
        goalBlockerOf(last) !== null ||
        kindOf(last) === "step",
    ).toBe(true);

    // The learner: no route to learn, recorded once as a fact. At twelve weeks
    // it is still blocked for that reason; two weeks on it has been set aside
    // with its reason. The goal's earlier states are all still there.
    const atTwelve = goalsOf(twelveWeeks, learner, before)
      .filter((record) => record.goalKey === LEARNING_GOAL_KEY)
      .at(-1)!;
    expect(goalBlockerOf(atTwelve)).toBe("no-route-to-learn");
    const learning = goalsOf(world, learner, before).filter(
      (record) => record.goalKey === LEARNING_GOAL_KEY,
    );
    const blockers = learning.filter((record) => goalBlockerOf(record));
    expect(blockers).toHaveLength(1);
    expect(blockers[0]!.outcome).toBe(
      "Blocked: No class is open to them, and nobody they know teaches.",
    );
    const settled = learning.at(-1)!;
    expect(["abandoned", "superseded"]).toContain(settled.status);
    expect(settled.outcome).toMatch(/^Set it aside:/);

    // Nobody else's goals moved without a reason either.
    for (const record of world.history.goalStates.slice(before)) {
      if (
        record.goalKey.startsWith("opening-life:") &&
        kindOf(record) === "formed"
      )
        continue;
      expect(["step", "blocked", "settled", "formed"]).toContain(
        kindOf(record),
      );
      if (kindOf(record) !== "formed") expect(record.outcome).toBeTruthy();
    }
  }, 120_000);

  it("somebody keeping up with people calls a person they actually know", () => {
    // This case declares one intention and one known friend, rather than
    // assuming a generated opening life has only this connection.
    const fixture = smallWorld({
      place: "kentucky",
      people: 3,
      seed: "goal-life-b",
    });
    const start = { world: fixture.world, playerId: fixture.personId };
    const candidates = pursuitCandidates(start.world);
    expect(candidates).toHaveLength(2);
    const caller = candidates[0]!;
    expect(caller).toBeDefined();
    const existing = start.world.history.goalStates
      .filter(
        (row) => row.personId === caller && row.goalKey === CONNECTION_GOAL_KEY,
      )
      .at(-1);
    const intended = recordGoalState(start.world, {
      stableKey: `test:connection-intention:${caller}`,
      personId: caller,
      goalKey: CONNECTION_GOAL_KEY,
      recordedAt: start.world.currentDate,
      objective: "Make time for people you know",
      domain: "life:ordinary",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: createMindProvenance("authored", {
        note: "Test circumstance: this resident means to keep up with people.",
      }),
      replacesGoalId: null,
      supersedesGoalStateId: existing?.id ?? null,
    });
    expect(
      intended.history.goalStates.filter(
        (row) => row.goalKey === CONNECTION_GOAL_KEY && row.status === "active",
      ),
    ).toHaveLength(1);
    const friend = candidates[1]!;
    expect(friend).toBeDefined();
    expect(start.world.history.relationshipInteractions).toHaveLength(0);
    expect(start.world.history.kinshipRelationships).toHaveLength(0);
    expect(start.world.history.workRelationships).toHaveLength(0);
    expect(start.world.history.householdMemberships).toHaveLength(0);
    // A real tie between them, as the world would record one.
    let world = recordRelationshipInteraction(intended, {
      stableKey: "test:old-friends",
      personIds: [caller, friend],
      eventId: null,
      occurredAt: start.world.currentDate,
      kind: "experience:shared-school",
      change: "strengthened",
      significance: "meaningful",
      summary: "They went to school together.",
      tags: [],
    });
    world = passOrdinaryDays(world, 10 * 7);
    const calls = world.history.events.filter(
      (event) =>
        event.type.startsWith("life.goal-call") &&
        event.involvedEntityIds.includes(caller),
    );
    const steps = goalsOf(world, caller).filter(
      (record) =>
        record.goalKey === CONNECTION_GOAL_KEY && kindOf(record) === "step",
    );
    // Either they called, each call a step cited to the call itself...
    if (calls.length > 0) {
      expect(steps.length).toBe(calls.length);
      for (const step of steps) {
        expect(
          calls.some((call) =>
            step.provenance.sourceRefs.some(
              (ref) =>
                ref.kind === "historical-event" && ref.eventId === call.id,
            ),
          ),
        ).toBe(true);
      }
      expect(
        calls.every((call) => call.involvedEntityIds.includes(friend)),
      ).toBe(true);
    } else {
      // ...or they decided against it each week, which writes nothing: a
      // quiet stretch is a valid answer, and no blocker is invented for it.
      expect(steps).toHaveLength(0);
    }
    // The call never reaches the player, who hears from people themselves.
    expect(
      calls.some((call) => call.involvedEntityIds.includes(start.playerId)),
    ).toBe(false);
  }, 120_000);

  it("reopening screens writes nothing, and the review is scheduled once", () => {
    const start = life();
    let world = passOrdinaryDays(start.world, 3 * 7);
    expect(ensurePeopleGoalReview(world)).toBe(world);
    const goals = world.history.goalStates.length;
    const events = world.history.events.length;
    for (let i = 0; i < 3; i += 1) {
      projectOrdinaryDay(world, start.playerId);
      projectWorld39Journal(world, start.playerId);
    }
    expect(world.history.goalStates.length).toBe(goals);
    expect(world.history.events.length).toBe(events);
    const reviews = world.history.futureDueItems.filter(
      (item) => item.transitionKey === "people:goal-review",
    );
    // One per week that passed, and the next one pending: never two per day.
    expect(new Set(reviews.map((item) => item.dueAt)).size).toBe(
      reviews.length,
    );
    world = passOrdinaryDays(world, 1);
    expect(world.history.goalStates.length).toBeGreaterThanOrEqual(goals);
  }, 120_000);

  it("save and reload keep goals, steps, blockers and replacements, and the future is the same", () => {
    const start = life();
    const worker = residentWithJob(start.world, start.playerId);
    let world = loseJob(
      start.world,
      worker,
      "The shop closed early for winter.",
    );
    world = passOrdinaryDays(world, 14 * 7);
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(reloaded.history.goalStates).toEqual(world.history.goalStates);
    expect(reloaded.history.jobApplications).toEqual(
      world.history.jobApplications,
    );
    const replacements = reloaded.history.goalStates.filter(
      (record) => record.replacesGoalId !== null,
    );
    const settled = reloaded.history.goalStates.filter(
      (record) =>
        record.status === "superseded" || record.status === "abandoned",
    );
    expect(settled.length).toBeGreaterThan(0);
    for (const replacement of replacements) {
      expect(
        reloaded.history.goalStates.some(
          (record) =>
            record.goalId === replacement.replacesGoalId &&
            record.status === "superseded",
        ),
      ).toBe(true);
    }
    // Carrying on from the reloaded save writes exactly what carrying on
    // without saving would have.
    const onward = passOrdinaryDays(world, 14);
    const onwardFromSave = passOrdinaryDays(reloaded, 14);
    expect(
      onwardFromSave.history.goalStates.map((record) => record.stableKey),
    ).toEqual(onward.history.goalStates.map((record) => record.stableKey));
  }, 180_000);

  it("the player learns a housemate is looking for work from what they said, never from a card", () => {
    const start = life();
    const cutoff = currentLifeCutoff(start.world);
    const homes = new Set(
      householdMembershipsAt(start.world, start.playerId, cutoff).map(
        (entry) => entry.household.id,
      ),
    );
    const housemate = start.world.history.householdMemberships.find(
      (record) =>
        homes.has(record.householdId) &&
        record.personId !== start.playerId &&
        pursuitCandidates(start.world).includes(record.personId),
    )!.personId;
    const employer = start.world.history.workRelationships.find(
      (relationship) =>
        relationship.kind.startsWith("employment:") &&
        relationship.compensation === "paid" &&
        workStatusAt(start.world, relationship.id)?.status === "active",
    )!;
    // The housemate held a job, and it ended.
    let world = createWorkRelationship(start.world, {
      stableKey: "test:housemate-job",
      personId: housemate,
      organizationId: employer.organizationId,
      startedAt: start.world.currentDate,
      initialStatus: "active",
      kind: employer.kind,
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Test circumstance." },
      initialRole: {
        title: "Stock clerk",
        occupationClassification: null,
        locationJurisdictionId:
          start.world.people[housemate]!.homeJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 20 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    world = loseJob(world, housemate, "The store let go of its evening staff.");
    world = passOrdinaryDays(world, 4 * 7);
    const told = world.history.knowledge.filter(
      (record) =>
        record.personId === start.playerId &&
        record.source.kind === "told-by" &&
        record.source.sourcePersonId === housemate,
    );

    expect(told.length).toBeGreaterThan(0);
    expect(told[0]!.believedSummary).toMatch(
      /said they applied to .+ opening\.$/,
    );
    // The journal carries what was said; the goal itself appears nowhere.
    const journal = projectWorld39Journal(world, start.playerId)
      .entries.map((entry) => entry.text)
      .join("\n");
    expect(journal).toMatch(/applied to/);
    expect(journal).not.toMatch(/Find paid work/);
  }, 120_000);
});

// Append after the existing describe block; preserve all original cases/helpers.
const CALL_BOUNDARY_SEED = "a125-call-answer-boundary-20261001";
const [callBoundaryPlace] = pickDistinct(
  new SeededRng(CALL_BOUNDARY_SEED),
  lifePlaceStateIdentities(),
  1,
);
const evaluateCallBoundary = callDecisions.evaluateDecision;

function callBoundaryFixture() {
  let world = smallWorld({
    place: callBoundaryPlace!.jurisdictionKey,
    people: 8,
    seed: CALL_BOUNDARY_SEED,
  }).world;
  const [caller, friend] = pursuitCandidates(world);
  expect(caller).toBeDefined();
  expect(friend).toBeDefined();
  world = recordRelationshipInteraction(world, {
    stableKey: "a125:call:existing-friends",
    personIds: [caller!, friend!],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "experience:shared-school",
    change: "strengthened",
    significance: "meaningful",
    summary: "They went to school together.",
    tags: [],
  });
  // Initialize the review's ordinary personality/tie writers without a call.
  const prime = vi
    .spyOn(callDecisions, "evaluateDecision")
    .mockImplementation(
      (w: World, context: Parameters<typeof evaluateCallBoundary>[1]) => {
        const actual = evaluateCallBoundary(w, context);
        return context.decisionType === "people.goal-step"
          ? {
              ...actual,
              outcomeKind: "selected",
              selectedOptionKey: "not-this-week",
            }
          : actual;
      },
    );
  try {
    world = reviewPeopleGoals(world).world;
  } finally {
    prime.mockRestore();
  }
  const existing = world.history.goalStates
    .filter(
      (row) => row.personId === caller && row.goalKey === CONNECTION_GOAL_KEY,
    )
    .at(-1);
  world = recordGoalState(world, {
    stableKey: "a125:call:connection-goal",
    personId: caller!,
    goalKey: CONNECTION_GOAL_KEY,
    recordedAt: world.currentDate,
    objective: "Make time for people you know",
    domain: "life:ordinary",
    scope: "personal",
    priority: "high",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Test circumstance.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: existing?.id ?? null,
  });
  return { world, caller: caller! };
}

function callBoundaryCalls(world: World, caller: EntityId) {
  return world.history.events.filter(
    (event) =>
      event.type.startsWith("life.goal-call") &&
      event.participants.some(
        (p) => p.personId === caller && p.role === "agency:participant",
      ),
  );
}
function callBoundarySteps(world: World, caller: EntityId) {
  return goalsOf(world, caller).filter(
    (g) => g.goalKey === CONNECTION_GOAL_KEY && kindOf(g) === "step",
  );
}

function forceCallBoundary(
  caller: EntityId,
  outcomeKind: DecisionOutcomeKind,
  selectedOptionKey: string | null,
) {
  let answers = 0;
  const spy = vi
    .spyOn(callDecisions, "evaluateDecision")
    .mockImplementation(
      (world: World, context: Parameters<typeof evaluateCallBoundary>[1]) => {
        const actual = evaluateCallBoundary(world, context);
        if (context.decisionType === "people.goal-step")
          return {
            ...actual,
            outcomeKind: "selected",
            selectedOptionKey:
              context.actorPersonId === caller &&
              context.subject.key === CONNECTION_GOAL_KEY
                ? "act"
                : "not-this-week",
          };
        if (context.decisionType !== "people.call-answer") return actual;
        answers++;
        return { ...actual, outcomeKind, selectedOptionKey };
      },
    );
  return { spy, answers: () => answers };
}

describe("a goal call requires the called person's selected answer", () => {
  it.each([
    ["undecided", null],
    ["no-available-option", null],
    ["selected", null],
    ["undecided", "talk"],
    ["undecided", "not-now"],
    ["no-available-option", "talk"],
    ["no-available-option", "not-now"],
  ] as const)(
    "keeps %s / %s waiting through Continue and repeat",
    (outcomeKind: DecisionOutcomeKind, optionKey: string | null) => {
      const { world, caller } = callBoundaryFixture();
      const forced = forceCallBoundary(caller, outcomeKind, optionKey);
      try {
        for (const start of [world, deserializeWorld(serializeWorld(world))]) {
          const reviewed = reviewPeopleGoals(start);
          const continued = deserializeWorld(serializeWorld(reviewed.world));
          const repeated = reviewPeopleGoals(continued);
          for (const result of [reviewed, repeated]) {
            expect(callBoundaryCalls(result.world, caller)).toEqual(
              callBoundaryCalls(start, caller),
            );
            expect(callBoundarySteps(result.world, caller)).toEqual(
              callBoundarySteps(start, caller),
            );
            expect(result.world.history.relationshipInteractions).toEqual(
              start.history.relationshipInteractions,
            );
            expect(result.world.history.knowledge).toEqual(
              start.history.knowledge,
            );
            expect(result.nextReviewAt > start.currentDate).toBe(true);
          }
        }
        // A vacuous no-route fixture cannot satisfy the boundary test.
        expect(forced.answers()).toBeGreaterThanOrEqual(4);
      } finally {
        forced.spy.mockRestore();
      }
    },
  );

  it.each(["talk", "not-now"] as const)(
    "preserves the actual selected %s writers after Continue",
    (optionKey: string) => {
      const { world, caller } = callBoundaryFixture();
      const forced = forceCallBoundary(caller, "selected", optionKey);
      try {
        const direct = reviewPeopleGoals(world).world;
        const fromSave = reviewPeopleGoals(
          deserializeWorld(serializeWorld(world)),
        ).world;
        expect(fromSave.history).toEqual(direct.history);
        const calls = callBoundaryCalls(direct, caller).slice(
          callBoundaryCalls(world, caller).length,
        );
        expect(calls).toHaveLength(1);
        expect(calls[0]!.type).toBe(
          optionKey === "talk" ? "life.goal-call" : "life.goal-call-declined",
        );
        const steps = callBoundarySteps(direct, caller).slice(
          callBoundarySteps(world, caller).length,
        );
        expect(steps).toHaveLength(1);
        expect(steps[0]!.provenance.sourceRefs).toContainEqual({
          kind: "historical-event",
          eventId: calls[0]!.id,
        });
        const interactions = direct.history.relationshipInteractions.slice(
          world.history.relationshipInteractions.length,
        );
        if (optionKey === "talk") {
          expect(
            interactions.some(
              (row) =>
                row.eventId === calls[0]!.id && row.personIds.includes(caller),
            ),
          ).toBe(true);
        } else {
          expect(interactions).toHaveLength(0);
          expect(calls[0]!.summary).toContain("said it was not a good time");
        }
        const continued = deserializeWorld(serializeWorld(direct));
        const repeated = reviewPeopleGoals(continued).world;
        expect(callBoundaryCalls(repeated, caller)).toEqual(
          callBoundaryCalls(direct, caller),
        );
        expect(callBoundarySteps(repeated, caller)).toEqual(
          callBoundarySteps(direct, caller),
        );
        expect(forced.answers()).toBe(2);
      } finally {
        forced.spy.mockRestore();
      }
    },
  );
});

describe("a goal step requires the caller's selected decision", () => {
  it.each([
    ["undecided", null],
    ["no-available-option", null],
    ["selected", null],
    ["undecided", "act"],
    ["no-available-option", "act"],
  ] as const)(
    "keeps %s / %s waiting without placing a call",
    (outcomeKind: DecisionOutcomeKind, optionKey: string | null) => {
      const { world, caller } = callBoundaryFixture();
      let steps = 0;
      let answers = 0;
      const spy = vi
        .spyOn(callDecisions, "evaluateDecision")
        .mockImplementation(
          (w: World, context: Parameters<typeof evaluateCallBoundary>[1]) => {
            const actual = evaluateCallBoundary(w, context);
            if (context.decisionType === "people.goal-step") {
              if (
                context.actorPersonId === caller &&
                context.subject.key === CONNECTION_GOAL_KEY
              ) {
                steps++;
                return { ...actual, outcomeKind, selectedOptionKey: optionKey };
              }
              return {
                ...actual,
                outcomeKind: "selected",
                selectedOptionKey: "not-this-week",
              };
            }
            if (context.decisionType === "people.call-answer") answers++;
            return {
              ...actual,
              outcomeKind: "selected",
              selectedOptionKey: "talk",
            };
          },
        );
      try {
        for (const start of [world, deserializeWorld(serializeWorld(world))]) {
          const reviewed = reviewPeopleGoals(start);
          const repeated = reviewPeopleGoals(
            deserializeWorld(serializeWorld(reviewed.world)),
          );
          for (const result of [reviewed, repeated]) {
            expect(callBoundaryCalls(result.world, caller)).toEqual(
              callBoundaryCalls(start, caller),
            );
            expect(callBoundarySteps(result.world, caller)).toEqual(
              callBoundarySteps(start, caller),
            );
            expect(result.world.history.relationshipInteractions).toEqual(
              start.history.relationshipInteractions,
            );
            expect(result.world.history.knowledge).toEqual(
              start.history.knowledge,
            );
            expect(result.nextReviewAt > start.currentDate).toBe(true);
          }
        }
        expect(steps).toBeGreaterThanOrEqual(4);
        expect(answers).toBe(0);
      } finally {
        spy.mockRestore();
      }
    },
  );
});
