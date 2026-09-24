import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  eligibleEpisodeBeats,
  playEpisodeOption,
} from "../simulation";
import {
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_FOLLOWUPS,
  OPENING_LIFE_PREMISE_GATED_KEYS,
  OPENING_SCENE_TIME_WINDOWS,
} from "../simulation/opening-life-content";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

import {
  openNextLifeScene,
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
} from "./life-scene-flow";

describe("every authored opening continuation depends on the saved answer", () => {
  it.each(
    OPENING_LIFE_ADDITIONS.filter(
      (definition) => !OPENING_LIFE_PREMISE_GATED_KEYS.has(definition.key),
    ).map((definition) => [definition.key, definition] as const),
  )(
    "%s preserves positive and negative branches across reload",
    (key, definition) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        startKind: "custom",
        household: "shares-a-home",
        // A child already in school at the youngest age: under the school
        // calendar the "repair6-branches" five-year-old, born after
        // September 1, is still waiting for kindergarten.
        seed: "repair6-branches-a",
        startAge: definition.ages[0],
      });
      // A scene true only at one time of day is played at that time.
      const window = OPENING_SCENE_TIME_WINDOWS[key];
      if (window)
        game.world = advanceWorldMinutes(
          game.world,
          window[0] - game.world.currentMoment.minuteOfDay,
        );
      const { playerPersonId: personId } = game;
      const beats = (world: typeof game.world) =>
        eligibleEpisodeBeats({
          world,
          personId,
          families: OPENING_LIFE_FAMILIES,
        }).beats.filter((beat) => beat.episodeKey === `opening.${key}`);
      const original = serializeWorld(game.world);
      const opening = beats(game.world).find(
        (beat) => beat.stageKey === "moment",
      );
      expect(opening, key).toBeDefined();
      expect(
        beats(game.world).some((beat) => beat.stageKey === "follow-through"),
      ).toBe(false);
      expect(serializeWorld(game.world)).toBe(original);
      const followup = OPENING_LIFE_FOLLOWUPS[key]!;
      for (const choice of definition.choices) {
        const selected = playEpisodeOption(game.world, {
          personId,
          beat: opening!,
          optionKey: choice.key,
          families: OPENING_LIFE_FAMILIES,
        }).world;
        const restored = deserializeWorld(serializeWorld(selected));
        const next = beats(restored).find(
          (beat) => beat.stageKey === "follow-through",
        );
        expect(!!next, choice.key).toBe(choice.key === followup.afterChoice);
        if (next) {
          expect(next.bindings).toEqual(opening!.bindings);
          const results = followup.choices.map(
            (option) =>
              playEpisodeOption(restored, {
                personId,
                beat: next,
                optionKey: option.key,
                families: OPENING_LIFE_FAMILIES,
              }).world,
          );
          expect(serializeWorld(results[0]!)).not.toBe(
            serializeWorld(results[1]!),
          );
          for (const result of results) expect(beats(result)).toHaveLength(0);
        }
      }
    },
  );
});

it("plays the lunchbox continuation through the saved normal scene consumer", () => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    seed: "repair6-lunchbox",
    startAge: 6,
  });
  const personId = game.playerPersonId;
  let world = game.world;
  for (let step = 0; step < OPENING_LIFE_ADDITIONS.length * 2; step++) {
    world = openNextLifeScene(world, personId, "school");
    const scene = currentOpeningLifeScene(world, personId);
    expect(scene).not.toBeNull();
    if (scene!.definition.key !== "early.school.lunchbox-swap") {
      world = chooseOpeningLifeScene(
        world,
        personId,
        scene!.eventId,
        scene!.choices[0]!.key,
      );
      continue;
    }
    expect(scene!.stageKey).toBe("moment");
    const answered = chooseOpeningLifeScene(
      world,
      personId,
      scene!.eventId,
      "make-secret-swap",
    );
    const restored = deserializeWorld(serializeWorld(answered));
    const opened = openNextLifeScene(restored, personId, "school");
    const continuation = currentOpeningLifeScene(opened, personId)!;
    expect(continuation.definition.key).toBe(scene!.definition.key);
    expect(continuation.stageKey).toBe("follow-through");
    expect(continuation.counterpartPersonId).toBe(scene!.counterpartPersonId);
    expect(continuation.eventId).not.toBe(scene!.eventId);
    expect(continuation.prose).toContain("snack");
    expect(continuation.choices.map((choice) => choice.key)).toEqual(
      OPENING_LIFE_FOLLOWUPS[scene!.definition.key]!.choices.map(
        (choice) => choice.key,
      ),
    );
    const bytes = serializeWorld(opened);
    expect(currentOpeningLifeScene(deserializeWorld(bytes), personId)).toEqual(
      continuation,
    );
    expect(openNextLifeScene(opened, personId)).toBe(opened);
    expect(serializeWorld(opened)).toBe(bytes);
    const finished = chooseOpeningLifeScene(
      opened,
      personId,
      continuation.eventId,
      continuation.choices[0]!.key,
    );
    expect(currentOpeningLifeScene(finished, personId)).toBeNull();
    return;
  }
  throw new Error("Lunchbox moment was not reached.");
});

it("does not compile a retired fifteen-minute home activity", () => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    seed: "repair6-retired-quiet-time",
    startAge: 24,
  });
  expect(
    eligibleEpisodeBeats({
      world: game.world,
      personId: game.playerPersonId,
      families: OPENING_LIFE_FAMILIES,
    }).beats.some((beat) => beat.episodeKey === "opening.adult.home.free-time"),
  ).toBe(false);
  expect(OPENING_LIFE_FOLLOWUPS["adult.home.free-time"]).toBeUndefined();
});
