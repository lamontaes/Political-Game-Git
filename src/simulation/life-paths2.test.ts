import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  createWorld,
  serializeWorld,
  deserializeWorld,
  createResourcePosition,
  money,
  advanceWorld,
  recordKinship,
  recordGoalState,
} from "./index";
import {
  acceptLifePathCounteroffer,
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
  changeLifePathStatus,
  LIFE_PATHS2_HANDLERS,
  recruitLifePathPerson,
  activateLifePathRecruit,
  delegateLifePathWork,
  departLifePathRecruit,
  progressLifePathWork,
} from "./life-paths2";
import {
  createWorkItem,
  advanceWorldMinutes,
  workItemState,
} from "./time-work";
import { resourcePositionAt } from "./resource-queries";
import type { World } from "./types";
const provenance = {
  kind: "authored",
  note: "Explicit synthetic LIFE-PATHS2 proof.",
} as const;
function fixture(): World {
  const demo = createDemoWorld("life-paths2-proof");
  let world = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id]!),
    control: { kind: "person", personId: demo.personOrder[0]! },
  });
  world = createResourcePosition(world, {
    stableKey: "funds",
    owner: { kind: "person", personId: world.personOrder[0]! },
    openedAt: world.currentDate,
    openingBalance: money(100000, "USD"),
    provenance,
  });
  return world;
}
const balance = (w: World) =>
  resourcePositionAt(
    w,
    { kind: "person", personId: w.personOrder[0]! },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;
describe("LIFE-PATHS2 canonical progression", () => {
  it("enrolls, consumes actual session time and fees, interrupts/returns and reloads", () => {
    let w = fixture();
    w = enterLifePath(w, "college-office-certificate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    expect(balance(w)).toBe(100000);
    w = scheduleLifePathSession(w, id).world;
    const activity = w.history.scheduledActivities.at(-1)!.id;
    const result = performLifePathSession(w, activity);
    expect(result.ok).toBe(true);
    w = result.world;
    expect(balance(w)).toBe(97500);
    expect(performLifePathSession(w, activity).world).toBe(w);
    w = changeLifePathStatus(w, id, "pause").world;
    expect(scheduleLifePathSession(w, id).world).toBe(w);
    w = deserializeWorld(serializeWorld(w));
    expect(changeLifePathStatus(w, id, "return").ok).toBe(true);
  });
  it("refuses unqualified repair work and pays shop work only the following day", () => {
    let w = fixture();
    expect(enterLifePath(w, "repair-worker").world).toBe(w);
    w = enterLifePath(w, "shop-assistant").world;
    const id = w.history.workRelationships.at(-1)!.id;
    w = scheduleLifePathSession(w, id).world;
    w = performLifePathSession(
      w,
      w.history.scheduledActivities.at(-1)!.id,
    ).world;
    expect(balance(w)).toBe(100000);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(balance(w)).toBe(107200);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(balance(w)).toBe(107200);
  });
  it("uses the same known willing person, delegates real work, and stops after departure", () => {
    let w = fixture();
    const actor = w.personOrder[0]!,
      person = w.personOrder[1]!;
    w = recordKinship(w, {
      stableKey: "kin",
      personIds: [actor, person],
      establishedAt: w.currentDate,
      kind: "collateral:cousin",
      provenance,
    });
    w = recordGoalState(w, {
      stableKey: "seek",
      goalKey: "life-paths2:seek-work",
      personId: person,
      recordedAt: w.currentDate,
      objective: "Seek suitable work.",
      domain: "work",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: {
        kind: "authored",
        sourceRefs: [],
        note: "Fixture current intention.",
      },
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    const response = recruitLifePathPerson(w, person, "community-volunteer", 0);
    expect(response.ok).toBe(true);
    w = response.world;
    const id = w.history.workRelationships.at(-1)!.id;
    expect(activateLifePathRecruit(w, id).world).toBe(w);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    w = activateLifePathRecruit(w, id).world;
    w = delegateLifePathWork(w, id).world;
    const item = w.history.workItems.at(-1)!.id;
    w = advanceWorldMinutes(w, 30, LIFE_PATHS2_HANDLERS);
    expect(workItemState(w, item).completedEffortMinutes).toBe(30);
    w = departLifePathRecruit(w, id).world;
    w = advanceWorldMinutes(w, 150, LIFE_PATHS2_HANDLERS);
    expect(workItemState(w, item).completedEffortMinutes).toBe(30);
  });
});

describe("LIFE-PATHS2 complete path and refusals", () => {
  it("earns a college credential only after every spaced session, surviving interruption and reload", () => {
    let w = enterLifePath(fixture(), "college-office-certificate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    for (let i = 0; i < 24; i++) {
      if (i === 8) {
        w = changeLifePathStatus(w, id, "pause").world;
        w = deserializeWorld(serializeWorld(w));
        w = changeLifePathStatus(w, id, "return").world;
      }
      w = scheduleLifePathSession(w, id).world;
      const result = performLifePathSession(
        w,
        w.history.scheduledActivities.at(-1)!.id,
      );
      expect(result.ok).toBe(true);
      w = result.world;
    }
    expect(w.history.educationEnrollmentStates.at(-1)?.status).toBe(
      "completed",
    );
    expect(w.history.educationEnrollmentStates.at(-1)?.reason).toBe(
      "Office administration certificate",
    );
    expect(balance(w)).toBe(40000);
    expect(enterLifePath(w, "office-assistant").ok).toBe(true);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }, 30000);
  it("does not infer consent from family and does not mutate on unsupported or repeated actions", () => {
    let w = fixture();
    const actor = w.personOrder[0]!,
      person = w.personOrder[1]!;
    w = recordKinship(w, {
      stableKey: "kin",
      personIds: [actor, person],
      establishedAt: w.currentDate,
      kind: "collateral:cousin",
      provenance,
    });
    w = recordGoalState(w, {
      stableKey: "decline",
      goalKey: "life-paths2:decline-work",
      personId: person,
      recordedAt: w.currentDate,
      objective: "Decline additional work.",
      domain: "work",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: {
        kind: "authored",
        sourceRefs: [],
        note: "Fixture current intention.",
      },
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    expect(recruitLifePathPerson(w, person, "shop-assistant", 0).world).toBe(w);
    const response = recruitLifePathPerson(w, person, "community-volunteer", 0);
    w = response.world;
    expect(w.history.workStatuses.at(-1)?.status).toBe("ended");
    expect(
      activateLifePathRecruit(w, w.history.workRelationships.at(-1)!.id).world,
    ).toBe(w);
    expect(w.history.workItems).toHaveLength(0);
  });
  it("refuses overlapping study and work sessions without changing either commitment", () => {
    let w = enterLifePath(fixture(), "college-associate").world;
    w = scheduleLifePathSession(
      w,
      w.history.educationEnrollments.at(-1)!.id,
    ).world;
    w = enterLifePath(w, "shop-assistant").world;
    const before = serializeWorld(w);
    expect(
      scheduleLifePathSession(w, w.history.workRelationships.at(-1)!.id).world,
    ).toBe(w);
    expect(serializeWorld(w)).toBe(before);
  });
});

describe("LIFE-PATHS2 negotiated pay and contention", () => {
  function candidate() {
    let w = fixture();
    const actor = w.personOrder[0]!,
      person = w.personOrder[1]!;
    w = recordKinship(w, {
      stableKey: "kin",
      personIds: [actor, person],
      establishedAt: w.currentDate,
      kind: "collateral:cousin",
      provenance,
    });
    w = recordGoalState(w, {
      stableKey: "seek",
      goalKey: "life-paths2:seek-work",
      personId: person,
      recordedAt: w.currentDate,
      objective: "Seek suitable work.",
      domain: "work",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: {
        kind: "authored",
        sourceRefs: [],
        note: "Fixture current intention.",
      },
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    return { world: w, person };
  }
  it("negotiates a paid offer, makes no payment at acceptance, and pays completed delegation from personal funds", () => {
    const setup = candidate();
    let w = setup.world;
    w = recruitLifePathPerson(w, setup.person, "shop-assistant", 1000).world;
    const id = w.history.workRelationships.at(-1)!.id;
    expect(w.history.events.at(-1)?.type).toBe("life-paths2.offer-negotiated");
    expect(delegateLifePathWork(w, id).world).toBe(w);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    const accepted = acceptLifePathCounteroffer(w, id);
    expect(accepted.ok).toBe(true);
    w = accepted.world;
    w = activateLifePathRecruit(w, id).world;
    expect(balance(w)).toBe(100000);
    w = delegateLifePathWork(w, id).world;
    w = advanceWorldMinutes(w, 240, LIFE_PATHS2_HANDLERS);
    expect(workItemState(w, w.history.workItems.at(-1)!.id).status).toBe(
      "ready-for-review",
    );
    expect(balance(w)).toBe(100000);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(balance(w)).toBe(91000);
    const saved = deserializeWorld(serializeWorld(w));
    expect(balance(advanceWorld(saved, 1, LIFE_PATHS2_HANDLERS))).toBe(91000);
  });
});

describe("LIFE-PATHS2 progression and shared execution", () => {
  it("preserves interrupted employment and changes only future earned pay after ten shifts", () => {
    let w = enterLifePath(fixture(), "shop-assistant").world;
    const id = w.history.workRelationships.at(-1)!.id;
    expect(progressLifePathWork(w, id).world).toBe(w);
    for (let i = 0; i < 10; i++) {
      if (i === 4) {
        w = changeLifePathStatus(w, id, "pause").world;
        expect(scheduleLifePathSession(w, id).world).toBe(w);
        w = deserializeWorld(serializeWorld(w));
        w = changeLifePathStatus(w, id, "return").world;
      }
      w = scheduleLifePathSession(w, id).world;
      const result = performLifePathSession(
        w,
        w.history.scheduledActivities.at(-1)!.id,
      );
      expect(result.ok).toBe(true);
      w = advanceWorld(result.world, 1, LIFE_PATHS2_HANDLERS);
    }
    expect(balance(w)).toBe(172000);
    const raised = progressLifePathWork(w, id);
    expect(raised.ok).toBe(true);
    w = raised.world;
    expect(balance(w)).toBe(172000);
    w = scheduleLifePathSession(w, id).world;
    w = performLifePathSession(
      w,
      w.history.scheduledActivities.at(-1)!.id,
    ).world;
    w = changeLifePathStatus(w, id, "leave").world;
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(balance(w)).toBe(179920);
    expect(changeLifePathStatus(w, id, "return").world).toBe(w);
  }, 30000);
  it("never spends the same worker minute twice across assignments", () => {
    let w = fixture();
    const person = w.personOrder[1]!;
    for (let i = 0; i < 2; i++) {
      w = createWorkItem(w, {
        stableKey: `contention-${i}`,
        title: "Fixture work",
        summary: "Explicit authored work duration.",
        jurisdictionId: null,
        sourceEntityIds: [person],
        focus: { kind: "person", personId: person },
        effort: { kind: "authored-duration", requiredMinutes: 120 },
        access: { kind: "private", personIds: [w.personOrder[0]!, person] },
        assignedPersonIds: [person],
        playerRequirement: "none",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: null,
      });
    }
    w = advanceWorldMinutes(w, 60, LIFE_PATHS2_HANDLERS);
    expect(
      w.history.workItems.reduce(
        (sum, item) => sum + workItemState(w, item.id).completedEffortMinutes,
        0,
      ),
    ).toBe(60);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
});
