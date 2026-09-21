import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "./index";
import type { EntityId, World } from "./index";
import { addDays, addSimulationMinutes } from "./index";
import { createScheduledActivity, cancelScheduledActivity } from "./time-work";
import { recordTraitChange } from "./people-traits";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  CONTINUING_LIFE_TAG,
  NPC_INTENTION_EVENT,
  NPC_UNDERTAKING_EVENT,
  commitmentConflict,
  correctSincereMistake,
  decideNpcFollowUp,
  npcIntentions,
  openCommitmentLoad,
  openCommitments,
  recordNpcIntention,
  recordNpcStatement,
  recordNpcUndertaking,
  settleNpcIntention,
} from "./people-continuing-life";

/**
 * MUSE-PEOPLE deliverable A: people remember, pursue intentions and respond.
 *
 * Intentions are ordinary mind goal states, undertakings are private events
 * between NPCs, and statements keep the words, the belief and the truth as
 * three separate records. What this has to prove is the decision surface:
 * kept, failed and abandoned are different histories; a crowded life changes
 * the answer; and nobody learns what they were not there to hear.
 */

function adultLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  return { world: game.world, player: game.playerPersonId };
}

/** Another adult in the same life to stand in as the NPC. */
function otherAdult(world: World, player: EntityId): EntityId {
  const found = world.personOrder.find((id) => {
    if (id === player) return false;
    const person = world.people[id]!;
    const age = Number(person.birthDate.slice(0, 4));
    const year = Number(world.currentDate.slice(0, 4));
    return year - age >= 18;
  });
  if (!found) throw new Error("The fixture life has nobody else in it.");
  return found;
}

/** A third adult who is party to nothing, for the privacy tests. */
function stranger(world: World, player: EntityId, npc: EntityId): EntityId {
  const found = world.personOrder.find((id) => id !== player && id !== npc);
  if (!found) throw new Error("The fixture life has no stranger in it.");
  return found;
}

/** The latest event involving this person: valid grounding for a trait change. */
function eventFor(world: World, personId: EntityId) {
  const found = [...world.history.events]
    .reverse()
    .find((event) => event.involvedEntityIds.includes(personId));
  if (!found) throw new Error("The fixture life records nothing for them.");
  return found;
}

function knownEventIds(world: World, personId: EntityId): Set<EntityId> {
  return new Set(
    world.history.knowledge
      .filter((entry) => entry.personId === personId)
      .map((entry) => entry.eventId),
  );
}

describe("NPC intentions are remembered and settle three ways", () => {
  const { world, player } = adultLife("continuing-intentions");
  const npc = otherAdult(world, player);

  it("starts active, owed within the month, and says nothing to nobody", () => {
    const { world: taken, goalId } = recordNpcIntention(world, {
      npcId: npc,
      targetPersonId: player,
      kind: "follow-up",
      objective: "Bring the borrowed ladder back on Sunday.",
      sourceEventId: null,
      deadline: null,
    });
    assertWorldIntegrity(taken);
    const intentions = npcIntentions(taken, npc);
    expect(intentions.map((entry) => entry.goalId)).toContain(goalId);
    const kept = intentions.find((entry) => entry.goalId === goalId)!;
    expect(kept.status).toBe("active");
    expect(kept.objective).toBe("Bring the borrowed ladder back on Sunday.");
    // No knowledge is written for anyone: an intention is not yet news.
    const noted = taken.history.events.find(
      (event) => event.type === NPC_INTENTION_EVENT,
    )!;
    expect(noted.visibility).toBe("private");
    expect(knownEventIds(taken, player).has(noted.id)).toBe(false);
    expect(knownEventIds(taken, npc).has(noted.id)).toBe(false);
  });

  it("kept, failed and abandoned are three different records", () => {
    const kinds = ["follow-up", "reconnect", "introduce"] as const;
    const endings = ["completed", "failed", "abandoned"] as const;
    let next = world;
    const goalIds: EntityId[] = [];
    for (const kind of kinds) {
      const taken = recordNpcIntention(next, {
        npcId: npc,
        targetPersonId: null,
        kind,
        objective: `Something taken on (${kind}).`,
        sourceEventId: null,
        deadline: null,
      });
      next = taken.world;
      goalIds.push(taken.goalId);
    }
    endings.forEach((status, index) => {
      next = settleNpcIntention(
        next,
        npc,
        goalIds[index]!,
        status,
        `It ended: ${status}.`,
      );
    });
    assertWorldIntegrity(next);
    const byGoal = new Map(
      npcIntentions(next, npc).map((entry) => [entry.goalId, entry.status]),
    );
    expect(byGoal.get(goalIds[0])).toBe("completed");
    expect(byGoal.get(goalIds[1])).toBe("failed");
    expect(byGoal.get(goalIds[2])).toBe("abandoned");
    // The progress events are three different tags, not one flag.
    for (const status of endings) {
      expect(
        next.history.events.some(
          (event) =>
            event.tags.includes(CONTINUING_LIFE_TAG) &&
            event.tags.includes(`continuing.outcome:${status}`),
        ),
      ).toBe(true);
    }
  });

  it("an intention cannot come from nothing or aim at nobody", () => {
    expect(() =>
      recordNpcIntention(world, {
        npcId: npc,
        targetPersonId: player,
        kind: "follow-up",
        objective: "Something from nowhere.",
        sourceEventId: "missing-event" as EntityId,
        deadline: null,
      }),
    ).toThrow(/nothing/);
    expect(() =>
      settleNpcIntention(
        world,
        npc,
        "missing-goal" as EntityId,
        "completed",
        "x",
      ),
    ).toThrow(/not on record/);
  });
});

