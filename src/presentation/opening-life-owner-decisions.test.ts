import { expect, it } from "vitest";
import { eligibleEpisodeBeats } from "../simulation";
import {
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_WITHHELD,
} from "../simulation/opening-life-content";
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
