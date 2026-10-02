import { describe, expect, it } from "vitest";

import { addDays } from "./dates";
import { createDemoWorld } from "./demo";
import { createWorld, recordWorldEvent } from "./world";
import { stableHash } from "./ids";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
} from "./justice/jail-terms";
import { recordKinship } from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { MIGRATION_MOVED_EVENT } from "./migration/contract";
import { recordPersonDeath } from "./vitality";
import { recordRelationshipInteraction } from "./records";
import { deriveRelationshipSummary } from "./queries";
import { lapseStaleProposals, proposeContact } from "./people-contact";
import { readRelationshipAbsence } from "./relationship-absence";
import {
  describeRelationshipStanding,
  RELATIONSHIP_DIMENSIONS,
  readRelationshipStanding,
} from "./relationship-standing";
import type {
  EntityId,
  EventParticipantRole,
  HistoricalEvent,
  IsoDate,
  Person,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  World,
} from "./types";

/*
 * The acceptance list from DEPTH2 (A03), `relationship-fading-with-absence`:
 * thirty years apart differs from yesterday while the shared history survives;
 * a lifelong friendship and a brief acquaintance do not share one timeout; two
 * people can read the same separation differently; reading a profile changes
 * nothing; a duty persists through absence; a reunion restores warmth without
 * restoring every form of trust or settling a grievance.
 */

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function pairOf(world: World): readonly [EntityId, EntityId] {
  const [first, second] = world.personOrder;
  if (!first || !second) throw new Error("Missing test people.");
  return [first, second];
}

let counter = 0;

function log(
  world: World,
  pair: readonly [EntityId, EntityId],
  kind: RelationshipInteractionKind,
  change: RelationshipChange,
  significance: RelationshipSignificance,
  occurredAt: IsoDate,
): World {
  counter += 1;
  return recordRelationshipInteraction(world, {
    stableKey: `absence-test:${counter}`,
    personIds: [pair[0], pair[1]],
    eventId: null,
    occurredAt,
    kind,
    change,
    significance,
    summary: "Something happened between two people.",
    tags: [],
  });
}

/** A date this many days before the world's current date. */
function daysAgo(world: World, days: number): IsoDate {
  return addDays(world.currentDate, -days);
}

/** A friendship of monthly meetings over `years`, ending `endedDaysAgo`. */
function longFriendship(
  world: World,
  pair: readonly [EntityId, EntityId],
  years: number,
  endedDaysAgo: number,
): World {
  let next = world;
  for (let month = years * 12; month >= 0; month -= 1) {
    next = log(
      next,
      pair,
      month % 6 === 0 ? "care:looked-after" : "experience:shared",
      month % 6 === 0 ? "strengthened" : "maintained",
      "meaningful",
      daysAgo(world, endedDaysAgo + month * 30),
    );
  }
  return next;
}

