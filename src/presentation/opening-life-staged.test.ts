import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createOpeningLifeController,
  generateOpeningLifeWithProgress,
  prepareOpeningLife,
} from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP, type NewGame } from "./new-game";
import { projectLifeStartStory } from "./life-start-story";

it("retains the Creator's actual staged World and person without rebuilding", () => {
  const seed = "session7-staged-creator";
  const place = drawRandomPlace(seed);
  const fixture = smallWorld({ seed, place: place.key });
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    creatorLifeForks: [],
  };
  const world = {
    ...fixture.world,
    control: { kind: "observer" as const },
    preStartLife: {
      personId: fixture.personId,
      targetStartDate: fixture.world.currentDate,
    },
  };
  const game: NewGame = {
    world,
    playerPersonId: fixture.personId,
    place,
    setup,
  };
  expect(prepareOpeningLife(setup, game).stagedGame).toBe(game);
  expect(
    createOpeningLifeController(setup, game).read().stagedGame?.world,
  ).toBe(world);
  expect(prepareOpeningLife(setup, game).game).toBeNull();
  expect(() => prepareOpeningLife({ ...setup, seed: "other" }, game)).toThrow(
    "recorded identity",
  );
  expect(() =>
    prepareOpeningLife({ ...setup, creatorLifeForks: undefined }, game),
  ).toThrow("recorded identity");
  expect(() =>
    prepareOpeningLife(setup, { ...game, world: fixture.world }),
  ).toThrow("recorded identity");
});

it("surfaces the staged life chapters before institution preparation or final assembly", async () => {
  const seed = "session7-staged-progress";
  const place = drawRandomPlace(seed);
  const fixture = smallWorld({ seed, place: place.key });
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    creatorLifeForks: [],
  };
  const world = {
    ...fixture.world,
    control: { kind: "observer" as const },
    preStartLife: {
      personId: fixture.personId,
      targetStartDate: fixture.world.currentDate,
    },
  };
  const game: NewGame = {
    world,
    playerPersonId: fixture.personId,
    place,
    setup,
  };
  const controller = new AbortController();
  let emitted = 0;
  await expect(
    generateOpeningLifeWithProgress(prepareOpeningLife(setup, game), {
      signal: controller.signal,
      onProgress: (progress) => {
        emitted++;
        expect(progress.label).toBe("Preparing your life");
        expect(progress.world).toBe(world);
        expect(progress.playerPersonId).toBe(fixture.personId);
        const story = projectLifeStartStory(
          progress.world!,
          progress.playerPersonId!,
        );
        expect(
          story?.chapters.some(
            (chapter) =>
              chapter.year ===
              world.people[fixture.personId]!.birthDate.slice(0, 4),
          ),
        ).toBe(true);
      },
      yieldControl: async () => {
        controller.abort();
      },
    }),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(emitted).toBe(1);
});
