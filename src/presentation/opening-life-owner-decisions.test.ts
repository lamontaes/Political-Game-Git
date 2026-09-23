import { expect, it } from "vitest";
import { eligibleEpisodeBeats } from "../simulation";
import {
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_WITHHELD,
  isOptionalOpeningActivity,
} from "../simulation/opening-life-content";
import { projectStoryMoment } from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

// Owner decisions recorded by ChatGPT's dialogue review of 2026-09-23.

it("never offers the withdrawn blue-crayon scene, at any stage", () => {
  const key = "early.school.crayon-sharing";
  expect(OPENING_LIFE_WITHHELD[key]).toBeDefined();
  const scene = OPENING_LIFE_ADDITIONS.find((entry) => entry.key === key)!;
  const family = OPENING_LIFE_FAMILIES.find(
    (entry) => entry.key === `opening.${key}`,
  )!;
  for (const stage of family.stages)
    expect(
      stage.requires.map((r) => r.kind),
      stage.key,
    ).toContain("withheld");
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    seed: "crayon-withdrawn",
    startAge: scene.ages[0],
  });
  const offered = eligibleEpisodeBeats({
    world: game.world,
    personId: game.playerPersonId,
    families: OPENING_LIFE_FAMILIES,
  }).beats.map((beat) => beat.episodeKey);
  // Other school scenes are offered to the same child, so the absence is not
  // because nothing is.
  expect(
    offered.some((entry) => entry.startsWith("opening.early.school.")),
  ).toBe(true);
  expect(offered).not.toContain(`opening.${key}`);
});

it("leaves an instant choice unlabeled and keeps the time on one that takes it", () => {
  const descriptions = OPENING_LIFE_FAMILIES.flatMap((family) =>
    family.stages.flatMap((stage) => stage.options.map((o) => o.description)),
  );
  expect(descriptions).not.toContain("No time passes");
  expect(descriptions).toContain("");
  expect(descriptions.some((d) => /^\d+ minutes$/.test(d))).toBe(true);
});

it("offers free time beside the moment and never as the moment itself", () => {
  let offered = 0;
  for (const [seed, startAge] of [
    ["free-time-child", 7],
    ["free-time-teen", 13],
    ["free-time-adult", 30],
  ] as const) {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      household: "shares-a-home",
      seed,
      startAge,
    });
    const moment = projectStoryMoment(game.world, game.playerPersonId);
    if (moment.freeTime) {
      offered += 1;
      expect(isOptionalOpeningActivity(moment.freeTime.beat.episodeKey)).toBe(
        true,
      );
    }
    if (moment.scene?.kind === "episode")
      expect(isOptionalOpeningActivity(moment.scene.beat.episodeKey)).toBe(
        false,
      );
  }
  expect(offered).toBeGreaterThan(0);
});