describe("relationship absence", () => {
  it("reads a busy month away from a lifelong friend as nothing", () => {
    let world = bareWorld("absence-lifelong");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 20, 40);
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).toBe(
      "current",
    );
  });

  it("does not give a lifelong friend and a single meeting one timeout", () => {
    let friends = bareWorld("absence-timeout");
    const friendPair = pairOf(friends);
    friends = longFriendship(friends, friendPair, 20, 3 * 365);

    let acquaintances = bareWorld("absence-timeout");
    const acquaintancePair = pairOf(acquaintances);
    acquaintances = log(
      acquaintances,
      acquaintancePair,
      "experience:shared",
      "formed",
      "meaningful",
      daysAgo(acquaintances, 3 * 365),
    );

    // The same three years apart: dimmed for twenty years of friendship,
    // dormant for one meeting.
    expect(
      readRelationshipAbsence(friends, friendPair[0], friendPair[1]).currency,
    ).toBe("less-current");
    expect(
      readRelationshipAbsence(
        acquaintances,
        acquaintancePair[0],
        acquaintancePair[1],
      ).currency,
    ).toBe("dormant");
  });

  it("lets the one who asked and heard nothing feel a gap the other does not", () => {
    let world = bareWorld("absence-unanswered");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 4, 20);
    const proposed = proposeContact(world, {
      stableKey: "absence-test:unanswered",
      fromPersonId: pair[0],
      toPersonId: pair[1],
      on: addDays(world.currentDate, 3),
      purpose: "Asked to catch up.",
    });
    // The day comes and goes with no answer.
    world = lapseStaleProposals({
      ...proposed.world,
      currentDate: addDays(world.currentDate, 5),
    });
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).toBe(
      "less-current",
    );
    expect(readRelationshipAbsence(world, pair[1], pair[0]).currency).toBe(
      "current",
    );
  });

  it("changes nothing when a card is read, because reading is not contact", () => {
    let world = bareWorld("absence-reading");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 5, 10 * 365);
    const before = readRelationshipAbsence(world, pair[0], pair[1]);
    const sentence = describeRelationshipStanding(
      readRelationshipStanding(world, pair[0], pair[1]),
      "Sam",
    );
    expect(sentence).not.toBeNull();
    // Reading returned a world-free value; the world itself is untouched.
    expect(readRelationshipAbsence(world, pair[0], pair[1])).toEqual(before);
    expect(world.history.relationshipInteractions.length).toBe(5 * 12 + 1);
  });

  it("lets a reunion bring back warmth without restoring reliance or settling a quarrel", () => {
    let world = bareWorld("absence-reunion");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 10, 12 * 365);
    world = log(
      world,
      pair,
      "commitment:promise",
      "strengthened",
      "major",
      daysAgo(world, 12 * 365 - 10),
    );
    world = log(
      world,
      pair,
      "conflict:falling-out",
      "strained",
      "major",
      daysAgo(world, 12 * 365 - 20),
    );
    const apart = readRelationshipStanding(world, pair[0], pair[1]);
    expect(apart.absence.currency).toBe("dormant");
    // Long apart, the quarrel has gone quiet: distance, not estrangement.
    expect(
      deriveRelationshipSummary(world, pair[0], pair[1]).closeness,
    ).not.toBe("estranged");
    const apartSentence = describeRelationshipStanding(apart, "Sam") ?? "";
    expect(apartSentence).toContain("close once");
    expect(apartSentence).toContain("gone quiet");
    expect(apartSentence).toContain("never settled");

    world = log(
      world,
      pair,
      "experience:shared",
      "strengthened",
      "major",
      daysAgo(world, 7),
    );
    const reunited = readRelationshipStanding(world, pair[0], pair[1]);
    expect(reunited.absence.currency).toBe("reconnecting");
    const sentence = describeRelationshipStanding(reunited, "Sam") ?? "";
    // Warmth is back; trust is still what it was when they last knew each
    // other; the quarrel is live again and still unsettled.
    expect(sentence).toContain("glad of Sam's company");
    expect(sentence).not.toContain("would take Sam at their word");
    expect(sentence).toContain("never settled");
    expect(sentence).not.toContain("gone quiet");
    // Contact moved nothing that the old history established.
    for (const dimension of ["trust", "respect", "commitment"] as const) {
      expect(reunited.readings[dimension].band).toBe(
        apart.readings[dimension].band,
      );
    }
  });

  it("keeps trust's evidence through a reunion while it stops being current", () => {
    let world = bareWorld("absence-trust");
    const pair = pairOf(world);
    for (const days of [9 * 365, 9 * 365 - 60, 9 * 365 - 120, 9 * 365 - 180]) {
      world = log(
        world,
        pair,
        "exchange:dealt-fairly",
        "strengthened",
        "major",
        daysAgo(world, days),
      );
    }
    world = log(
      world,
      pair,
      "experience:shared",
      "strengthened",
      "major",
      daysAgo(world, 3),
    );
    const standing = readRelationshipStanding(world, pair[0], pair[1]);
    expect(standing.absence.currency).toBe("reconnecting");
    expect(standing.readings.trust.band).toBe("strong");
    // One friendly evening does not prove reliability in every domain.
    expect(describeRelationshipStanding(standing, "Sam")).toContain(
      "you took Sam at their word, though a good deal may have changed since",
    );
  });

  it("keeps what is owed through any length of absence", () => {
    let world = bareWorld("absence-owed");
    const pair = pairOf(world);
    for (const days of [30 * 365, 30 * 365 - 30, 30 * 365 - 60]) {
      world = log(
        world,
        pair,
        "commitment:promise",
        "strengthened",
        "major",
        daysAgo(world, days),
      );
    }
    const standing = readRelationshipStanding(world, pair[0], pair[1]);
    expect(standing.absence.currency).toBe("dormant");
    expect(standing.readings.commitment.band).not.toBe("none");
    expect(deriveRelationshipSummary(world, pair[0], pair[1]).closeness).toBe(
      "close",
    );
    expect(describeRelationshipStanding(standing, "Sam")).toContain(
      "something owed between you",
    );
  });

  it("never touches the recorded lines, only how current they are", () => {
    let world = bareWorld("absence-lines");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 8, 40);
    const near = readRelationshipStanding(world, pair[0], pair[1]);
    const later = {
      ...world,
      currentDate: addDays(world.currentDate, 25 * 365),
    };
    const far = readRelationshipStanding(later, pair[0], pair[1]);
    expect(far.absence.currency).not.toBe(near.absence.currency);
    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      expect(far.readings[dimension]).toEqual(near.readings[dimension]);
    }
  });

  it("reads a day's conversation and the half hour after it as one day of contact", () => {
    // Independent review: two records on one reunion day used to make the
    // reunion read as ordinary, and restore trust after a single afternoon.
    let world = bareWorld("absence-same-day");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 10, 12 * 365);
    for (const kind of [
      "contact:conversation",
      "contact:time-together",
    ] as const) {
      world = log(
        world,
        pair,
        kind,
        "maintained",
        "meaningful",
        daysAgo(world, 2),
      );
    }
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).toBe(
      "reconnecting",
    );
  });

  it("counts a slight contact as keeping in touch, while it moves nothing", () => {
    let world = bareWorld("absence-slight");
    const pair = pairOf(world);
    world = longFriendship(world, pair, 3, 3 * 365);
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).not.toBe(
      "current",
    );
    const before = readRelationshipStanding(world, pair[0], pair[1]).readings;
    // A run of ordinary chats every month through the last year.
    for (let month = 12; month >= 0; month -= 1) {
      world = log(
        world,
        pair,
        "contact:conversation",
        "maintained",
        "minor",
        daysAgo(world, month * 30 + 1),
      );
    }
    const after = readRelationshipStanding(world, pair[0], pair[1]);
    expect(after.absence.currency).toBe("current");
    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      expect(after.readings[dimension].band).toBe(before[dimension].band);
    }
  });
});

