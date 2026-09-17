import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { homePartyChapters } from "../simulation/living-world/party-chapters";
import {
  PEOPLE_TRAITS,
  ensurePeopleTraits,
  peopleTraitId,
  personTrait,
  personTraits,
  recordTraitChange,
  seededTraitValue,
  traitConsiderations,
} from "../simulation/people-traits";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import {
  projectPersonalGoals,
  setPersonalGoalStatus,
  startPersonalGoal,
} from "./people-goals";

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

describe("PEOPLE P2 persistent personality", () => {
  const life = adultLife("people-mind-a");
  const player = life.playerPersonId;

  it("a fresh world carries no trait records and no extra definitions until one is needed", () => {
    expect(
      PEOPLE_TRAITS.some(
        (trait) => life.world.mindCatalog.tendencies[peopleTraitId(trait)],
      ),
    ).toBe(false);
    for (const trait of personTraits(life.world, player)) {
      expect(trait.recordId).toBeNull();
      expect([-2, -1, 0, 1, 2]).toContain(trait.value);
    }
  });

  it("seeds once from the person's own stream and never rerolls", () => {
    const others = life.world.personOrder
      .filter((id) => id !== player)
      .slice(0, 20);
    const written = ensurePeopleTraits(life.world, others);
    const again = ensurePeopleTraits(written, others);
    expect(again).toBe(written);
    for (const personId of others) {
      for (const trait of PEOPLE_TRAITS) {
        const current = personTrait(written, personId, trait);
        expect(current.recordId).not.toBeNull();
        expect(current.value).toBe(
          seededTraitValue(life.world, personId, trait),
        );
      }
    }
    // Twenty people are not all the same person.
    const shapes = new Set(
      others.map((id) =>
        personTraits(written, id)
          .map((trait) => trait.value)
          .join(","),
      ),
    );
    expect(shapes.size).toBeGreaterThan(5);
    // The upgraded world is still a valid production world and survives save.
    assertWorldIntegrity(written);
    expect(serializeWorld(deserializeWorld(serializeWorld(written)))).toBe(
      serializeWorld(written),
    );
  });

  const npc = life.world.personOrder.find(
    (id) =>
      id !== player &&
      life.world.history.events.some((event) =>
        event.involvedEntityIds.includes(id),
      ),
  )!;
  const eventFor = (world: World, personId: EntityId) =>
    [...world.history.events]
      .reverse()
      .find(
        (event) =>
          event.involvedEntityIds.includes(personId) ||
          world.history.knowledge.some(
            (entry) =>
              entry.personId === personId && entry.eventId === event.id,
          ),
      )!;

  it("the played character's temperament is never written for them", () => {
    expect(ensurePeopleTraits(life.world, [player])).toBe(life.world);
    expect(() =>
      recordTraitChange(life.world, {
        personId: player,
        trait: "conflict",
        value: personTrait(life.world, player, "conflict").value === 2 ? -2 : 2,
        eventId: eventFor(life.world, player).id,
        reason: "Test.",
      }),
    ).toThrow(/player-choice/);
  });

  it("changes only through an explicit event, which it cites", () => {
    const event = eventFor(life.world, npc);
    const before = personTrait(life.world, npc, "conflict").value;
    const target = before === 2 ? -2 : 2;
    expect(() =>
      recordTraitChange(life.world, {
        personId: npc,
        trait: "conflict",
        value: target,
        eventId: event.id,
        reason: " ",
      }),
    ).toThrow(/reason/);
    const changed = recordTraitChange(life.world, {
      personId: npc,
      trait: "conflict",
      value: target,
      eventId: event.id,
      reason: "A test reason grounded in a recorded event.",
    });
    const after = personTrait(changed, npc, "conflict");
    expect(after.value).toBe(target);
    const record = changed.history.personalityTendencies.find(
      (entry) => entry.id === after.recordId,
    )!;
    expect(record.provenance.sourceRefs).toEqual([
      { kind: "historical-event", eventId: event.id },
    ]);
    expect(record.supersedesTendencyId).not.toBeNull();
  });

  it("a balanced trait argues for nothing; a leaning one argues for its pole only", () => {
    const event = eventFor(life.world, npc);
    const withLean = recordTraitChange(life.world, {
      personId: npc,
      trait: "sociability",
      value: 2,
      eventId: event.id,
      reason: "Test.",
    });
    const leans = [
      {
        optionKey: "reach-out",
        trait: "sociability" as const,
        pole: "high" as const,
        explanation: "x",
      },
      {
        optionKey: "hold-back",
        trait: "sociability" as const,
        pole: "low" as const,
        explanation: "y",
      },
    ];
    const considerations = traitConsiderations(withLean, npc, "t", leans);
    expect(considerations.map((c) => [c.optionKey, c.importance])).toEqual([
      ["reach-out", "moderate"],
    ]);
    const balanced = recordTraitChange(withLean, {
      personId: npc,
      trait: "sociability",
      value: 0,
      eventId: event.id,
      reason: "Test.",
    });
    expect(traitConsiderations(balanced, npc, "t", leans)).toEqual([]);
  });

  it("contrasting organizers in the same world make different outreach decisions", () => {
    const organizerOf = (world: World): EntityId =>
      homePartyChapters(world)[0]!.organizerPersonId!;
    const organizer = organizerOf(life.world);
    const askedBy = (world: World) =>
      world.history.events.filter(
        (entry) =>
          entry.type === "party.chapter-meeting-invited" &&
          entry.participants.some(
            (p) => p.personId === organizer && p.role === "agency:asked",
          ),
      );
    // Run until this organizer has done something to cite: their first
    // outreach.
    let base = life.world;
    while (askedBy(base).length === 0) {
      base = passOrdinaryDays(base, 1, { stopForTentativeHolds: true });
      expect(base.currentDate < "2027-01-01").toBe(true);
    }
    const event = askedBy(base)[0]!;
    const shaped = (value: -2 | 2) =>
      recordTraitChange(base, {
        personId: organizer,
        trait: "sociability",
        value,
        eventId: event.id,
        reason: "Test contrast.",
      });
    const invitationsBy = (world: World) => {
      let current = world;
      for (let day = 0; day < 240; day += 1) {
        current = passOrdinaryDays(current, 1);
      }
      return askedBy(current).length;
    };
    const outgoing = invitationsBy(shaped(2));
    const reserved = invitationsBy(shaped(-2));
    const again = invitationsBy(shaped(2));
    expect(outgoing).toBe(again);
    expect(outgoing).not.toBe(reserved);
  });
});

