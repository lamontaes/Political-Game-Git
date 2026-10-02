import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { seatLocalBusinesses } from "../local-economy";
import { openWeeklyListings, applicationsFor, jobOpening } from "../job-market";
import { reviewPeopleGoals } from "../people-goal-review";
import { workStatusAt, activeEducationEnrollmentsAt } from "../life-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";

import { makeIsoDate, ageOnDate } from "../dates";
import type { EntityId, World } from "../types";
import { outOfWorkSince } from "./town-labor-market";
import {
  decideTownWorkerQuit,
  decideTownEmployerLayoff,
  activeTownJobs,
  reviewTownJobs,
  TOWN_JOB_END_REASONS,
} from "./town-labor-market";
import { createWorkRelationship, recordWorkStatus } from "../life";
import { createMindProvenance, recordGoalState } from "../mind";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { workStatusHistory } from "../life-queries";
import {
  money,
  createWorkCompensation,
  recordResourceTransferOutcome,
} from "../resources";

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

describe("A70 hiring through the saved application route", () => {
  it("quarterly review does not manufacture hires and the existing goal review submits to an actual opening", () => {
    const place = drawRandomPlace("a70-recorded-application-route");
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "a70-recorded-application-route",
      placeKey: place.key,
      startKind: "custom",
      startAge: 30,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    let next = seatLocalBusinesses(
      game.world,
      game.world.people[game.playerPersonId]!.homeJurisdictionId,
    );
    next = openWeeklyListings(next, game.playerPersonId);
    const prior = next.history.workRelationships.find(
      (row) =>
        row.personId !== game.playerPersonId &&
        row.compensation === "paid" &&
        row.organizationId !== null &&
        next.people[row.personId]!.homeJurisdictionId ===
          next.people[game.playerPersonId]!.homeJurisdictionId &&
        ageOnDate(next.people[row.personId]!.birthDate, next.currentDate) >=
          18 &&
        ageOnDate(next.people[row.personId]!.birthDate, next.currentDate) <=
          67 &&
        activeEducationEnrollmentsAt(next, row.personId).length === 0 &&
        next.history.workRelationships.filter(
          (other) =>
            other.personId === row.personId &&
            other.compensation === "paid" &&
            workStatusAt(next, other.id)?.status === "active",
        ).length === 1 &&
        workStatusAt(next, row.id)?.status === "active",
    )!;
    expect(prior).toBeDefined();
    const town = next.people[prior.personId]!.homeJurisdictionId;
    next = recordWorkStatus(next, {
      stableKey: `a70:actual-job-ended:${prior.id}`,
      workRelationshipId: prior.id,
      effectiveAt: next.currentDate,
      status: "ended",
      reason:
        "Test-only recorded job loss for the application-route regression.",
      supersedesStatusId: workStatusAt(next, prior.id)!.id,
      provenance: {
        kind: "authored",
        note: "Controlled test circumstance; existing worker and employer.",
      },
    });
    const before = next.history.workRelationships;
    const quarterly = reviewTownJobs(
      next,
      town,
      game.playerPersonId,
      "a70-no-callback",
    );
    expect(quarterly.history.workRelationships).toEqual(before);
    expect(applicationsFor(quarterly, prior.personId)).toHaveLength(0);
    const reviewed = reviewPeopleGoals(quarterly).world;
    const applications = applicationsFor(reviewed, prior.personId);
    expect(
      applications.length,
      JSON.stringify(
        reviewed.history.goalStates
          .filter((row) => row.personId === prior.personId)
          .map((row) => ({
            goalKey: row.goalKey,
            status: row.status,
            outcome: row.outcome,
          })),
      ),
    ).toBeGreaterThan(0);
    for (const application of applications) {
      const opening = jobOpening(reviewed, application.openingId)!;
      expect(opening).not.toBeNull();
      expect(application.submittedAt >= opening.opensAt).toBe(true);
      expect(application.submittedAt <= opening.closesAt).toBe(true);
    }
    const saved = serializeWorld(reviewed);
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  });
});

