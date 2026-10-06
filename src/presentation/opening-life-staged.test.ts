import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createOpeningLifeController,
  generateOpeningLifeWithProgress,
  advancePreStartHistory,
  prepareOpeningLife,
} from "./opening-life";
import {
  DEFAULT_NEW_GAME_SETUP,
  type NewGame,
  createPreStartNewGameWorld,
  applyPreStartCreatorLifeForks,
  finishPreStartNewGameWorld,
} from "./new-game";
import { addDays } from "../simulation/dates";
import { projectCreatorLifeForkMoments } from "../simulation/creator-life-forks";
import { serializeWorld, deserializeWorld } from "../simulation";
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

it(
  "consumes recorded choices once on the same staged life through Begin and save/reload",
  { timeout: 60000 },
  async () => {
    const seed = "session7-staged-begin-save";
    const place = drawRandomPlace(seed);
    const target = place.context.initialMoment.date;
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 38,
      creatorLifeForks: [],
    };
    const checkpoints: string[] = [];
    const game = createPreStartNewGameWorld(
      setup,
      addDays(target, -1),
      (world, personId) => {
        checkpoints.push(world.id);
        expect(world.preStartLife?.personId).toBe(personId);
        expect(world.currentDate).toBe(addDays(target, -1));
      },
    );
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.every((id) => id === game.world.id)).toBe(true);
    const choices = projectCreatorLifeForkMoments(
      game.world,
      game.playerPersonId,
    ).map((moment) => ({ forkKey: moment.key, optionKey: "pursue" }));
    expect(choices.length).toBeGreaterThan(0);
    const answered = applyPreStartCreatorLifeForks(game, choices);
    expect(applyPreStartCreatorLifeForks(answered, choices).world).toBe(
      answered.world,
    );
    expect(answered.world.currentMoment).toBe(game.world.currentMoment);
    expect(answered.playerPersonId).toBe(game.playerPersonId);
    expect(prepareOpeningLife(answered.setup, answered).stagedGame).toBe(
      answered,
    );
    const advanced = await advancePreStartHistory(
      answered.world,
      answered.playerPersonId,
      { yieldControl: async () => {} },
    );
    const finished = finishPreStartNewGameWorld({
      ...answered,
      world: advanced,
    });
    expect(finished.world.id).toBe(game.world.id);
    expect(finished.world.history).toBe(advanced.history);
    expect(finished.playerPersonId).toBe(game.playerPersonId);
    const restored = deserializeWorld(serializeWorld(finished.world));
    expect(restored.id).toBe(game.world.id);
    expect(restored.currentMoment).toEqual(finished.world.currentMoment);
    expect(restored.control).toEqual({
      kind: "person",
      personId: game.playerPersonId,
    });
    const decisions = (world: typeof restored) =>
      world.history.decisionTraces.filter(
        (trace) => trace.context.decisionType === "people.creator-life-fork",
      );
    expect(decisions(restored)).toEqual(decisions(answered.world));
    expect(decisions(restored)).toHaveLength(choices.length);
  },
);

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