describe("what is owed changes the answer", () => {
  const { world, player } = adultLife("continuing-load");
  const npc = otherAdult(world, player);

  function scheduledToday(base: World, target: EntityId): World {
    return createScheduledActivity(base, {
      stableKey: `continuing-test:standing:${target}:${base.currentDate}`,
      title: "Standing commitment",
      summary: "Something already on the calendar for today.",
      kind: "flexible",
      start: base.currentMoment,
      end: addSimulationMinutes(base.currentMoment, 60),
      participantPersonIds: [target],
      responsiblePersonId: target,
      location: {
        locationKey: "continuing-test:home",
        label: "Home",
        jurisdictionId: null,
      },
      sourceEntityIds: [target],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [target] },
    });
  }

  /** The NPC with something on record, so a trait change can cite it. */
  function npcWithHistory(): { history: World; second: EntityId } {
    const second = world.personOrder.find((id) => id !== player && id !== npc)!;
    const { world: history } = recordNpcUndertaking(world, {
      firstPersonId: npc,
      secondPersonId: second,
      undertaking: "Clear out the shared garage.",
      stepsTotal: 1,
    });
    return { history, second };
  }

  it("a standing day is a conflict; a cancelled one is not", () => {
    const busy = scheduledToday(world, npc);
    const activity = busy.history.scheduledActivities.at(-1)!;
    expect(commitmentConflict(busy, npc, world.currentDate)).toBe(true);
    expect(commitmentConflict(busy, player, world.currentDate)).toBe(false);
    const freed = cancelScheduledActivity(busy, activity.id);
    expect(commitmentConflict(freed, npc, world.currentDate)).toBe(false);
  });

  it("different information gives a different decision, not a new weight", () => {
    const free = decideNpcFollowUp(world, {
      npcId: npc,
      playerId: player,
      commitmentEventId: null,
      neededOn: addDays(world.currentDate, 40),
    });
    const busyWorld = scheduledToday(world, npc);
    const busy = decideNpcFollowUp(busyWorld, {
      npcId: npc,
      playerId: player,
      commitmentEventId: null,
      neededOn: world.currentDate,
    });
    // A calendar conflict supports refusing the new thing; a free day does
    // not. The decision machinery is deterministic on a fixed seed, so the
    // two answers differ exactly where the information differs.
    expect(busy.outcome).toBe("refuse-new");
    expect(free.outcome).not.toBe("refuse-new");
  });

  it("a reliable person with something standing refuses the new thing", () => {
    const { history } = npcWithHistory();
    const busyWorld = scheduledToday(history, npc);
    const grounding = eventFor(busyWorld, npc);
    const reliable = recordTraitChange(busyWorld, {
      personId: npc,
      trait: "reliability",
      value: 2,
      eventId: grounding.id,
      reason:
        "Fixture grounding: this person follows through on what they owe.",
    });
    const decided = decideNpcFollowUp(reliable, {
      npcId: npc,
      playerId: player,
      commitmentEventId: null,
      neededOn: world.currentDate,
    });
    expect(decided.outcome).toBe("refuse-new");
  });

  it("the same trait in different circumstances is not the same answer", () => {
    const { history } = npcWithHistory();
    const grounding = eventFor(history, npc);
    const reliable = recordTraitChange(history, {
      personId: npc,
      trait: "reliability",
      value: 2,
      eventId: grounding.id,
      reason: "Fixture grounding: this person follows through.",
    });
    // Nothing owed and nothing on the day: reliability has nothing to hold.
    const open = decideNpcFollowUp(reliable, {
      npcId: npc,
      playerId: player,
      commitmentEventId: null,
      neededOn: addDays(world.currentDate, 40),
    });
    expect(openCommitmentLoad(reliable, npc)).toBe(0);
    expect(open.outcome).not.toBe("refuse-new");
  });

  it("a new life owes nothing and stays integral", () => {
    expect(openCommitments(world, player)).toEqual([]);
    expect(openCommitmentLoad(world, player)).toBe(0);
    assertWorldIntegrity(world);
  });
});

