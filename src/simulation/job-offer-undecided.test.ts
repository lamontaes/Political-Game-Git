import { beforeAll, describe, expect, it, vi } from "vitest";
import * as decisionEngine from "./decisions";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { activeWorkRelationshipsAt } from "./life-queries";
import { recordWorkStatus } from "./life";
import { createMindProvenance, recordGoalState } from "./mind";
import {
  advanceApplications,
  applicationsFor,
  applicationSteps,
  applyForJobAsResident,
  latestApplicationStep,
  openJobListings,
  openWeeklyListings,
  residentApplicationBlocked,
} from "./job-market";
import {
  LIVELIHOOD_GOAL_DOMAIN,
  LIVELIHOOD_GOAL_KEY,
} from "./people-goal-pursuit-content";
import { reviewPeopleGoals } from "./people-goal-review";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

let offered: World;
let worker: EntityId;
let applicationId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "c8-job-offer-undecided",
      startAge: 34,
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  worker = world.history.workRelationships.find(
    (work) =>
      work.personId !== game.playerPersonId &&
      work.kind === "employment:local-business" &&
      activeWorkRelationshipsAt(world, work.personId).some(
        (entry) => entry.relationship.id === work.id,
      ),
  )!.personId;
  for (const { relationship, status } of activeWorkRelationshipsAt(
    world,
    worker,
  )) {
    world = recordWorkStatus(world, {
      stableKey: `c8:leave:${relationship.id}`,
      workRelationshipId: relationship.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Test job search.",
      provenance: { kind: "authored", note: "Test circumstance." },
      supersedesStatusId: status.id,
    });
  }
  world = recordGoalState(world, {
    stableKey: "c8:seek-work",
    personId: worker,
    goalKey: LIVELIHOOD_GOAL_KEY,
    recordedAt: world.currentDate,
    objective: "Find paid work",
    domain: LIVELIHOOD_GOAL_DOMAIN,
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
    supersedesGoalStateId: null,
  });
  world = openWeeklyListings(world, game.playerPersonId);
  const opening = openJobListings(world, worker).find(
    (row) => residentApplicationBlocked(world, worker, row.id) === null,
  )!;
  expect(opening).toBeDefined();
  const applied = applyForJobAsResident(world, worker, opening.id);
  expect(applied.ok).toBe(true);
  const application = applicationsFor(applied.world, worker).at(-1)!;
  applicationId = application.id;
  offered = advanceApplications(
    { ...applied.world, currentDate: application.decisionAt },
    worker,
  );
  expect(latestApplicationStep(offered, applicationId)?.kind).toBe("offered");
}, 30_000);

describe("job offer without a selected answer", () => {
  it.each(["no-available-option", "selected", "undecided"] as const)(
    "leaves the offer unanswered through review, reload and repeat (%s)",
    (outcomeKind) => {
      const evaluate = decisionEngine.evaluateDecision;
      let calls = 0;
      const spy = vi
        .spyOn(decisionEngine, "evaluateDecision")
        .mockImplementation((world, context) => {
          const result = evaluate(world, context);
          if (
            context.decisionType !== "people.job-offer-answer" ||
            context.actorPersonId !== worker
          )
            return result;
          calls++;
          return { ...result, outcomeKind, selectedOptionKey: null };
        });
      try {
        const before = applicationSteps(offered, applicationId);
        for (const world of [
          offered,
          deserializeWorld(serializeWorld(offered)),
        ]) {
          const reviewed = reviewPeopleGoals(world);
          const repeated = reviewPeopleGoals(reviewed.world);
          for (const result of [reviewed, repeated]) {
            expect(applicationSteps(result.world, applicationId)).toEqual(
              before,
            );
            expect(
              latestApplicationStep(result.world, applicationId)?.kind,
            ).toBe("offered");
            expect(result.nextReviewAt > world.currentDate).toBe(true);
            expect(
              result.world.history.goalStates.filter(
                (goal) =>
                  goal.personId === worker &&
                  goal.stableKey.startsWith("goal-step:"),
              ),
            ).toEqual(
              world.history.goalStates.filter(
                (goal) =>
                  goal.personId === worker &&
                  goal.stableKey.startsWith("goal-step:"),
              ),
            );
          }
        }
        expect(calls).toBe(4);
      } finally {
        spy.mockRestore();
      }
    },
  );
});
