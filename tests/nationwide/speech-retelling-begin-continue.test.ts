import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../support/random-place";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { freshNewGameSetup } from "../../src/presentation/new-game-geography";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  monthKeyOf,
  monthStart,
  nextMonthKey,
} from "../../src/simulation/macro-economy/store";
import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { daysBetween } from "../../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../../src/simulation/future-transitions";

import {
  hasSpeechLeftToRetell,
  SPEECH_RETELLING_TRANSITION_KEY,
} from "../../src/simulation/speech-retelling";

import { advanceWorld } from "../../src/simulation/world";
import { fixture } from "../fixtures/speech-retelling-chain";

// CTO Oct 2 07:02: this whole-game proof uses the existing nationwide budget.
// Tighten this one case as the approved game-speed work lands.
describe("A9 public Begin and Save/Continue", () => {
  it("current Begin registers the ordinary clock and Save/Continue keeps each month's retelling", () => {
    const seed = "a9-ordinary-begin-retelling";
    const place = drawRandomPlace(seed);
    const opening = generateOpeningLife(
      prepareOpeningLife({
        ...freshNewGameSetup(seed),
        placeKey: place.key,
        seed: `${seed}:${place.key}`,
        startKind: "custom",
        startAge: 10,
        depth: "play-formative-years",
        startingLife: "ordinary-life",
        worldOpeningVersion: CRUNCH46_WORLD_OPENING_VERSION,
      }),
    );
    expect(opening.game).not.toBeNull();
    if (!opening.game) throw new Error("Public Begin did not create a game.");
    const game = opening.game;
    // Begin alone schedules no retelling: the recorded reception is the cause.
    expect(
      game.world.history.futureDueItems.filter(
        (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
      ),
    ).toHaveLength(0);
    const { world, speech, second, third, fourth } = fixture(game.world);
    const openedDue = world.history.futureDueItems.filter(
      (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
    );
    expect(openedDue).toHaveLength(1);
    const firstMonth = openedDue[0]!.dueAt;
    const secondMonth = monthStart(nextMonthKey(monthKeyOf(firstMonth)));
    const thirdMonth = monthStart(nextMonthKey(monthKeyOf(secondMonth)));
    const fourthMonth = monthStart(nextMonthKey(monthKeyOf(thirdMonth)));
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
    ).toEqual(
      hasSpeechLeftToRetell(continued)
        ? [firstMonth, secondMonth, thirdMonth, fourthMonth]
        : [firstMonth, secondMonth, thirdMonth],
    );
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
    const savedAfterThree = deserializeWorld(serializeWorld(continued));
    expect(savedAfterThree.currentDate).toBe(thirdMonth);
    expect(savedAfterThree.history.futureDueItems).toEqual(
      continued.history.futureDueItems,
    );
    expect(savedAfterThree.history.knowledge).toEqual(
      continued.history.knowledge,
    );
    expect(savedAfterThree.history.memories).toEqual(
      continued.history.memories,
    );
    const afterContinue = advanceWorld(
      savedAfterThree,
      daysBetween(savedAfterThree.currentDate, fourthMonth),
    );
    expect(afterContinue.currentDate).toBe(fourthMonth);
    for (const [personId, learnedAt] of [
      [second, firstMonth],
      [third, secondMonth],
      [fourth, thirdMonth],
    ] as const) {
      const heard = afterContinue.history.knowledge.filter(
        (row) => row.personId === personId && row.eventId === speech.id,
      );
      expect(heard).toHaveLength(1);
      expect(heard[0]!.learnedAt).toBe(learnedAt);
    }
    expect(
      afterContinue.history.futureDueItems
        .filter(
          (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
        )
        .map((item) => item.dueAt),
    ).toEqual([
      ...savedAfterThree.history.futureDueItems
        .filter(
          (item) => item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY,
        )
        .map((item) => item.dueAt),
      ...(savedAfterThree.history.futureDueItems.some(
        (item) =>
          item.transitionKey === SPEECH_RETELLING_TRANSITION_KEY &&
          item.dueAt === fourthMonth,
      ) && hasSpeechLeftToRetell(afterContinue)
        ? [monthStart(nextMonthKey(monthKeyOf(fourthMonth)))]
        : []),
    ]);
  }, 600_000);
});
