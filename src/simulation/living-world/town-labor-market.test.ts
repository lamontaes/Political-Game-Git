import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";

import { makeIsoDate } from "../dates";
import type { EntityId, World } from "../types";
import { outOfWorkSince } from "./town-labor-market";
import {
  decideTownWorkerQuit,
  reviewTownJobs,
  TOWN_JOB_END_REASONS,
} from "./town-labor-market";
import { createWorkRelationship } from "../life";
import { createMindProvenance, recordGoalState } from "../mind";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { workStatusHistory } from "../life-queries";

const NEWCOMER = "person_newcomer" as EntityId;
const LAID_OFF = "person_laid_off" as EntityId;
const GROWN_UP_HERE = "person_grown_up_here" as EntityId;

/*
 * Employers call back the seekers out of work the shortest time first. A
 * newcomer with no job on the town's record has been out of work since
 * moving in, not forever, so they are not stuck behind every local who is
 * laid off after them.
 */
function world(): World {
  return {
    currentDate: makeIsoDate("2027-06-01"),
    people: {
      [NEWCOMER]: { id: NEWCOMER, birthDate: makeIsoDate("1990-01-01") },
      [LAID_OFF]: { id: LAID_OFF, birthDate: makeIsoDate("1990-01-01") },
      [GROWN_UP_HERE]: {
        id: GROWN_UP_HERE,
        birthDate: makeIsoDate("2008-03-10"),
      },
    },
    history: {
      workRelationships: [{ id: "work_1", personId: LAID_OFF }],
      workStatuses: [
        {
          workRelationshipId: "work_1",
          status: "active",
          effectiveAt: makeIsoDate("2020-01-01"),
        },
        {
          workRelationshipId: "work_1",
          status: "ended",
          effectiveAt: makeIsoDate("2026-06-01"),
        },
      ],
      householdMemberships: [
        { personId: NEWCOMER, startedAt: makeIsoDate("2000-01-01") },
        { personId: NEWCOMER, startedAt: makeIsoDate("2027-04-05") },
        // A move not made yet counts for nothing.
        { personId: NEWCOMER, startedAt: makeIsoDate("2028-01-01") },
        { personId: LAID_OFF, startedAt: makeIsoDate("2027-05-01") },
        { personId: GROWN_UP_HERE, startedAt: makeIsoDate("2008-03-10") },
      ],
    },
  } as unknown as World;
}

