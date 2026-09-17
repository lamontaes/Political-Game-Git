import { describe, expect, it } from "vitest";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { openedLifeWithAdultChild } from "../../tests/fixtures/people-heir";
import {
  addDays,
  ageOnDate,
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { kinshipRelationshipsAt } from "../simulation/life-queries";
import {
  CONTROL_CONTINUED_EVENT,
  ESTATE_OPENED_EVENT,
  controlledLineage,
  currentGeneration,
} from "../simulation/people-continuation";
import {
  FAMILY_MEMBER_ADDED_EVENT,
  childrenOf,
  recordFamilyAddition,
} from "../simulation/people-family";
import {
  ensurePeopleTraits,
  personTraits,
  seededTraitValue,
} from "../simulation/people-traits";
import { recordPersonDeath } from "../simulation/vitality";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import {
  continueAs,
  observeWorld,
  projectLifeContinuation,
  retireFromPlay,
} from "./people-continuation";
import { projectPersonalGoals, startPersonalGoal } from "./people-goals";

/**
 * PEOPLE P5: playable generations inside one World.
 *
 * The descendants here are added through the supported family-addition
 * command, dated when they were born. That is the fixture's shortcut to
 * adult children; in play the same command records a birth on the day it
 * happens.
 */

function life(seed: string, startAge: number) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge }),
  ).game!;
}

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-");
  return `${Number(y) - years}-${m}-${d === "29" && m === "02" ? "28" : d}` as IsoDate;
}

function die(world: World, personId: EntityId): World {
  return recordPersonDeath(world, {
    stableKey: `test-death:${personId}`,
    personId,
    diedAt: world.currentDate,
    causeKey: "cause:people-fixture",
    sourceEntityIds: [world.id],
    summary: "Died; the cause is not recorded.",
    provenance: { kind: "authored", note: "PEOPLE generation fixture." },
  });
}

/** A strict prefix: nothing earlier was rewritten, only appended to. */
function expectAppendedOnly(before: World, after: World) {
  const keys = [
    "events",
    "knowledge",
    "claims",
    "kinshipRelationships",
    "workRelationships",
    "resourcePositions",
    "goalStates",
    "personalityTendencies",
  ] as const;
  for (const key of keys) {
    const earlier = before.history[key] as readonly unknown[];
    const later = after.history[key] as readonly unknown[];
    expect(later.slice(0, earlier.length)).toEqual(earlier);
  }
}

