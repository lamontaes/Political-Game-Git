import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectPersonDossier } from "./person-dossier";
import { recordWorldEvent } from "../simulation/world";
import { makeIsoDate } from "../simulation/dates";
import { createStableId } from "../simulation/ids";
import { serializeWorld } from "../simulation/serialization";
import { createLightweightPerson } from "../simulation/people";
import { recordFavor } from "../simulation/favors";
import type { OccupationFact, World } from "../simulation/types";

function recordedLife() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "dossier-record-access",
    startAge: 8,
  });
  return game;
}

describe("a dossier's own recorded history", () => {
  it("shows only recorded, player-known reminders according to the notes setting", () => {
    const game = recordedLife();
    const otherPersonId = game.world.personOrder.find(
      (personId) => personId !== game.playerPersonId,
    )!;
    const sourceEventId = game.world.history.events[0]!.id;
    const world = recordFavor(game.world, {
      stableKey: "dossier:known-favor",
      giverPersonId: otherPersonId,
      receiverPersonId: game.playerPersonId,
      kind: "personal:help",
      description: "carried the groceries home",
      givenAt: game.world.currentDate,
      eventId: sourceEventId,
      subject: { kind: "none" },
      motive: "kindness",
      weight: "great",
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: null,
      undertakingId: null,
    });
    const full = projectPersonDossier(
      world,
      game.playerPersonId,
      otherPersonId,
    )!;
    const none = projectPersonDossier(
      { ...world, playSettings: { ...world.playSettings!, notes: "none" } },
      game.playerPersonId,
      otherPersonId,
    )!;

    expect(full.reminders.map((reminder) => reminder.text)).toEqual([
      expect.stringContaining("carried the groceries home"),
    ]);
    expect(full.reminders[0]?.text).not.toContain("kindness");
    expect(none.reminders).toEqual([]);
  });

  it("shows public votes involving the person, even when they are not a tenure focus", () => {
    const game = recordedLife();
    const world = recordWorldEvent(game.world, {
      stableKey: "dossier:public-vote",
      type: "local.council-vote",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId:
        game.world.people[game.playerPersonId]!.homeJurisdictionId,
      involvedEntityIds: [game.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The council adopted ORD 12 by a vote of 4 to 2.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const before = serializeWorld(world);
    const dossier = projectPersonDossier(
      world,
      game.playerPersonId,
      game.playerPersonId,
    )!;
    const event = world.history.events.at(-1)!;
    expect(
      dossier.publicCareer.find((entry) => entry.eventId === event.id)?.summary,
    ).toBe(event.summary);
    expect(serializeWorld(world)).toBe(before);
  });

  it("withholds private events from the public record", () => {
    const game = recordedLife();
    const world = recordWorldEvent(game.world, {
      stableKey: "dossier:private-event",
      type: "life.private-conversation",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [game.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "A private conversation about household savings.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(
      projectPersonDossier(
        world,
        game.playerPersonId,
        game.playerPersonId,
      )!.publicCareer.some((entry) =>
        entry.summary.includes("household savings"),
      ),
    ).toBe(false);
  });
});

describe("another person's biography access", () => {
  it("requires a public record available today before showing an occupation", () => {
    const game = recordedLife();
    const person = createLightweightPerson({
      worldId: game.world.id,
      worldSeed: game.world.seed,
      index: 900001,
      currentDate: game.world.currentDate,
      homeJurisdictionId:
        game.world.people[game.playerPersonId]!.homeJurisdictionId,
    });
    let world: World = {
      ...game.world,
      people: { ...game.world.people, [person.id]: person },
    };
    world = recordWorldEvent(world, {
      stableKey: "dossier:recorded-employment",
      type: "work.hired",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: [person.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The library hired a records clerk.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1)!;
    const fact: OccupationFact = {
      id: createStableId("fact", "dossier-test-occupation"),
      stableKey: "dossier-test-occupation",
      kind: "occupation",
      occurredAt: event.occurredAt,
      jurisdictionId: person.homeJurisdictionId,
      summary: event.summary,
      provenance: {
        method: "simulated-event",
        sourceEventId: event.id,
        note: null,
      },
      employer: "Town Library",
      title: "Records clerk",
      endedAt: null,
      status: "ongoing",
      subjectIds: [],
    };
    world = {
      ...world,
      people: {
        ...world.people,
        [person.id]: {
          ...person,
          establishedFacts: [...person.establishedFacts, fact],
        },
      },
    };
    const occupation = (candidate: World) =>
      projectPersonDossier(
        candidate,
        game.playerPersonId,
        person.id,
      )!.details.find((entry) => entry.key === `fact-${fact.id}`);
    expect(occupation(world)).toMatchObject({ attribution: "record" });
    const privateWorld = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((entry) =>
          entry.id === event.id
            ? { ...entry, visibility: "private" as const }
            : entry,
        ),
      },
    };
    expect(occupation(privateWorld)).toBeUndefined();
    const futureRecord = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((entry) =>
          entry.id === event.id
            ? { ...entry, recordedAt: makeIsoDate("9999-01-01") }
            : entry,
        ),
      },
    };
    expect(occupation(futureRecord)).toBeUndefined();
    expect(
      occupation({
        ...world,
        people: {
          ...world.people,
          [person.id]: {
            ...world.people[person.id]!,
            establishedFacts: [
              {
                ...fact,
                provenance: { ...fact.provenance, sourceEventId: null },
              },
            ],
          },
        },
      }),
    ).toBeUndefined();
  });
});
