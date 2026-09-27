import { describe, expect, it } from "vitest";

import { createWorkRelationship, recordWorkStatus } from "../simulation/life";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  workStatusAt,
} from "../simulation/life-queries";
import { applicationsFor, jobOpening } from "../simulation/job-market";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  LIVELIHOOD_GOAL_KEY,
} from "../simulation/people-goal-pursuit-content";
import { goalBlockerOf } from "../simulation/people-goal-pursuit";
import {
  ensurePeopleGoalReview,
  pursuitCandidates,
} from "../simulation/people-goal-review";
import { recordRelationshipInteraction } from "../simulation/records";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, GoalStateRecord, World } from "../simulation";
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
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
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
      relationship.kind === "employment:local-business" &&
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
    const start = life("goal-life-b");
    const caller = pursuitCandidates(start.world).find((id) =>
      start.world.history.goalStates.some(
        (record) =>
          record.personId === id &&
          record.goalKey === CONNECTION_GOAL_KEY &&
          record.status === "active",
      ),
    )!;
    const friend = residentWithJob(start.world, start.playerId);
    // A real tie between them, as the world would record one.
    let world = recordRelationshipInteraction(start.world, {
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
      (relationship) => relationship.kind === "employment:local-business",
    )!;
    // The housemate held a job, and it ended.
    let world = createWorkRelationship(start.world, {
      stableKey: "test:housemate-job",
      personId: housemate,
      organizationId: employer.organizationId,
      startedAt: start.world.currentDate,
      initialStatus: "active",
      kind: "employment:local-business",
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