describe("PEOPLE P5 three generations, two handoffs", () => {
  const start = life("people-gen-a", 62);
  const g1 = start.playerPersonId;

  // Generation 2 and 3, through the supported command.
  const withChild = recordFamilyAddition(start.world, {
    kind: "birth",
    stableKey: "fixture:g2",
    occurredAt: yearsBefore(start.world.currentDate, 36),
    parentPersonIds: [g1],
  });
  const g2 = withChild.childPersonId;
  const withGrandchild = recordFamilyAddition(withChild.world, {
    kind: "birth",
    stableKey: "fixture:g3",
    occurredAt: yearsBefore(start.world.currentDate, 8),
    parentPersonIds: [g2],
  });
  const g3 = withGrandchild.childPersonId;

  // Generation 1 has a private aim and knows things nobody told the family;
  // generation 2 already has a temperament of their own on record.
  const g1Private = startPersonalGoal(
    ensurePeopleTraits(withGrandchild.world, [g1, g2]),
    { personId: g1, family: "seek-office", targetEntityId: null },
  );
  const g1Knowledge = g1Private.history.knowledge
    .filter((entry) => entry.personId === g1)
    .map((entry) => entry.eventId);

  it("family additions are validated, linked and known only to those involved", () => {
    expect(() =>
      recordFamilyAddition(start.world, {
        kind: "birth",
        stableKey: "fixture:too-young",
        occurredAt: yearsBefore(start.world.currentDate, 50),
        parentPersonIds: [g1],
      }),
    ).toThrow(/under 16/);
    expect(() =>
      recordFamilyAddition(start.world, {
        kind: "birth",
        stableKey: "fixture:future",
        occurredAt: addDays(start.world.currentDate, 1),
        parentPersonIds: [g1],
      }),
    ).toThrow(/future/);
    expect(() =>
      recordFamilyAddition(withChild.world, {
        kind: "birth",
        stableKey: "fixture:g2",
        occurredAt: yearsBefore(start.world.currentDate, 36),
        parentPersonIds: [g1],
      }),
    ).toThrow(/already/);
    const world = withGrandchild.world;
    expect(childrenOf(world, g1)).toEqual([g2]);
    expect(childrenOf(world, g2)).toEqual([g3]);
    const g3Kin = kinshipRelationshipsAt(world, g3).map((entry) => entry.kind);
    expect(g3Kin).toContain("lineal:biological-parent-child");
    expect(g3Kin).toContain("lineal:grandparent-grandchild");
    expect(ageOnDate(world.people[g3]!.birthDate, world.currentDate)).toBe(8);
    // Kinship is not a partnership or a household by itself.
    expect(
      world.history.partnerships.some((entry) => entry.personIds.includes(g3)),
    ).toBe(false);
    const added = world.history.events.filter(
      (event) => event.type === FAMILY_MEMBER_ADDED_EVENT,
    );
    expect(added).toHaveLength(2);
    const told = new Set(
      world.history.knowledge
        .filter((entry) => entry.eventId === added[1]!.id)
        .map((entry) => entry.personId),
    );
    expect(told.has(g2)).toBe(true);
    assertWorldIntegrity(world);
  });

  it("an unended life offers nothing; a death offers real family and the record", () => {
    expect(projectLifeContinuation(g1Private, g1)).toBeNull();
    const dead = die(g1Private, g1);
    const view = projectLifeContinuation(dead, g1)!;
    expect(view.ended).toBe("death");
    expect(view.heading).toMatch(/died on/);
    expect(
      view.choices.map((choice) => [choice.personId, choice.relation]),
    ).toEqual([
      [g2, "child"],
      [g3, "grandchild"],
    ]);
    expect(view.choices.every((choice) => choice.availableNow)).toBe(true);
    expect(view.recordPersonId).toBe(g1);
    expect(view.canKeepObserving).toBe(true);
    expect(view.noSuccessorReason).toBeNull();
    // Retiring a dead character is not a thing.
    expect(() => retireFromPlay(dead, g1)).toThrow();
  });

  const dead = die(g1Private, g1);
  const second = continueAs(dead, g1, g2);
  const retired = retireFromPlay(second, g2);
  const third = continueAs(retired, g2, g3);

  it("handoff one: same world, new pointer, nothing private copied", () => {
    expect(second.control).toEqual({ kind: "person", personId: g2 });
    expect(second.currentDate).toBe(dead.currentDate);
    expect(second.seed).toBe(dead.seed);
    expect(second.id).toBe(dead.id);
    expectAppendedOnly(dead, second);
    expect(controlledLineage(second)).toEqual([g1, g2]);
    expect(currentGeneration(second)).toBe(2);
    // The estate is pending; nothing moved.
    const estate = second.history.events.find(
      (event) => event.type === ESTATE_OPENED_EVENT,
    )!;
    expect(estate.tags).toContain("estate.pending-disposition");
    expect(second.history.resourcePositions).toEqual(
      dead.history.resourcePositions,
    );
    // Told of the death; not given g1's knowledge, aims or temperament.
    const g2Knows = new Set(
      second.history.knowledge
        .filter((entry) => entry.personId === g2)
        .map((entry) => entry.eventId),
    );
    const death = second.history.personDeaths.find((d) => d.personId === g1)!;
    expect(g2Knows.has(death.eventId)).toBe(true);
    // Everything g2 newly knows is the death notice and the estate — none of
    // g1's own knowledge came across.
    const before = new Set(dead.history.knowledge.map((entry) => entry.id));
    const gained = second.history.knowledge
      .filter((entry) => entry.personId === g2 && !before.has(entry.id))
      .map((entry) => entry.eventId);
    expect(gained).toEqual([death.eventId, estate.id]);
    const g1Only = g1Knowledge.filter(
      (eventId) =>
        !dead.history.knowledge.some(
          (entry) => entry.personId === g2 && entry.eventId === eventId,
        ),
    );
    expect(g1Only.some((eventId) => gained.includes(eventId))).toBe(false);
    expect(projectPersonalGoals(second, g2).goals).toEqual([]);
    expect(projectPersonalGoals(second, g1).goals).toHaveLength(1);
    // g2 keeps exactly the temperament they had before, from their own
    // stream; the player's character never had one written.
    expect(
      second.history.personalityTendencies.filter((t) => t.personId === g2),
    ).toEqual(
      dead.history.personalityTendencies.filter((t) => t.personId === g2),
    );
    expect(
      g1Private.history.personalityTendencies.some(
        (t) => t.personId === g1 && t.scopeTags.includes("people-mind-v1.seed"),
      ),
    ).toBe(false);
    for (const trait of personTraits(second, g2)) {
      expect(trait.recordId).not.toBeNull();
      expect(trait.value).toBe(seededTraitValue(second, g2, trait.trait));
    }
    // The continuation itself is not a fact anybody in the world learns.
    const handoff = second.history.events.find(
      (event) => event.type === CONTROL_CONTINUED_EVENT,
    )!;
    expect(
      second.history.knowledge.some((entry) => entry.eventId === handoff.id),
    ).toBe(false);
  });

  it("handoff two: retirement is not death, and the grandchild is played", () => {
    expect(
      retired.history.personDeaths.some((death) => death.personId === g2),
    ).toBe(false);
    const view = projectLifeContinuation(retired, g2)!;
    expect(view.ended).toBe("retirement");
    expect(view.heading).toMatch(/goes on living/);
    expect(view.choices.map((choice) => choice.personId)).toContain(g3);
    expect(third.control).toEqual({ kind: "person", personId: g3 });
    expect(controlledLineage(third)).toEqual([g1, g2, g3]);
    expect(currentGeneration(third)).toBe(3);
    expect(third.currentDate).toBe(start.world.currentDate);
    expectAppendedOnly(retired, third);
    // Only one estate: the living retiree left nothing to settle.
    expect(
      third.history.events.filter(
        (event) => event.type === ESTATE_OPENED_EVENT,
      ),
    ).toHaveLength(1);
    // The retiree is simply another person now; their records stand.
    expect(third.history.workRelationships).toEqual(
      retired.history.workRelationships,
    );
  });

  it("all three generations survive save and reload exactly", () => {
    const reopened = deserializeWorld(serializeWorld(third));
    expect(serializeWorld(reopened)).toBe(serializeWorld(third));
    expect(controlledLineage(reopened)).toEqual([g1, g2, g3]);
    const view = projectLifeContinuation(reopened, g2)!;
    expect(view.lineage.map((entry) => entry.personId)).toEqual([g1, g2, g3]);
  });
});