/*
 * A142: time apart with a recorded reason is not neglect, and fading slides
 * with the unexplained days apart. The place one of the pair moves to is
 * drawn from all 56 by seed.
 */
const A142_SEED = "a142-relationship-apart";

function drawnPlaceWorld(): {
  world: World;
  pair: readonly [EntityId, EntityId];
  relativeId: EntityId;
  elsewhereId: EntityId;
  label: string;
} {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const at = parseInt(stableHash(A142_SEED).slice(0, 8), 16) % states.length;
  const elsewhere = stateJurisdictionForKey(states[at]!.jurisdictionKey)!;
  const demo = createDemoWorld(A142_SEED);
  const people = demo.personOrder
    .slice(0, 3)
    .map((id) => demo.people[id] as Person);
  const world = createWorld({
    seed: A142_SEED,
    currentDate: demo.currentDate,
    // The demo's own places stay, since its people's facts cite them.
    jurisdictions: [
      ...demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
      elsewhere,
    ].filter(
      (row, index, all) =>
        all.findIndex((other) => other.id === row.id) === index,
    ),
    people,
  });
  const [first, second, third] = world.personOrder;
  return {
    world,
    pair: [first!, second!],
    relativeId: third!,
    elsewhereId: elsewhere.id,
    label: `${states[at]!.jurisdictionKey}, seed ${A142_SEED}`,
  };
}