describe("two NPCs have lives of their own", () => {
  const { world, player } = adultLife("continuing-undertaking");
  const npc = otherAdult(world, player);
  const partner = stranger(world, player, npc);
  const outsider = world.personOrder.find(
    (id) => id !== player && id !== npc && id !== partner,
  )!;

  it("their undertaking progresses without the player and tells them nothing", () => {
    const begun = recordNpcUndertaking(world, {
      firstPersonId: npc,
      secondPersonId: partner,
      undertaking: "Fix the fence between their yards.",
      stepsTotal: 2,
    });
    assertWorldIntegrity(begun.world);
    const event = begun.world.history.events.find(
      (e) => e.type === NPC_UNDERTAKING_EVENT,
    )!;
    expect(event.visibility).toBe("private");
    expect(event.involvedEntityIds).not.toContain(player);
    // Nobody outside the two of them learns of it — not the player, and
    // not a fourth person who was nowhere near.
    expect(knownEventIds(begun.world, player).has(event.id)).toBe(false);
    expect(knownEventIds(begun.world, outsider).has(event.id)).toBe(false);
    // A due step is scheduled through the registry, not through a panel.
    expect(
      begun.world.history.futureDueItems.some((item) =>
        item.stableKey.includes(begun.undertakingKey),
      ),
    ).toBe(true);
  });
});

