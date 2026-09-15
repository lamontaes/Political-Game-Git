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
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";
// Candidate complete outfits need owner-private prepared bodies, absent from a public checkout.
it.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
  "old descriptors and production bypass initialization; marked candidate replays reproduce",
  () => {
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
    expect(fresh.appearanceOutfitVersion).toBe("complete-outfit-v2");
    expect(worldSeedFor(fresh)).toEqual(worldSeedFor(old));
    expect(prepareCandidateOpeningWorld(world, fresh, "production")).toBe(
      world,
    );
    const replay = decodeReplayDescriptor(encodeReplayDescriptor(fresh))!;
    expect(replay.appearanceOutfitVersion).toBe("complete-outfit-v2");
    expect(
      prepareCandidateOpeningWorld(
        createNewGameWorld(replay).world,
        replay,
        "candidate-review",
      ),
    ).toEqual(
      prepareCandidateOpeningWorld(
        createNewGameWorld(fresh).world,
        fresh,
        "candidate-review",
      ),
    );
  },
);
