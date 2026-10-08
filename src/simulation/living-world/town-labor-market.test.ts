import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";

import type { EntityId, World } from "../types";
import {
  decideTownWorkerQuit,
  reviewTownJobs,
  TOWN_JOB_END_REASONS,
} from "./town-labor-market";
import { createWorkRelationship } from "../life";
import { createMindProvenance, recordGoalState } from "../mind";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { workStatusHistory } from "../life-queries";

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
