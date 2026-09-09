import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  eligibleEpisodeBeats,
  playEpisodeOption,
  simulationMomentEpochMinute,
} from "../simulation";
import {
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_FOLLOWUPS,
} from "../simulation/opening-life-content";
import { chooseStoryOption } from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

import {
  openNextLifeScene,
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
} from "./life-scene-flow";

describe("every authored opening continuation depends on the saved answer", () => {
  it.each(
    OPENING_LIFE_ADDITIONS.map(
      (definition) => [definition.key, definition] as const,
    ),
  )(
    "%s preserves positive and negative branches across reload",
    (key, definition) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        startKind: "custom",
        household: "shares-a-home",
        seed: "repair6-branches",
        startAge: definition.ages[0],
      });
      if (key === "early.home.bedtime-delay")
        game.world = advanceWorldMinutes(
          game.world,
          19 * 60 - game.world.currentMoment.minuteOfDay,
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

it("charges the story path its disclosed fifteen-minute moment and five-minute continuation", () => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    seed: "repair6-lunchbox",
    startAge: 24,
  });
  let world = game.world;
  const before = simulationMomentEpochMinute(world.currentMoment);
  for (const [stageKey, optionKey, elapsed] of [
    ["moment", "read", 15],
    ["follow-through", "more", 20],
  ] as const) {
    const beat = eligibleEpisodeBeats({
      world,
      personId: game.playerPersonId,
      families: OPENING_LIFE_FAMILIES,
    }).beats.find(
      (candidate) =>
        candidate.episodeKey === "opening.adult.home.free-time" &&
        candidate.stageKey === stageKey,
    )!;
    expect(beat).toBeDefined();
    const selected =
      stageKey === "moment"
        ? optionKey
        : OPENING_LIFE_FOLLOWUPS["adult.home.free-time"]!.choices[0]!.key;
    expect(
      beat.options.find((option) => option.key === selected)!.description,
    ).toBe(`${stageKey === "moment" ? 15 : 5} minutes`);
    world = chooseStoryOption(world, {
      personId: game.playerPersonId,
      scene: {
        kind: "episode",
        beat,
        prose: beat.prose,
        options: beat.options,
        withPeople: beat.bindings.map((binding) => binding.personName),
        presentPeople: [],
      },
      optionKey: selected,
    });
    expect(simulationMomentEpochMinute(world.currentMoment) - before).toBe(
      elapsed,
    );
  }
});
