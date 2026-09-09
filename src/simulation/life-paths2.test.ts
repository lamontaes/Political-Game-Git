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
  createScenarioWorld,
  candidacyPackById,
  fileCampaign,
  ensureCampaignOpponents,
  ageOnDate,
  addDays,
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
  hasLifePathCredential,
} from "./life-paths2";
import {
  createWorkItem,
  advanceWorldMinutes,
  workItemState,
} from "./time-work";
import { resourcePositionAt } from "./resource-queries";
import type { World } from "./types";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
const provenance = {
  kind: "authored",
  note: "Explicit synthetic LIFE-PATHS2 proof.",
} as const;
function fixture(openingBalance = 100000): World {
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
    openingBalance: money(openingBalance, "USD"),
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
  it("refuses a willing known person who already holds rigid work", () => {
    const setup = candidate();
    const control = setup.world.control;
    let w = enterLifePath(
      { ...setup.world, control: { kind: "person", personId: setup.person } },
      "shop-assistant",
    ).world;
    w = { ...w, control };
    const result = recruitLifePathPerson(
      w,
      setup.person,
      "community-volunteer",
      0,
    );
    expect(result.ok).toBe(true);
    expect(result.world.history.workStatuses.at(-1)?.status).toBe("ended");
    expect(result.world.history.workStatuses.at(-1)?.reason).toBe(
      "Unavailable for this work.",
    );
    expect(result.world.history.workItems).toHaveLength(0);
    expect(
      recruitLifePathPerson(w, setup.person, "repair-worker", 15000).world,
    ).toBe(w);
  });
  it("lets the same person resign from volunteer work and preserves unfinished output", () => {
    const setup = candidate();
    let w = recruitLifePathPerson(
      setup.world,
      setup.person,
      "community-volunteer",
      0,
    ).world;
    const id = w.history.workRelationships.at(-1)!.id;
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    w = activateLifePathRecruit(w, id).world;
    w = delegateLifePathWork(w, id).world;
    const item = w.history.workItems.at(-1)!.id;
    w = advanceWorldMinutes(w, 30, LIFE_PATHS2_HANDLERS);
    const control = w.control;
    w = changeLifePathStatus(
      { ...w, control: { kind: "person", personId: setup.person } },
      id,
      "leave",
    ).world;
    w = deserializeWorld(serializeWorld({ ...w, control }));
    w = advanceWorldMinutes(w, 30, LIFE_PATHS2_HANDLERS);
    expect(workItemState(w, item).completedEffortMinutes).toBe(30);
    expect(workItemState(w, item).status).toBe("active");
    expect(w.history.resourceTransferOutcomes).toHaveLength(0);
  });
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
    const savedRaise = deserializeWorld(serializeWorld(w));
    expect(progressLifePathWork(savedRaise, id).world).toBe(savedRaise);
    w = savedRaise;
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
  it.each([false, true])(
    "conserves worker capacity across reload; distinct workers: %s",
    (distinct) => {
      let w = fixture();
      for (let i = 0; i < 2; i++) {
        const person = w.personOrder[distinct ? i + 1 : 1]!;
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
      w = advanceWorldMinutes(w, 30, LIFE_PATHS2_HANDLERS);
      w = deserializeWorld(serializeWorld(w));
      w = advanceWorldMinutes(w, 30, LIFE_PATHS2_HANDLERS);
      expect(
        w.history.workItems.reduce(
          (sum, item) => sum + workItemState(w, item.id).completedEffortMinutes,
          0,
        ),
      ).toBe(distinct ? 120 : 60);
      expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    },
  );
});

it("binds campaign compensation to its treasury and refuses absent campaign authority", () => {
  let w = createScenarioWorld(
    "life-paths2-campaign-account",
    KENTUCKY_CONTEXT,
    { peopleCount: 8 },
  );
  const adults = w.personOrder.filter(
    (id) => ageOnDate(w.people[id]!.birthDate, w.currentDate) >= 18,
  );
  expect(adults.length).toBeGreaterThanOrEqual(2);
  const actor = adults[0]!,
    person = adults[1]!;
  w = { ...w, control: { kind: "person", personId: actor } };
  w = recordKinship(w, {
    stableKey: "campaign-contact",
    personIds: [actor, person],
    establishedAt: w.currentDate,
    kind: "collateral:cousin",
    provenance,
  });
  expect(
    recruitLifePathPerson(w, person, "campaign-volunteer", 500).world,
  ).toBe(w);
  w = recordGoalState(w, {
    stableKey: "campaign-seek",
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
      note: "Synthetic expressed intention.",
    },
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
  const pack = candidacyPackById("us-ky-general-assembly-v1:candidacy")!;
  const opponents = ensureCampaignOpponents(w, {
    stableKey: "life-paths2-account-fixture",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [actor, person],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "life-paths2-campaign",
    candidatePersonId: actor,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: pack.offices[0]!.officeKey,
    electionDate: addDays(w.currentDate, 21),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Synthetic test committee",
    donorPoolName: "Synthetic source",
    advertisingVendorName: "Synthetic vendor",
    staffPersonIds: [],
    treasuryCurrency: money(0, "USD").currency,
  });
  const result = recruitLifePathPerson(
    filed.world,
    person,
    "campaign-volunteer",
    500,
  );
  expect(result.ok).toBe(true);
  const work = result.world.history.workRelationships.at(-1)!;
  expect(work.organizationId).toBe(filed.campaign.organizationId);
  const flow = result.world.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === work.id,
  )!;
  expect(flow.source).toEqual({
    kind: "organization",
    organizationId: filed.campaign.organizationId,
  });
  expect(result.world.history.resourceTransferOutcomes).toEqual(
    filed.world.history.resourceTransferOutcomes,
  );
  expect(deserializeWorld(serializeWorld(result.world))).toEqual(result.world);
});

for (const [path, sessions, fee, program, timeout] of [
  ["trade-training", 12, 1500, "training:repair-certificate", 30000],
  [
    "college-associate",
    96,
    4000,
    "postsecondary:public-administration-associate",
    60000,
  ],
] as const) {
  // Hosted CI measured the full 96-session journey at 35.1 seconds. Give only
  // that new long integration case a 60-second budget; retain every real
  // session, fee, credential and reload assertion and all prior test limits.
  it(
    `completes the full supported ${path} program with its actual costs`,
    () => {
      let w = enterLifePath(fixture(1000000), path).world;
      const id = w.history.educationEnrollments.at(-1)!.id;
      expect(hasLifePathCredential(w, w.personOrder[0]!, program)).toBe(false);
      for (let i = 0; i < sessions; i++) {
        w = scheduleLifePathSession(w, id).world;
        const result = performLifePathSession(
          w,
          w.history.scheduledActivities.at(-1)!.id,
        );
        expect(result.ok).toBe(true);
        w = result.world;
        if (i === Math.floor(sessions / 2))
          w = deserializeWorld(serializeWorld(w));
      }
      expect(hasLifePathCredential(w, w.personOrder[0]!, program)).toBe(true);
      expect(balance(w)).toBe(1000000 - sessions * fee);
      if (path === "trade-training") {
        w = enterLifePath(w, "repair-worker").world;
        const work = w.history.workRelationships.at(-1)!.id;
        w = scheduleLifePathSession(w, work).world;
        w = performLifePathSession(
          w,
          w.history.scheduledActivities.at(-1)!.id,
        ).world;
        const earned = balance(w);
        w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
        expect(balance(w)).toBe(earned + 15000);
      }
      expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    },
    timeout,
  );
}
