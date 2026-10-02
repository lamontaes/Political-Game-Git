import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createNewGameWorld } from "../presentation/new-game";
import { freshNewGameSetup } from "../presentation/new-game-geography";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import { deserializeWorld, serializeWorld } from "./serialization";
import { monthKeyOf, monthStart, nextMonthKey } from "./macro-economy/store";
import { composeWorldTimeHandlers } from "./campaigns";
import { ageOnDate, daysBetween, makeIsoDate } from "./dates";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { recordKinship } from "./life";
import { recordTraitChange } from "./people-traits";
import { recordMemory } from "./records";
import {
  SPEECH_OF_TAG,
  SPEECH_RECEPTION_EVENT,
  householdmatesOf,
} from "./speech-reception";
import {
  ensureSpeechRetellingSchedule,
  SPEECH_RETELLING_HANDLERS,
  SPEECH_RETELLING_TRANSITION_KEY,
} from "./speech-retelling";
import type { EntityId, World } from "./types";
import { advanceWorld, recordWorldEvent } from "./world";

function fixture(openedWorld?: World) {
  let world =
    openedWorld ??
    smallWorld({
      place: "NH",
      date: "2026-12-15",
      people: 16,
      seed: "a9-three-retellings",
    }).world;
  const isolated = world.personOrder.filter(
    (id) =>
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 5 &&
      householdmatesOf(world, id).length === 0,
  );
  expect(isolated.length).toBeGreaterThanOrEqual(5);
  const [speaker, first, second, third, fourth] = isolated as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  const event = (
    stableKey: string,
    type: `${string}.${string}`,
    tags: readonly string[],
    involvedEntityIds: readonly EntityId[],
  ) => {
    world = recordWorldEvent(world, {
      stableKey,
      type,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[speaker]!.homeJurisdictionId,
      involvedEntityIds,
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags,
      summary: "An authored fixture speech and its reception.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return world.history.events.at(-1)!;
  };
  const speech = event("a9:speech", "speech.given", [], [speaker]);
  event(
    "a9:reception",
    SPEECH_RECEPTION_EVENT,
    [`${SPEECH_OF_TAG}${speech.id}`],
    [speaker, first],
  );
  for (const [a, b] of [
    [first, second],
    [second, third],
    [third, fourth],
  ] as const) {
    world = recordKinship(world, {
      stableKey: `a9:kin:${a}:${b}`,
      personIds: [a, b],
      establishedAt: world.currentDate,
      kind: "collateral:sibling",
      provenance: {
        kind: "authored",
        note: "Fixture isolates a three-link retelling chain.",
      },
    });
  }
  const social = event(
    "a9:social",
    "person.socialized",
    [],
    [first, second, third, fourth],
  );
  for (const id of [first, second, third, fourth]) {
    world = recordTraitChange(world, {
      personId: id,
      trait: "sociability",
      value: 2,
      eventId: social.id,
      reason: "Authored outgoing fixture; no new production trait rule.",
    });
  }
  world = recordMemory(world, {
    stableKey: "a9:original-memory",
    personId: first,
    eventId: speech.id,
    formedAt: world.currentDate,
    rememberedSummary: speech.summary,
    interpretation: "Heard the speech.",
    strength: "defining",
    relevanceTags: ["speech.heard"],
    supersedesMemoryId: null,
  });
  return {
    world: openedWorld ? world : ensureSpeechRetellingSchedule(world),
    speech,
    second,
    third,
    fourth,
  };
}

function advance(world: World, date: string): World {
  return resolveFutureDueItemsThrough(
    world,
    makeIsoDate(date),
    composeFutureTransitionHandlerRegistries(
      createFutureTransitionHandlerRegistry(SPEECH_RETELLING_HANDLERS()),
      composeWorldTimeHandlers(),
    ),
  );
}

describe("A9 monthly speech retelling on the due clock", () => {
  it("crosses three month starts in one advance, recording each link on its own due date", () => {
    const { world, speech, second, third, fourth } = fixture();
    const reached = advance(world, "2027-03-01");
    const heardAt = (id: EntityId) =>
      reached.history.knowledge.find(
        (row) => row.personId === id && row.eventId === speech.id,
      )?.learnedAt;
    expect(heardAt(second)).toBe("2027-01-01");
    expect(heardAt(third)).toBe("2027-02-01");
    expect(heardAt(fourth)).toBe("2027-03-01");
    expect(
      reached.history.futureDueItems
        .filter(
          (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
        )
        .map((item) => item.dueAt),
    ).toEqual(["2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01"]);
    expect(ensureSpeechRetellingSchedule(reached)).toBe(reached);
    const again = advance(reached, "2027-03-01");
    expect(again.history.knowledge).toEqual(reached.history.knowledge);
    expect(again.history.memories).toEqual(reached.history.memories);
    expect(again.history.futureDueItems).toEqual(
      reached.history.futureDueItems,
    );
  }, 30_000);
  // Existing saves without the new due item are a separate CTO compatibility
  // decision. This case proves current Begin and continuation of its saved clock.
  it("current Begin registers the ordinary clock and Save/Continue keeps each month's retelling", () => {
    const seed = "a9-ordinary-begin-retelling";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...freshNewGameSetup(seed),
      placeKey: place.key,
      seed: `${seed}:${place.key}`,
      startKind: "custom",
      startAge: 10,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      worldOpeningVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const openedDue = game.world.history.futureDueItems.filter(
      (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
    );
    expect(openedDue).toHaveLength(1);
    const firstMonth = openedDue[0]!.dueAt;
    const secondMonth = monthStart(nextMonthKey(monthKeyOf(firstMonth)));
    const thirdMonth = monthStart(nextMonthKey(monthKeyOf(secondMonth)));
    const fourthMonth = monthStart(nextMonthKey(monthKeyOf(thirdMonth)));
    // The authored chain writes only speech, kinship, traits and memory. It
    // neither seeds the scheduler nor supplies a speech handler to this route.
    const { world, speech, second, third, fourth } = fixture(game.world);
    const firstPass = advanceWorld(
      world,
      daysBetween(world.currentDate, firstMonth),
    );
    expect(firstPass.currentDate).toBe(firstMonth);
    expect(
      firstPass.history.knowledge.find(
        (row) => row.personId === second && row.eventId === speech.id,
      )?.learnedAt,
    ).toBe(firstMonth);
    const saved = deserializeWorld(serializeWorld(firstPass));
    expect(saved.history.futureDueItems).toEqual(
      firstPass.history.futureDueItems,
    );
    expect(saved.history.knowledge).toEqual(firstPass.history.knowledge);
    expect(saved.history.memories).toEqual(firstPass.history.memories);
    const continued = advanceWorld(
      saved,
      daysBetween(saved.currentDate, thirdMonth),
    );
    expect(continued.currentDate).toBe(thirdMonth);
    for (const [personId, learnedAt] of [
      [second, firstMonth],
      [third, secondMonth],
      [fourth, thirdMonth],
    ] as const) {
      expect(
        continued.history.knowledge.find(
          (row) => row.personId === personId && row.eventId === speech.id,
        )?.learnedAt,
      ).toBe(learnedAt);
    }
    expect(
      continued.history.futureDueItems
        .filter(
          (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
        )
        .map((item) => item.dueAt),
    ).toEqual([firstMonth, secondMonth, thirdMonth, fourthMonth]);
    const repeated = resolveFutureDueItemsThrough(
      deserializeWorld(serializeWorld(continued)),
      continued.currentDate,
      composeWorldTimeHandlers(),
    );
    expect(repeated.history.knowledge).toEqual(continued.history.knowledge);
    expect(repeated.history.memories).toEqual(continued.history.memories);
    expect(repeated.history.futureDueItems).toEqual(
      continued.history.futureDueItems,
    );
  }, 30_000);
});
