import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import {
  addSimulationMinutes,
  advanceWorldMinutes,
  allUndertakings,
  assessUndertaking,
  cancelScheduledActivity,
  createCampaignElectionTransitionRegistry,
  createScheduledActivity,
  favorStandingBetween,
  makeIsoDate,
  recordFavor,
  recordLifeCommitment,
  recordWorldEvent,
  standingCommitmentsFor,
  undertakingForLifeCommitment,
} from "./index";
import type { EntityId, UndertakingAct, World } from "./types";

/**
 * Build 22, steps 1 and 2: one reading of every undertaking, judged from what
 * later happened, and one favor record whose weight is read, never stored.
 */

const MEETING_KEY = "undertaking-test:meeting:activity";

function spokenEvent(world: World, a: EntityId, b: EntityId, key: string) {
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: "life.conversation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [a, b],
    participants: [
      { personId: a, role: "focus:subject", detail: "Said it" },
      { personId: b, role: "presence:participant", detail: "Heard it" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["undertaking-test"],
    summary: "They talked about the meeting.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

function promise(
  world: World,
  holder: EntityId,
  owedTo: EntityId,
  act: UndertakingAct,
  key: string,
): World {
  const spoken = spokenEvent(world, holder, owedTo, `${key}:event`);
  return recordLifeCommitment(spoken.world, {
    stableKey: `${key}:commitment`,
    personId: holder,
    startsAt: spoken.world.currentDate,
    endsAt: null,
    kind: "civic:undertaking-test",
    label: "the meeting",
    timeDemand: {
      expectedWeekly: { minimumHours: 0, maximumHours: 1 },
      attention: "low",
      concurrency: "partly-concurrent",
      scheduleRigidity: "mixed",
      interruptibility: "interruptible",
      locationJurisdictionId: null,
    },
    provenance: { kind: "simulated-event", eventId: spoken.eventId },
    undertaking: {
      owedToPersonIds: [owedTo],
      act,
      firmness: "explicit",
      audience: "private",
      heardByPersonIds: [owedTo],
      statement: "Said they would be at the meeting.",
      claimId: null,
      mattered: "slight",
      dueBy: null,
    },
  });
}

function meeting(world: World, personId: EntityId): World {
  return createScheduledActivity(world, {
    stableKey: MEETING_KEY,
    title: "The posted meeting",
    summary: "A posted public meeting.",
    kind: "confirmed",
    start: addSimulationMinutes(world.currentMoment, 60),
    end: addSimulationMinutes(world.currentMoment, 120),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "undertaking-test:room",
      label: "The community room",
      jurisdictionId: null,
    },
    sourceEntityIds: [personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
}

const ATTEND: UndertakingAct = {
  kind: "attend",
  activityStableKey: MEETING_KEY,
  description: "the posted meeting",
};

function lifeUndertaking(world: World) {
  const record = world.history.lifeCommitments.at(-1)!;
  return undertakingForLifeCommitment(world, record.id)!;
}

describe("Build 22 · one reading of every undertaking", () => {
  it("records who a promise was owed to, and reads it back in the shared shape", () => {
    const base = createDemoWorld("build22-terms");
    const [holder, other] = base.personOrder;
    const world = promise(base, holder!, other!, ATTEND, "terms");
    const undertaking = lifeUndertaking(world);
    expect(undertaking.holderPersonId).toBe(holder);
    expect(undertaking.owedToPersonIds).toEqual([other]);
    expect(undertaking.act).toEqual(ATTEND);
    expect(allUndertakings(world)).toContainEqual(undertaking);
  });

  it("refuses a promise owed to nobody, or to the person making it", () => {
    const base = createDemoWorld("build22-refuse");
    const [holder, other] = base.personOrder;
    expect(() => promise(base, holder!, holder!, ATTEND, "self")).toThrow(
      /themselves/,
    );
    expect(() =>
      promise(base, holder!, "person:nobody" as EntityId, ATTEND, "missing"),
    ).toThrow();
    expect(other).toBeDefined();
  });

  it("is outstanding before the meeting and broken when it ends without them", () => {
    const base = createDemoWorld("build22-broken");
    const [holder, other] = base.personOrder;
    let world = promise(
      meeting(base, holder!),
      holder!,
      other!,
      ATTEND,
      "broken",
    );
    expect(assessUndertaking(world, lifeUndertaking(world)).standing).toBe(
      "outstanding",
    );
    world = advanceWorldMinutes(
      world,
      180,
      createCampaignElectionTransitionRegistry(),
    );
    const after = assessUndertaking(world, lifeUndertaking(world));
    expect(after.standing).toBe("broken");
    expect(after.account).not.toMatch(/\d+%|percent|chance/);
  });

  it("is kept when the record shows them there, and a plan to go is not that", () => {
    const base = createDemoWorld("build22-kept");
    const [holder, other] = base.personOrder;
    let world = promise(
      meeting(base, holder!),
      holder!,
      other!,
      ATTEND,
      "kept",
    );
    const activityId = world.history.scheduledActivities.find(
      (entry) => entry.stableKey === MEETING_KEY,
    )!.id;
    const record = (
      stableKey: string,
      type: `${string}.${string}`,
      role: "agency:actor" | "presence:participant",
    ) =>
      recordWorldEvent(world, {
        stableKey,
        type,
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [activityId, holder!],
        participants: [{ personId: holder!, role, detail: "Went" }],
        personFactConstraints: [],
        visibility: "private",
        tags: ["undertaking-test"],
        summary: "They said they would be at the meeting.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    world = record(
      "kept:plan",
      "civic.meeting-attendance-planned",
      "agency:actor",
    );
    expect(assessUndertaking(world, lifeUndertaking(world)).standing).toBe(
      "outstanding",
    );
    world = record(
      "kept:presence",
      "life.scene.arrived",
      "presence:participant",
    );
    const assessed = assessUndertaking(world, lifeUndertaking(world));
    expect(assessed.standing).toBe("kept");
    expect(assessed.evidenceId).toBe(world.history.events.at(-1)!.id);
  });

  it("leaves nothing to keep when the meeting is called off", () => {
    const base = createDemoWorld("build22-moot");
    const [holder, other] = base.personOrder;
    let world = promise(
      meeting(base, holder!),
      holder!,
      other!,
      ATTEND,
      "moot",
    );
    const activityId = world.history.scheduledActivities.find(
      (entry) => entry.stableKey === MEETING_KEY,
    )!.id;
    world = cancelScheduledActivity(world, activityId);
    expect(assessUndertaking(world, lifeUndertaking(world)).standing).toBe(
      "moot",
    );
  });

  it("never marks help kept or broken on a guess", () => {
    const base = createDemoWorld("build22-help");
    const [holder, other] = base.personOrder;
    const world = promise(
      base,
      holder!,
      other!,
      { kind: "help", description: "help with the move" },
      "help",
    );
    expect(assessUndertaking(world, lifeUndertaking(world)).standing).toBe(
      "outstanding",
    );
  });

  it("reads the standing into the commitment seam, and raised-again is not met", () => {
    const base = createDemoWorld("build22-seam");
    const [holder, other] = base.personOrder;
    let world = promise(
      meeting(base, holder!),
      holder!,
      other!,
      ATTEND,
      "seam",
    );
    world = advanceWorldMinutes(
      world,
      180,
      createCampaignElectionTransitionRegistry(),
    );
    const entry = standingCommitmentsFor(world, holder!).find(
      (candidate) => candidate.record.stableKey === "seam:commitment",
    )!;
    expect(entry.standing).toBe("broken");
    expect(entry.firmness).toBe("explicit");
    expect(entry.raisedAgain).toBe(false);
  });
});

describe("Build 22 · the favor record", () => {
  function helped(seed: string, weight: "slight" | "great") {
    const base = createDemoWorld(seed);
    const [giver, receiver] = base.personOrder;
    const spoken = spokenEvent(base, giver!, receiver!, `${seed}:help`);
    const world = recordFavor(spoken.world, {
      stableKey: `${seed}:favor`,
      giverPersonId: giver!,
      receiverPersonId: receiver!,
      kind: "personal:help",
      description: "helped them move house",
      givenAt: spoken.world.currentDate,
      eventId: spoken.eventId,
      subject: { kind: "none" },
      motive: "trade",
      weight,
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: null,
      undertakingId: null,
    });
    return { world, giver: giver!, receiver: receiver! };
  }

  it("stores what happened and reads the debt, which fades while the expectation does not", () => {
    const { world, giver, receiver } = helped("build22-favor", "great");
    const now = favorStandingBetween(world, receiver, giver);
    expect(now.receiverDebt).toBe("strong");
    expect(now.giverExpectation).toBe("strong");
    const record = world.history.favors!.at(-1)! as unknown as Record<
      string,
      unknown
    >;
    for (const stored of ["debt", "receiverDebt", "balance", "score"]) {
      expect(record[stored]).toBeUndefined();
    }
    const years = favorStandingBetween(
      world,
      receiver,
      giver,
      makeIsoDate("2040-01-01"),
    );
    expect(["none", "slight", "marked"]).toContain(years.receiverDebt);
    expect(years.giverExpectation).toBe("strong");
  });

  it("is settled by a favor returned for it", () => {
    const { world, giver, receiver } = helped("build22-return", "slight");
    const first = world.history.favors!.at(-1)!;
    const spoken = spokenEvent(world, receiver, giver, "build22-return:back");
    const settled = recordFavor(spoken.world, {
      stableKey: "build22-return:favor-back",
      giverPersonId: receiver,
      receiverPersonId: giver,
      kind: "personal:help",
      description: "drove them to the airport",
      givenAt: spoken.world.currentDate,
      eventId: spoken.eventId,
      subject: { kind: "none" },
      motive: "kindness",
      weight: "slight",
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: first.id,
      undertakingId: null,
    });
    const standing = favorStandingBetween(settled, receiver, giver);
    expect(standing.receiverDebt).toBe("none");
    expect(standing.giverExpectation).toBe("none");
    expect(standing.openFavorIds).toEqual([]);
  });

  it("refuses a return that did not go the other way", () => {
    const { world, giver, receiver } = helped("build22-wrong-way", "slight");
    const first = world.history.favors!.at(-1)!;
    const spoken = spokenEvent(world, giver, receiver, "wrong-way:again");
    expect(() =>
      recordFavor(spoken.world, {
        stableKey: "wrong-way:favor-again",
        giverPersonId: giver,
        receiverPersonId: receiver,
        kind: "personal:help",
        description: "helped again",
        givenAt: spoken.world.currentDate,
        eventId: spoken.eventId,
        subject: { kind: "none" },
        motive: "trade",
        weight: "slight",
        audience: "private",
        witnessPersonIds: [],
        inReturnForFavorId: first.id,
        undertakingId: null,
      }),
    ).toThrow(/other way/);
  });

  it("expects nothing back from kindness", () => {
    const base = createDemoWorld("build22-kindness");
    const [giver, receiver] = base.personOrder;
    const spoken = spokenEvent(base, giver!, receiver!, "kindness:help");
    const world = recordFavor(spoken.world, {
      stableKey: "kindness:favor",
      giverPersonId: giver!,
      receiverPersonId: receiver!,
      kind: "personal:help",
      description: "brought dinner after the funeral",
      givenAt: spoken.world.currentDate,
      eventId: spoken.eventId,
      subject: { kind: "none" },
      motive: "kindness",
      weight: "great",
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: null,
      undertakingId: null,
    });
    const standing = favorStandingBetween(world, receiver!, giver!);
    expect(standing.giverExpectation).toBe("none");
    expect(standing.receiverDebt).toBe("strong");
  });
});
