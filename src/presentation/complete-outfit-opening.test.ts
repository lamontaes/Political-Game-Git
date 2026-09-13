import { it, expect } from "vitest";
import {
  prepareCandidateOpeningWorld,
  setupForArtPreview,
} from "./art-preview";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  encodeReplayDescriptor,
  decodeReplayDescriptor,
  worldSeedFor,
} from "./new-game-identity";
it("old descriptors and production bypass initialization; marked candidate replays reproduce", () => {
  const old = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "p29-replay",
    startAge: 34,
    appearanceCatalogGeneration: 4,
  };
  const world = createNewGameWorld(old).world;
  expect(prepareCandidateOpeningWorld(world, old, "candidate-review")).toBe(
    world,
  );
  const fresh = setupForArtPreview(
    { ...old, appearanceCatalogGeneration: undefined },
    "candidate-review",
  );
  expect(fresh.appearanceOutfitVersion).toBe("complete-outfit-v1");
  expect(worldSeedFor(fresh)).toEqual(worldSeedFor(old));
  expect(prepareCandidateOpeningWorld(world, fresh, "production")).toBe(world);
  const replay = decodeReplayDescriptor(encodeReplayDescriptor(fresh))!;
  expect(replay.appearanceOutfitVersion).toBe("complete-outfit-v1");
  expect(
    prepareCandidateOpeningWorld(
      createNewGameWorld(replay).world,
      replay,
      "candidate-review",
    ),
  ).toEqual(prepareCandidateOpeningWorld(world, fresh, "candidate-review"));
});