describe("PEOPLE P5 edges", () => {
  it("no heir: nobody is invented, and watching the world is still possible", () => {
    const start = life("people-gen-b", 40);
    const player = start.playerPersonId;
    // This life's only recorded family is a parent, who is older and not a
    // successor in the first scope.
    const dead = die(start.world, player);
    const view = projectLifeContinuation(dead, player)!;
    const peopleBefore = dead.personOrder.length;
    if (view.choices.length === 0) {
      expect(view.noSuccessorReason).toMatch(/no living child/);
    }
    const watching = observeWorld(dead, player);
    expect(watching.control).toEqual({ kind: "observer" });
    expect(watching.personOrder.length).toBe(peopleBefore);
    assertWorldIntegrity(watching);
    expect(() => continueAs(watching, player, player)).toThrow();
  });

  it("a younger child is reached by the disclosed wait, not by aging them on paper", () => {
    const start = life("people-gen-c", 40);
    const player = start.playerPersonId;
    const birth = addDays(yearsBefore(start.world.currentDate, 5), 3);
    const added = recordFamilyAddition(start.world, {
      kind: "birth",
      stableKey: "fixture:young",
      occurredAt: birth,
      parentPersonIds: [player],
    });
    const dead = die(added.world, player);
    const view = projectLifeContinuation(dead, player)!;
    const choice = view.choices.find(
      (c) => c.personId === added.childPersonId,
    )!;
    expect(choice.availableNow).toBe(false);
    expect(choice.waitDisclosure).toMatch(/nobody played/);
    const continued = continueAs(dead, player, added.childPersonId);
    expect(continued.control).toEqual({
      kind: "person",
      personId: added.childPersonId,
    });
    expect(continued.currentDate > dead.currentDate).toBe(true);
    expect(
      ageOnDate(
        continued.people[added.childPersonId]!.birthDate,
        continued.currentDate,
      ),
    ).toBe(5);
  });

  it("a child does not inherit an office", () => {
    const fixture = recordedTermFixture("player");
    const seated = enterSupportedTerm(fixture.world, fixture.personId);
    expect(resolveActiveMemberSeat(seated, fixture.personId).kind).toBe(
      "seated",
    );
    const added = recordFamilyAddition(seated, {
      kind: "birth",
      stableKey: "fixture:office-child",
      occurredAt: yearsBefore(seated.currentDate, 12),
      parentPersonIds: [fixture.personId],
    });
    const dead = die(added.world, fixture.personId);
    const continued = continueAs(dead, fixture.personId, added.childPersonId);
    expect(
      resolveActiveMemberSeat(continued, added.childPersonId).kind,
    ).not.toBe("seated");
    expect(
      continued.history.workRelationships.filter(
        (entry) => entry.personId === added.childPersonId,
      ),
    ).toEqual([]);
    // The seat record itself is untouched; vacancy is the office's own process.
    expect(continued.history.workRelationships).toEqual(
      dead.history.workRelationships,
    );
  });
});

