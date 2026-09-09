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
} from "../simulation/opening-life-content";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

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