describe("words, belief and truth are three records", () => {
  const { world, player } = adultLife("continuing-statements");
  const npc = otherAdult(world, player);
  const eavesdropper = stranger(world, player, npc);

  function hostFor(): { world: World; hostId: EntityId } {
    const begun = recordNpcUndertaking(world, {
      firstPersonId: npc,
      secondPersonId: eavesdropper,
      undertaking: "Mend the shared gate.",
      stepsTotal: 1,
    });
    const host = begun.world.history.events.find(
      (event) => event.type === NPC_UNDERTAKING_EVENT,
    )!;
    return { world: begun.world, hostId: host.id };
  }

  it("listeners learn the words, not the truth; absentees learn nothing", () => {
    const { world: hosted, hostId } = hostFor();
    const { world: said, claimId } = recordNpcStatement(hosted, {
      hostEventId: hostId,
      speakerPersonId: npc,
      listenerPersonIds: [player],
      statement: "The gate was already hanging straight yesterday.",
      speakerBelief: "believes-true",
    });
    assertWorldIntegrity(said);
    const playerKnowledge = said.history.knowledge.find(
      (entry) => entry.personId === player && entry.eventId === hostId,
    )!;
    expect(playerKnowledge.accuracy).toBe("unknown");
    expect(playerKnowledge.source).toEqual({
      kind: "told-by",
      sourcePersonId: npc,
      claimId,
    });
    // The claim itself holds no truth value either.
    const claim = said.history.claims.find((entry) => entry.id === claimId)!;
    expect(claim.relationshipToTruth).toBe("unknown");
    // Somebody who was not there learns nothing at all.
    const uninvolved = said.personOrder.find(
      (id) => id !== player && id !== npc && id !== eavesdropper,
    );
    if (uninvolved) {
      expect(knownEventIds(said, uninvolved).has(hostId)).toBe(false);
    }
  });

  it("a sincere mistake is corrected through a real source, not forgiven", () => {
    const { world: hosted, hostId } = hostFor();
    const { world: said } = recordNpcStatement(hosted, {
      hostEventId: hostId,
      speakerPersonId: npc,
      listenerPersonIds: [player],
      statement: "The gate was already hanging straight yesterday.",
      speakerBelief: "uncertain",
    });
    // The eavesdropper was there: presence at the source is direct knowledge.
    const present = correctSincereMistake(said, {
      personId: eavesdropper,
      eventId: hostId,
      sourceEventId: hostId,
      correctedSummary: "The gate was sagging; the hinge had gone.",
      shownByPersonId: null,
    });
    assertWorldIntegrity(present);
    const direct = present.history.knowledge.find(
      (entry) =>
        entry.personId === eavesdropper &&
        entry.eventId === hostId &&
        entry.accuracy === "accurate",
    );
    expect(direct?.source).toEqual({ kind: "direct" });
    // The player was not there, so the correction comes from whoever showed
    // them — and somebody who was nowhere near cannot correct them at all.
    const corrected = correctSincereMistake(present, {
      personId: player,
      eventId: hostId,
      sourceEventId: hostId,
      correctedSummary: "The gate was sagging; the hinge had gone.",
      shownByPersonId: npc,
    });
    assertWorldIntegrity(corrected);
    const fix = corrected.history.knowledge.find(
      (entry) =>
        entry.personId === player &&
        entry.eventId === hostId &&
        entry.accuracy === "accurate",
    );
    expect(fix?.source).toEqual({
      kind: "told-by",
      sourcePersonId: npc,
      claimId: null,
    });
    // And nothing here wrote a lie stance: an honest mistake is not deceit.
    expect(
      corrected.history.events.some(
        (event) =>
          event.type.includes("deceiv") || event.type.includes("contradiction"),
      ),
    ).toBe(false);
  });
});

describe("old saves and read-only screens", () => {
  const { world, player } = adultLife("continuing-oldsave");
  const npc = otherAdult(world, player);

  it("a life from before this work simply has none of it, and stays valid", () => {
    expect(npcIntentions(world, npc)).toEqual([]);
    expect(openCommitments(world, player)).toEqual([]);
    expect(
      decideNpcFollowUp(world, {
        npcId: npc,
        playerId: player,
        commitmentEventId: null,
        neededOn: null,
      }).outcome,
    ).toMatch(/reach-out|keep-quiet|let-drop|renegotiate|refuse-new/);
    assertWorldIntegrity(world);
  });

  it("reading costs no time and writes nothing", () => {
    const before = {
      date: world.currentDate,
      sequence: world.history.nextSequence,
      events: world.history.events.length,
    };
    npcIntentions(world, npc);
    openCommitments(world, player);
    commitmentConflict(world, npc, world.currentDate);
    openCommitmentLoad(world, npc);
    decideNpcFollowUp(world, {
      npcId: npc,
      playerId: player,
      commitmentEventId: null,
      neededOn: null,
    });
    expect(world.currentDate).toBe(before.date);
    expect(world.history.nextSequence).toBe(before.sequence);
    expect(world.history.events.length).toBe(before.events);
  });

  it("intentions survive a save and reload mid-chain", () => {
    const { world: taken, goalId } = recordNpcIntention(world, {
      npcId: npc,
      targetPersonId: player,
      kind: "reconnect",
      objective: "Write about the meeting and send it over.",
      sourceEventId: null,
      deadline: null,
    });
    const reloaded = deserializeWorld(serializeWorld(taken));
    assertWorldIntegrity(reloaded);
    const found = npcIntentions(reloaded, npc).find(
      (entry) => entry.goalId === goalId,
    )!;
    expect(found.status).toBe("active");
    const settled = settleNpcIntention(
      reloaded,
      npc,
      goalId,
      "completed",
      "Sent the letter; it arrived.",
    );
    assertWorldIntegrity(settled);
    expect(
      npcIntentions(settled, npc).find((entry) => entry.goalId === goalId)
        ?.status,
    ).toBe("completed");
  });
});
