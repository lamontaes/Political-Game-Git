import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  CHAPTER_OUTREACH_TRANSITION_KEY,
  chapterOutreachTransitionHandler,
  homePartyChapters,
} from "../simulation/living-world/party-chapters";
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
import { declineVenueActivity } from "./scheduled-activity-choice";
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

  it("a legacy opening (age 30, earlier life summarized) is untouched", () => {
    const legacy = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "world46-legacy-a",
        startAge: 30,
        depth: "summarize-earlier-life",
      }),
    ).game!.world;
    expect(
      legacy.history.personalityTendencies.some((record) =>
        record.scopeTags.some((tag) => tag.startsWith("people-mind-v1")),
      ),
    ).toBe(false);
    expect(
      PEOPLE_TRAITS.some(
        (trait) => legacy.mindCatalog.tendencies[peopleTraitId(trait)],
      ),
    ).toBe(false);
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

  it("the dependable end is the high end, and a saved record still means what it says", () => {
    const event = eventFor(life.world, npc);
    // Written as somebody who follows through.
    const dependable = recordTraitChange(life.world, {
      personId: npc,
      trait: "reliability",
      value: 2,
      eventId: event.id,
      reason: "Test.",
    });
    const record = dependable.history.personalityTendencies.at(-1)!;
    expect(record.expressionKey).toBe("dependable");
    expect(personTrait(dependable, npc, "reliability").label).toBe(
      "Follows through",
    );
    // A consumer asking for the high pole gets exactly that person (Q47-004).
    const leans = [
      {
        optionKey: "count-on-them",
        trait: "reliability" as const,
        pole: "high" as const,
        explanation: "They follow through.",
      },
      {
        optionKey: "chase-them",
        trait: "reliability" as const,
        pole: "low" as const,
        explanation: "They let things slip.",
      },
    ];
    expect(
      traitConsiderations(dependable, npc, "t", leans).map((c) => c.optionKey),
    ).toEqual(["count-on-them"]);
    // And the other end is the one that lets things slip.
    const slips = recordTraitChange(dependable, {
      personId: npc,
      trait: "reliability",
      value: -2,
      eventId: event.id,
      reason: "Test.",
    });
    expect(slips.history.personalityTendencies.at(-1)!.expressionKey).toBe(
      "lets-things-slip",
    );
    expect(
      traitConsiderations(slips, npc, "t", leans).map((c) => c.optionKey),
    ).toEqual(["chase-them"]);
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

  it("contrasting organizers make different outreach decisions", () => {
    const organizer = homePartyChapters(life.world)[0]!.organizerPersonId!;
    const askedBy = (world: World) =>
      world.history.events.filter(
        (entry) =>
          entry.type === "party.chapter-meeting-invited" &&
          entry.participants.some(
            (p) => p.personId === organizer && p.role === "agency:asked",
          ),
      );
    // Run only as far as this organizer's first outreach, which is the record
    // a later change of temperament can cite.
    let base = life.world;
    while (askedBy(base).length === 0) {
      base = passOrdinaryDays(base, 1, { stopForTentativeHolds: true });
      expect(base.currentDate < "2027-01-01").toBe(true);
    }
    const event = askedBy(base)[0]!;
    // Turn that first invitation down, so the organizer is deciding whether to
    // ask again rather than waiting on an answer.
    const invited = base.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "tentative" &&
        activity.sourceEntityIds.includes(event.id),
    );
    if (invited) base = declineVenueActivity(base, player, invited.id);
    const shaped = (value: -2 | 2) =>
      recordTraitChange(base, {
        personId: organizer,
        trait: "sociability",
        value,
        eventId: event.id,
        reason: "Test contrast.",
      });
    // The decision itself, asked directly of the world rather than simulated
    // for a year: the same due item, the same day, two temperaments.
    // The one still waiting to be answered, not the one already spent.
    const due = [...base.history.futureDueItems]
      .reverse()
      .find(
        (item) =>
          item.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY &&
          item.entityIds.includes(organizer),
      )!;
    const decide = (world: World) =>
      chapterOutreachTransitionHandler(world, due).reasonKey;
    const outgoing = decide(shaped(2));
    const reserved = decide(shaped(-2));
    expect(outgoing).toBe(decide(shaped(2)));
    expect(outgoing).not.toBe(reserved);
    expect([outgoing, reserved]).toContain(
      "party-chapter:organizer-chose-not-now",
    );
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

describe("PEOPLE P2 aims tell the truth about what they offer", () => {
  function placeLife(placeKey: string, seed: string) {
    return generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed,
        startAge: 34,
      }),
    ).game!;
  }

  it("an aim with nothing under it says why, in the candidacy rules' own words", () => {
    // Ohio has an accepted pack, so the aim is a coherent thing to mean to do.
    // Filing is refused on residence the world has not recorded, and before
    // this the player was shown an empty list with no explanation at all,
    // which is the aim that is offered and then cannot be taken.
    const life = placeLife("state:US-OH", "aims-ohio");
    const set = startPersonalGoal(life.world, {
      personId: life.playerPersonId,
      family: "seek-office",
      targetEntityId: null,
    });
    const goal = projectPersonalGoals(set, life.playerPersonId).goals[0]!;
    expect(goal.opportunities).toEqual([]);
    expect(goal.obstacles.length).toBeGreaterThan(0);
    // Not a restatement: these come back from candidacyEligibility.
    expect(goal.obstacles.join(" ")).toMatch(/residence|record/i);
    // An empty list is never silently empty.
    expect(goal.obstacles.every((line) => line.trim().length > 0)).toBe(true);
  });

  it("an aim that can be acted on carries offers and no obstacles", () => {
    const life = placeLife("kentucky", "aims-kentucky");
    const set = startPersonalGoal(life.world, {
      personId: life.playerPersonId,
      family: "seek-office",
      targetEntityId: null,
    });
    const goal = projectPersonalGoals(set, life.playerPersonId).goals[0]!;
    expect(goal.opportunities.length).toBeGreaterThan(0);
    expect(goal.obstacles).toEqual([]);
  });

  it("never blames the player's age when age is not the reason", () => {
    for (const placeKey of ["kentucky", "state:US-OH", "nebraska"]) {
      const life = placeLife(placeKey, `aims-age-${placeKey}`);
      const choice = projectPersonalGoals(
        life.world,
        life.playerPersonId,
      ).choices.find((entry) => entry.family === "seek-office")!;
      if (choice.unavailableReason) {
        // The character is 34. Age cannot be the reason anywhere here.
        expect(choice.unavailableReason).not.toMatch(/adult|age/i);
      }
    }
  });

  it("no two aim families are offered about the same person", () => {
    for (const placeKey of ["kentucky", "state:US-OH", "nebraska", "alaska"]) {
      const life = placeLife(placeKey, `aims-overlap-${placeKey}`);
      const { choices } = projectPersonalGoals(life.world, life.playerPersonId);
      const seen = new Map<string, string>();
      for (const choice of choices) {
        for (const target of choice.targets) {
          if (target.targetEntityId === null) continue;
          const already = seen.get(target.targetEntityId);
          expect(
            already,
            `${placeKey}: ${target.label} offered under both ${already} and ${choice.family}`,
          ).toBeUndefined();
          seen.set(target.targetEntityId, choice.family);
        }
      }
    }
  });

  it("says contact has lapsed rather than claiming there is nobody", () => {
    // The seeded acquaintances are all out of touch on the first day, so the
    // relationship family offers nothing — but "there is nobody" would be
    // untrue, because there is somebody and the reason is the lapse.
    const life = placeLife("kentucky", "aims-lapsed");
    const { choices } = projectPersonalGoals(life.world, life.playerPersonId);
    const reconnect = choices.find((entry) => entry.family === "reconnect")!;
    const relationship = choices.find(
      (entry) => entry.family === "adult-relationship",
    )!;
    expect(reconnect.targets.length).toBeGreaterThan(0);
    expect(relationship.targets).toEqual([]);
    expect(relationship.unavailableReason).toMatch(/over a year|get back in/i);
    expect(relationship.unavailableReason).not.toMatch(/nobody you have met/i);
  });
});