describe("PEOPLE P2 private aims", () => {
  const life = adultLife("people-mind-b");
  const player = life.playerPersonId;

  it("offers the four families with honest reasons when nothing fits", () => {
    const view = projectPersonalGoals(life.world, player);
    expect(view.goals).toEqual([]);
    expect(view.choices.map((choice) => choice.family)).toEqual([
      "seek-office",
      "reconnect",
      "adult-relationship",
      "civic-issue",
    ]);
    for (const choice of view.choices) {
      if (choice.targets.length === 0) {
        expect(choice.unavailableReason).toBeTruthy();
      }
    }
  });

  it("setting an aim is private, lists real opportunities, and can be paused and dropped", () => {
    const eventsBefore = life.world.history.events.length;
    const knowledgeBefore = life.world.history.knowledge.length;
    const set = startPersonalGoal(life.world, {
      personId: player,
      family: "seek-office",
      targetEntityId: null,
    });
    // Nothing announced: no event, nobody learns anything.
    expect(set.history.events.length).toBe(eventsBefore);
    expect(set.history.knowledge.length).toBe(knowledgeBefore);
    expect(set.currentMoment).toEqual(life.world.currentMoment);
    const goal = projectPersonalGoals(set, player).goals[0]!;
    expect(goal.status).toBe("active");
    expect(goal.label).toBe("Run for office");
    for (const opportunity of goal.opportunities) {
      expect(opportunity.kind).toBe("file-for-office");
      expect(opportunity.officeKey).toBeTruthy();
    }
    const paused = setPersonalGoalStatus(set, player, goal.goalId, "paused");
    expect(projectPersonalGoals(paused, player).goals[0]!.status).toBe(
      "paused",
    );
    expect(
      projectPersonalGoals(paused, player).goals[0]!.opportunities,
    ).toEqual([]);
    const resumed = startPersonalGoal(paused, {
      personId: player,
      family: "seek-office",
      targetEntityId: null,
    });
    expect(projectPersonalGoals(resumed, player).goals[0]!.status).toBe(
      "active",
    );
    const dropped = setPersonalGoalStatus(
      resumed,
      player,
      goal.goalId,
      "abandoned",
    );
    expect(projectPersonalGoals(dropped, player).goals[0]!.status).toBe(
      "abandoned",
    );
    expect(() =>
      startPersonalGoal(dropped, {
        personId: player,
        family: "seek-office",
        targetEntityId: null,
      }),
    ).toThrow(/closed/);
    const reopened = deserializeWorld(serializeWorld(dropped));
    expect(projectPersonalGoals(reopened, player)).toEqual(
      projectPersonalGoals(dropped, player),
    );
  });

  it("only the controlled character's own aims can be set", () => {
    const other = life.world.personOrder.find((id) => id !== player)!;
    expect(() =>
      startPersonalGoal(life.world, {
        personId: other,
        family: "seek-office",
        targetEntityId: null,
      }),
    ).toThrow();
  });
});