function employerFixture(twoWorkers = false, knownMoney = true) {
  const base = quitFixture();
  let next = base.world;
  const worker = next.history.workRelationships.find(
    (row) => row.id === base.jobId,
  )!;
  const role = next.history.workRoles.find(
    (row) => row.workRelationshipId === worker.id,
  )!;
  const actor = next.personOrder.find(
    (id) =>
      id !== base.personId && next.people[id]!.homeJurisdictionId === base.town,
  )!;
  next = createWorkRelationship(next, {
    stableKey: "a70:explicit-employer-manager",
    personId: actor,
    organizationId: worker.organizationId,
    startedAt: next.currentDate,
    kind: worker.kind,
    compensation: "paid",
    authority: "directs-others",
    dependency: worker.dependency,
    economicRisk: worker.economicRisk,
    provenance: {
      kind: "authored",
      note: "Controlled actual organization manager.",
    },
    initialRole: {
      title: role.title,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: base.town,
      timeDemand: role.timeDemand,
    },
  });
  const managerId = next.history.workRelationships.at(-1)!.id;
  const targets = [base.jobId];
  if (twoWorkers) {
    const other = next.personOrder.find(
      (id) =>
        id !== actor &&
        id !== base.personId &&
        next.people[id]!.homeJurisdictionId === base.town,
    )!;
    next = createWorkRelationship(next, {
      stableKey: `${TOWN_EMPLOYMENT_VERSION}:${base.town}:job:a70-other`,
      personId: other,
      organizationId: worker.organizationId,
      startedAt: next.currentDate,
      kind: worker.kind,
      compensation: "paid",
      authority: "directed",
      dependency: worker.dependency,
      economicRisk: worker.economicRisk,
      provenance: {
        kind: "authored",
        note: "Controlled second actual subordinate.",
      },
      initialRole: {
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: base.town,
        timeDemand: role.timeDemand,
      },
    });
    targets.push(next.history.workRelationships.at(-1)!.id);
  }
  next = createWorkCompensation(next, {
    stableKey: "a70:controlled-payroll",
    workRelationshipId: base.jobId,
    startsAt: next.currentDate,
    amount: money(10000, "USD"),
    cadenceKind: "schedule:monthly",
    restrictionKind: null,
    jurisdictionId: base.town,
    provenance: {
      kind: "authored",
      note: "Explicit fixture payroll terms, not a game estimate.",
    },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: "a70:controlled-unpaid-payroll",
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: knownMoney ? "missed" : "blocked",
    attemptedAmount: money(10000, "USD"),
    transferredAmount: money(0, "USD"),
    reasonKind: knownMoney
      ? "capacity:insufficient-funds"
      : "capacity:money-unknown",
    note: "Explicit recorded payroll failure control.",
    provenance: {
      kind: "authored",
      note: "Controlled payroll failure, not inferred from annual revenue.",
    },
  });
  return {
    ...base,
    world: next,
    actor,
    managerId,
    organizationId: worker.organizationId!,
    targets,
  };
}