function eventFor(
  world: World,
  input: {
    stableKey: string;
    type: HistoricalEvent["type"];
    occurredAt: IsoDate;
    personId: EntityId;
    role: EventParticipantRole;
    tags: string[];
  },
): World {
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[input.personId]!.homeJurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: input.role, detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: input.tags,
    summary: "A recorded event for the absence test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe(`A142: a recorded reason for time apart is not neglect (${A142_SEED})`, () => {
  it("fading slides with the days apart, without a jump", () => {
    const { world: base, pair, label } = drawnPlaceWorld();
    const world = longFriendship(base, pair, 5, 0);
    let previous = 0;
    let largestStep = 0;
    for (let day = 0; day <= 900; day += 1) {
      const later = { ...world, currentDate: addDays(world.currentDate, day) };
      const { fading } = readRelationshipAbsence(later, pair[0], pair[1]);
      expect(fading, label).toBeGreaterThanOrEqual(previous);
      largestStep = Math.max(largestStep, fading - previous);
      previous = fading;
    }
    expect(previous, label).toBe(1);
    // A day apart moves the measure by a small step, never all at once.
    expect(largestStep, label).toBeLessThan(0.01);
  });

  it("reads a jail term as a recorded reason, not neglect", () => {
    const { world: base, pair, label } = drawnPlaceWorld();
    let world = longFriendship(base, pair, 5, 2 * 365 + 10);
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).toBe(
      "dormant",
    );
    world = eventFor(world, {
      stableKey: "a142:sentenced",
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: daysAgo(world, 2 * 365),
      personId: pair[1],
      role: "focus:defendant",
      tags: [`${SENTENCE_KIND_TAG}jail`, `${SENTENCE_MONTHS_TAG}24`],
    });
    const absence = readRelationshipAbsence(world, pair[0], pair[1]);
    expect(
      absence.apartReasons.map((row) => row.kind),
      label,
    ).toEqual(["jailed"]);
    expect(absence.explainedDays, label).toBeGreaterThan(700);
    expect(absence.currency, label).toBe("current");
  });

  it("reads a death in the family as a recorded reason for a quiet spell", () => {
    const { world: base, pair, relativeId, label } = drawnPlaceWorld();
    let world = longFriendship(base, pair, 3, 150);
    // With nothing recorded, five months of silence is longer than usual.
    expect(readRelationshipAbsence(world, pair[0], pair[1]).currency).toBe(
      "less-current",
    );
    world = recordKinship(world, {
      stableKey: "a142:kin",
      personIds: [pair[0], relativeId],
      establishedAt: daysAgo(world, 3000),
      kind: "lineal:parent-child",
      provenance: { kind: "authored", note: "A142 fixture." },
    });
    world = recordPersonDeath(world, {
      stableKey: "a142:death",
      personId: relativeId,
      diedAt: daysAgo(world, 140),
      causeKey: "cause:a142-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "A142 fixture." },
    });
    const absence = readRelationshipAbsence(world, pair[0], pair[1]);
    expect(
      absence.apartReasons.map((row) => row.kind),
      label,
    ).toEqual(["death-in-family"]);
    expect(absence.explainedDays, label).toBe(90);
    expect(absence.currency, label).toBe("current");
  });

  it("reads a move to another place as a recorded reason, while they live apart", () => {
    const { world: base, pair, elsewhereId, label } = drawnPlaceWorld();
    let world = longFriendship(base, pair, 4, 400);
    world = eventFor(world, {
      stableKey: "a142:moved",
      type: MIGRATION_MOVED_EVENT,
      occurredAt: daysAgo(world, 395),
      personId: pair[1],
      role: "agency:mover",
      tags: [],
    });
    // Still in the same place: the move explains nothing.
    expect(
      readRelationshipAbsence(world, pair[0], pair[1]).apartReasons,
    ).toEqual([]);
    world = {
      ...world,
      people: {
        ...world.people,
        [pair[1]]: {
          ...world.people[pair[1]]!,
          homeJurisdictionId: elsewhereId,
        },
      },
    };
    const absence = readRelationshipAbsence(world, pair[0], pair[1]);
    expect(
      absence.apartReasons.map((row) => row.kind),
      label,
    ).toEqual(["moved"]);
    expect(absence.currency, label).toBe("current");
    // The other side reads the same recorded reason.
    expect(readRelationshipAbsence(world, pair[1], pair[0]).currency).toBe(
      "current",
    );
  });
});
