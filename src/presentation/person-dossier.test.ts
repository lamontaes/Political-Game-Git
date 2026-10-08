import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { householdIdFor, projectPersonDossier } from "./person-dossier";
import { recordWorldEvent } from "../simulation/world";
import { makeIsoDate } from "../simulation/dates";
import { createStableId } from "../simulation/ids";
import { serializeWorld } from "../simulation/serialization";
import { createLightweightPerson } from "../simulation/people";
import { recordFavor } from "../simulation/favors";
import { householdLocationAt, householdMembershipsAt } from "../simulation";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { createWorkCompensation } from "../simulation/resources";
import type { OccupationFact, World } from "../simulation/types";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

function recordedLife(startAge = 8) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "dossier-record-access",
    startAge,
  });
  return game;
}

describe("a dossier's own recorded history", () => {
  it("shows the person's recorded home and household on their own record and while observing", () => {
    const game = recordedLife();
    const membership = householdMembershipsAt(
      game.world,
      game.playerPersonId,
    )[0];
    expect(membership).toBeDefined();
    const location = householdLocationAt(game.world, membership!.household.id);
    expect(location).toBeDefined();

    for (const world of [
      game.world,
      {
        ...game.world,
        control: { kind: "observer" as const },
      } as World,
    ]) {
      const dossier = projectPersonDossier(
        world,
        game.playerPersonId,
        game.playerPersonId,
      )!;
      const details = dossier.details.map((fact) => fact.text);
      expect(details).toContain(membership!.household.label);
      expect(details).toContain(location!.label);
    }
  });

  it("shows recorded current work and pay only on the person's own record or while observing", () => {
    const game = recordedLife(40);
    const person = game.world.people[game.playerPersonId]!;
    let world = createOrganization(game.world, {
      stableKey: "dossier-current-work:employer",
      formedAt: game.world.currentDate,
      provenance: { kind: "authored", note: "Dossier test employer." },
      initialProfile: {
        name: "Dossier Test Employer",
        classification: "custom:dossier-test-employer",
        locationJurisdictionId: person.homeJurisdictionId,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "dossier-current-work:relationship",
      personId: person.id,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:dossier-test",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Dossier test employment." },
      initialRole: {
        title: "Records clerk",
        occupationClassification: null,
        locationJurisdictionId: person.homeJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: person.homeJurisdictionId,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    world = createWorkCompensation(world, {
      stableKey: "dossier-current-work:pay",
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: { minorUnits: 42_500, currency: "USD" },
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: person.homeJurisdictionId,
      provenance: { kind: "authored", note: "Dossier test pay." },
    });

    const owner = projectPersonDossier(world, person.id, person.id)!;
    expect(owner.details.map((fact) => fact.text)).toContain(
      "Records clerk · Dossier Test Employer",
    );
    expect(owner.details.map((fact) => fact.text)).toContain("$425 weekly");

    const strangerId = world.personOrder.find((id) => id !== person.id)!;
    const stranger = projectPersonDossier(world, strangerId, person.id)!;
    expect(stranger.details.map((fact) => fact.text)).not.toContain(
      "Records clerk · Dossier Test Employer",
    );
    expect(stranger.details.map((fact) => fact.text)).not.toContain(
      "$425 weekly",
    );
  });

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

    expect(full.reminders.map((reminder) => reminder.text)).toEqual([
      expect.stringContaining("carried the groceries home"),
    ]);
    expect(full.reminders[0]?.text).not.toContain("kindness");
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

  it("does not put a board's public meeting in an individual's career when the person is not a participant", () => {
    const game = recordedLife();
    const world = recordWorldEvent(game.world, {
      stableKey: "dossier:unrelated-board-meeting",
      type: "local.town-board-session",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId:
        game.world.people[game.playerPersonId]!.homeJurisdictionId,
      involvedEntityIds: [game.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The town board reviewed the annual budget.",
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
    const dossier = projectPersonDossier(
      world,
      game.playerPersonId,
      game.playerPersonId,
    )!;

    expect(
      dossier.publicCareer.some((entry) => entry.eventId === event.id),
    ).toBe(false);
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

describe("conversation context in a freshly generated world", () => {
  it("describes a housemate as family and gives an observer no player conversation claim", () => {
    const seed = "bg-10-random-new-game";
    const place = observerPlace(seed);
    const opened = openObserverWorld({
      ...observerSetup(seed, place.key),
      household: "shares-a-home",
    });
    const anchor = opened.anchorPersonId;
    const familyGame = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed: `${seed}:family`,
      startAge: 10,
      depth: "summarize-earlier-life",
      household: "shares-a-home",
    });
    const housemateId = familyGame.world.personOrder.find(
      (personId) =>
        personId !== familyGame.playerPersonId &&
        householdIdFor(familyGame.world, personId) ===
          householdIdFor(familyGame.world, familyGame.playerPersonId),
    );
    expect(housemateId, `fresh random place ${place.key}`).toBeDefined();

    const housemateDossier = projectPersonDossier(
      familyGame.world,
      familyGame.playerPersonId,
      housemateId!,
    )!;
    expect(housemateDossier.details.map((detail) => detail.text)).not.toContain(
      "You live in the same household.",
    );
    expect(
      housemateDossier.details.some((detail) =>
        /^(?:They are|He is|She is) your /.test(detail.text),
      ),
    ).toBe(false);

    expect(
      projectPersonDossier(
        familyGame.world,
        familyGame.playerPersonId,
        housemateId!,
      )!.lastInteraction,
    ).toMatch(/^You live together\./);

    const strangerId = opened.world.personOrder.find(
      (personId) => personId !== anchor,
    )!;
    expect(
      projectPersonDossier(opened.world, anchor, strangerId)!.lastInteraction,
    ).toBeNull();
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