function staffingGoal(
  world: World,
  actor: EntityId,
  target: EntityId,
  priority: "low" | "critical",
) {
  const goalKey = `labor:end-work:${target}`;
  return recordGoalState(world, {
    stableKey: `a70:staffing-intent:${target}`,
    personId: actor,
    goalKey,
    recordedAt: world.currentDate,
    objective:
      "End this recorded subordinate's job after reviewing unpaid payroll.",
    domain: "life:livelihood",
    scope: "personal",
    priority,
    status: "active",
    targetEntityId: target,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Explicit manager staffing intent fixture; never generated by the layoff reader.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

describe("A70 employer's recorded staffing choice", () => {
  it("does not turn modeled business losses or absent authority into a layoff", () => {
    const base = quitFixture();
    const organizationId = base.world.history.workRelationships.find(
      (row) => row.id === base.jobId,
    )!.organizationId!;
    expect(
      decideTownEmployerLayoff(
        base.world,
        organizationId,
        activeTownJobs(base.world, base.town),
        "a70:no-authority",
      ),
    ).toBeNull();
    const unknown = employerFixture(false, false);
    expect(
      decideTownEmployerLayoff(
        unknown.world,
        unknown.organizationId,
        activeTownJobs(unknown.world, unknown.town),
        "a70:money-unknown",
      ),
    ).toBeNull();
    const fixture = employerFixture();
    const noPayFailure = {
      ...fixture.world,
      history: {
        ...fixture.world.history,
        resourceTransferOutcomes:
          fixture.world.history.resourceTransferOutcomes.filter(
            (row) => row.stableKey !== "a70:controlled-unpaid-payroll",
          ),
      },
    };
    expect(
      decideTownEmployerLayoff(
        noPayFailure,
        fixture.organizationId,
        activeTownJobs(noPayFailure, fixture.town),
        "a70:no-pay-failure",
      ),
    ).toBeNull();
  });

  it("keeps no saved preference and equal recorded target preferences undecided without tenure or ID selection", () => {
    const fixture = employerFixture(true);
    const absent = decideTownEmployerLayoff(
      fixture.world,
      fixture.organizationId,
      activeTownJobs(fixture.world, fixture.town),
      "a70:absent-staff-choice",
    )!;
    expect(absent.evaluation.outcomeKind).toBe("undecided");
    let next = staffingGoal(
      fixture.world,
      fixture.actor,
      fixture.targets[0]!,
      "critical",
    );
    next = staffingGoal(next, fixture.actor, fixture.targets[1]!, "critical");
    const tied = decideTownEmployerLayoff(
      next,
      fixture.organizationId,
      activeTownJobs(next, fixture.town),
      "a70:tied-staff-choice",
    )!;
    expect(tied.evaluation.outcomeKind).toBe("undecided");
    expect(tied.evaluation.selectedOptionKey).toBeNull();
    expect(tied.evaluation.context.randomness).toBe("none");
  });

  it("saves the actual manager's selected target and payroll source before one canonical job loss, with repeat/reload parity", () => {
    const fixture = employerFixture();
    const saved = staffingGoal(
      fixture.world,
      fixture.actor,
      fixture.jobId,
      "critical",
    );
    const next = reviewTownJobs(
      saved,
      fixture.town,
      fixture.actor,
      "a70-employer-choice",
    );
    expect(workStatusAt(next, fixture.jobId)?.reason).toBe(
      TOWN_JOB_END_REASONS.laidOff,
    );
    const trace = next.history.decisionTraces.find(
      (row) => row.context.decisionType === "labor.employer-staffing",
    )!;
    expect(trace.context.actorPersonId).toBe(fixture.actor);
    expect(trace.selectedOptionKey).toBe(`end:${fixture.jobId}`);
    expect(trace.context.considerations[0]!.importance).toBe("decisive");
    const review = next.history.events.find(
      (row) => row.type === "labor.payroll-reviewed",
    )!;
    expect(review.tags).toContain(
      `source:${saved.history.resourceTransferOutcomes.at(-1)!.id}`,
    );
    expect(
      trace.sourceSnapshots.some(
        (row) =>
          row.reference.kind === "historical-event" &&
          row.reference.eventId === review.id,
      ),
    ).toBe(true);
    expect(
      reviewTownJobs(next, fixture.town, fixture.actor, "a70-employer-choice"),
    ).toBe(next);
    const text = serializeWorld(next);
    const loaded = deserializeWorld(text);
    expect(serializeWorld(loaded)).toBe(text);
    expect(
      reviewTownJobs(
        loaded,
        fixture.town,
        fixture.actor,
        "a70-employer-choice",
      ),
    ).toBe(loaded);
    expect(loaded.history.resourceTransferOutcomes).toEqual(
      saved.history.resourceTransferOutcomes,
    );
  });

  it("refuses multiple active managers instead of picking one by ID", () => {
    const fixture = employerFixture();
    const manager = fixture.world.history.workRelationships.find(
      (row) => row.id === fixture.managerId,
    )!;
    const role = fixture.world.history.workRoles.find(
      (row) => row.workRelationshipId === manager.id,
    )!;
    const next = createWorkRelationship(fixture.world, {
      stableKey: "a70:ambiguous-manager",
      personId: fixture.personId,
      organizationId: manager.organizationId,
      startedAt: fixture.world.currentDate,
      kind: manager.kind,
      compensation: "paid",
      authority: "directs-others",
      dependency: manager.dependency,
      economicRisk: manager.economicRisk,
      provenance: {
        kind: "authored",
        note: "Explicit ambiguous manager control.",
      },
      initialRole: {
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: fixture.town,
        timeDemand: role.timeDemand,
      },
    });
    expect(
      decideTownEmployerLayoff(
        next,
        fixture.organizationId,
        activeTownJobs(next, fixture.town),
        "a70:ambiguous-authority",
      ),
    ).toBeNull();
  });
});