describe("PEOPLE P5 on an opened ordinary life", () => {
  // The player's own open work asks the player for action; after a handoff it
  // must stop asking, or the world cannot be saved (UI46 report).
  const fixture = openedLifeWithAdultChild("people-gen-open", 62);
  const g1 = fixture.playerPersonId;
  const child = { world: fixture.world, childPersonId: fixture.childPersonId };
  const playerWork = (world: World, personId: EntityId) =>
    world.history.workItems.filter((item) => {
      const state = world.history.workItemStates
        .filter((entry) => entry.workItemId === item.id)
        .at(-1);
      return (
        state?.status === "active" &&
        state.playerRequirement !== "none" &&
        state.assignedPersonIds.includes(personId)
      );
    });

  it("the opened life has player-required work to release", () => {
    expect(playerWork(child.world, g1).length).toBeGreaterThan(0);
  });

  it("continuing after retirement leaves a valid, saveable world", () => {
    const retired = retireFromPlay(child.world, g1);
    const next = continueAs(retired, g1, child.childPersonId);
    assertWorldIntegrity(next);
    expect(playerWork(next, g1)).toEqual([]);
    expectAppendedOnly(retired, next);
    // The work is still g1's; only the demand on the player is gone.
    for (const item of playerWork(child.world, g1)) {
      const state = next.history.workItemStates
        .filter((entry) => entry.workItemId === item.id)
        .at(-1)!;
      expect(state.assignedPersonIds).toContain(g1);
      expect(state.status).toBe("active");
    }
    const reopened = deserializeWorld(serializeWorld(next));
    expect(serializeWorld(reopened)).toBe(serializeWorld(next));
  });

  it("keeping on observing after a death leaves a valid, saveable world", () => {
    const watching = observeWorld(die(child.world, g1), g1);
    assertWorldIntegrity(watching);
    expect(playerWork(watching, g1)).toEqual([]);
    const reopened = deserializeWorld(serializeWorld(watching));
    expect(serializeWorld(reopened)).toBe(serializeWorld(watching));
  });

  it("a successor who then opens their own ordinary life is valid too", () => {
    const next = continueAs(
      retireFromPlay(child.world, g1),
      g1,
      child.childPersonId,
    );
    const theirs = openOrdinaryLife(next, child.childPersonId);
    assertWorldIntegrity(theirs);
  });
});