describe("how long a town's job seekers have been out of work", () => {
  it("dates a newcomer from moving in, a laid-off worker from the layoff, and a local with no job from turning 18", () => {
    const since = outOfWorkSince(world(), [NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
    expect(since.get(NEWCOMER)).toBe("2027-04-05");
    // A job on the record wins over a later move.
    expect(since.get(LAID_OFF)).toBe("2026-06-01");
    expect(since.get(GROWN_UP_HERE)).toBe("2026-03-10");
  });

  it("puts a newcomer who arrived after a layoff ahead of the laid-off worker", () => {
    const since = outOfWorkSince(world(), [NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
    const order = [LAID_OFF, GROWN_UP_HERE, NEWCOMER].sort((a, b) =>
      (since.get(b) ?? "").localeCompare(since.get(a) ?? ""),
    );
    expect(order).toEqual([NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
  });
});

function quitFixture() {
  let next = createDemoWorld("a70-saved-worker-choice");
  const prior = next.history.workRelationships.find(
    (row) => row.compensation === "paid",
  )!;
  const role = next.history.workRoles.find(
    (row) => row.workRelationshipId === prior.id,
  )!;
  const town = next.people[prior.personId]!.homeJurisdictionId;
  next = createWorkRelationship(next, {
    stableKey: `${TOWN_EMPLOYMENT_VERSION}:${town}:job:a70-control`,
    personId: prior.personId,
    organizationId: prior.organizationId,
    startedAt: next.currentDate,
    kind: prior.kind,
    compensation: prior.compensation,
    authority: "directed",
    dependency: prior.dependency,
    economicRisk: prior.economicRisk,
    provenance: {
      kind: "authored",
      note: "A70 current-job control using an existing worker and employer.",
    },
    initialRole: {
      title: role.title,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: town,
      timeDemand: role.timeDemand,
    },
  });
  return {
    world: next,
    personId: prior.personId,
    town,
    jobId: next.history.workRelationships.at(-1)!.id,
  };
}

function goal(
  next: World,
  personId: EntityId,
  goalKey: string,
  priority: "low" | "critical",
  status: "active" | "abandoned" = "active",
) {
  return recordGoalState(next, {
    stableKey: `a70:${goalKey}:${status}`,
    personId,
    goalKey,
    recordedAt: next.currentDate,
    objective:
      goalKey === "life-paths2:decline-work"
        ? "Stop working"
        : "Keep paid work",
    domain: "life:livelihood",
    scope: "personal",
    priority,
    status,
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Saved worker intent for the A70 control.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId:
      next.history.goalStates
        .filter((row) => row.personId === personId && row.goalKey === goalKey)
        .at(-1)?.id ?? null,
  });
}

describe("a town worker's saved quit choice", () => {
  it("does not propose a quit without an active saved wish to stop working", () => {
    const fixture = quitFixture();
    expect(
      decideTownWorkerQuit(
        fixture.world,
        fixture.personId,
        fixture.jobId,
        "a70:absent",
      ),
    ).toBeNull();
    const active = goal(
      fixture.world,
      fixture.personId,
      "life-paths2:decline-work",
      "critical",
    );
    const abandoned = goal(
      active,
      fixture.personId,
      "life-paths2:decline-work",
      "critical",
      "abandoned",
    );
    expect(
      decideTownWorkerQuit(
        abandoned,
        fixture.personId,
        fixture.jobId,
        "a70:abandoned",
      ),
    ).toBeNull();
  });

  it("weighs saved priorities, including dated livelihood goals, without a quit quota", () => {
    const fixture = quitFixture();
    let next = goal(
      fixture.world,
      fixture.personId,
      "life-paths2:decline-work",
      "low",
    );
    next = goal(
      next,
      fixture.personId,
      "life-paths2:seek-work:dated",
      "critical",
    );
    const evaluation = decideTownWorkerQuit(
      next,
      fixture.personId,
      fixture.jobId,
      "a70:stay",
    )!;
    expect(evaluation.selectedOptionKey).toBe("continue-work");
    expect(evaluation.context.randomness).toBe("none");
    expect(
      evaluation.context.considerations.map((row) => row.importance),
    ).toEqual(["slight", "decisive"]);
    expect(
      evaluation.context.considerations.every(
        (row) => row.sourceRefs[0]?.kind === "goal-state",
      ),
    ).toBe(true);
  });

  it("ends the actual job and saves the worker's reason once, without immediately rehiring", () => {
    const fixture = quitFixture();
    const saved = goal(
      fixture.world,
      fixture.personId,
      "life-paths2:decline-work",
      "critical",
    );
    const next = reviewTownJobs(saved, fixture.town, null, "a70-review");
    expect(workStatusHistory(next, fixture.jobId).at(-1)?.reason).toBe(
      TOWN_JOB_END_REASONS.quit,
    );
    const trace = next.history.decisionTraces.find(
      (row) => row.context.decisionType === "labor.worker-quit",
    )!;
    expect(trace.selectedOptionKey).toBe("quit");
    expect(trace.context.considerations[0]?.explanation).toBe("Stop working");
    expect(trace.sourceSnapshots[0]?.reference.kind).toBe("goal-state");
    expect(
      next.history.workRelationships.filter(
        (row) => row.personId === fixture.personId,
      ),
    ).toEqual(
      saved.history.workRelationships.filter(
        (row) => row.personId === fixture.personId,
      ),
    );
    expect(reviewTownJobs(next, fixture.town, null, "a70-review")).toBe(next);
    const protectedWorld = reviewTownJobs(
      saved,
      fixture.town,
      fixture.personId,
      "a70-player",
    );
    expect(
      workStatusHistory(protectedWorld, fixture.jobId).at(-1)?.status,
    ).toBe("active");
  });
});
