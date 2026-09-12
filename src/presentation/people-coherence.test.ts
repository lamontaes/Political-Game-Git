import { describe, expect, it } from "vitest";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY as library,
  PEOPLE_VISUAL4_RECORDS,
} from "./people-visual4-review";
import {
  componentsAtGeneration,
  createCharacterComponentLibrary,
  resolveCharacterRecipe,
  type CharacterComponentManifestRecord,
} from "./character-components";
import { setupForArtPreview } from "./art-preview";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import {
  encodeReplayDescriptor,
  decodeReplayDescriptor,
  worldSeedFor,
} from "./new-game-identity";
import revisions from "../../art/manifest/character_candidate_coherence_registry.json";
import { deserializeWorld } from "../simulation/serialization";
import oldPinned from "./fixtures/morning23-old-gen2.json";
import oldUnpinned from "./fixtures/morning23-old-unpinned.json";

const families = (g: number) =>
  componentsAtGeneration(library, g)
    .map((c) => c.definition.family)
    .sort();
const recipe = (
  appearance: Parameters<typeof resolveCharacterRecipe>[0]["appearance"],
) =>
  resolveCharacterRecipe(
    { appearance, poseFamily: "standing-neutral" },
    library,
  );
describe("raster-only candidate revision", () => {
  it("keeps the same logical choices and uses revisions only from generation3", () => {
    expect(families(3)).toEqual(families(2));
    for (const r of revisions.assets) {
      expect(
        componentsAtGeneration(library, 2).some(
          (c) => c.assetId === r.asset_id,
        ),
      ).toBe(false);
      expect(
        componentsAtGeneration(library, 2).some(
          (c) => c.assetId === r.candidate_component.supersedes_asset_id,
        ),
      ).toBe(true);
      expect(
        componentsAtGeneration(library, 3).some(
          (c) => c.assetId === r.asset_id,
        ),
      ).toBe(true);
      expect(
        componentsAtGeneration(library, 3).some(
          (c) => c.assetId === r.candidate_component.supersedes_asset_id,
        ),
      ).toBe(false);
    }
  });
  it.each([oldPinned, oldUnpinned])(
    "keeps all donor recipes exact",
    (fixture) => {
      const world = deserializeWorld(fixture.payload);
      for (const expected of fixture.recipes)
        expect(recipe(world.people[expected.personId]!.appearance!)).toEqual(
          expected.recipe,
        );
    },
  );
  it("preserves every family choice and body/head/hair for a disclosed sequence of 48 new identities", () => {
    for (let i = 0; i < 48; i++) {
      const appearance = {
        seed: `coherence-normal-${i}`,
        recipeVersion: "appearance-recipe-v2",
        catalogGeneration: 2,
      };
      const old = recipe(appearance),
        newer = recipe({ ...appearance, catalogGeneration: 3 });
      expect(newer.identity).toEqual(old.identity);
      for (const p of old.context.components) {
        const next = newer.context.components.find(
          (c) => c.slotId === p.slotId && c.kind === p.kind,
        )!;
        expect(next.family).toBe(p.family);
        expect(next.assetId).toBe(
          revisions.assets.find(
            (r) => r.candidate_component.supersedes_asset_id === p.assetId,
          )?.asset_id ?? p.assetId,
        );
      }
    }
  });
  it("refuses revisions that change anatomy, pose, attachment or identity; unreleased revisions do not displace originals", () => {
    const records: CharacterComponentManifestRecord[] =
      PEOPLE_VISUAL4_RECORDS.filter((r) =>
        library.components.has(r.asset_id),
      ).map((r) => ({
        ...r,
        asset_type: "character-component",
        candidate_component: undefined,
        component: library.components.get(r.asset_id)!.definition,
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
      }));
    const catalog = {
      catalog_generation: library.catalogGeneration,
      slots: library.slots,
      generations: library.generations,
    };
    const id = revisions.assets[0]!.asset_id;
    for (const patch of [
      { family: "another-person" },
      { origin: { x: 0.2, y: 0.2 } },
      { compatible_pose_families: ["seated-guest-neutral"] },
      { catalog_generation: 1 },
      { supersedes_asset_id: "missing" },
    ]) {
      expect(() =>
        createCharacterComponentLibrary(
          records.map((r) =>
            r.asset_id === id
              ? { ...r, component: { ...r.component!, ...patch } }
              : r,
          ),
          catalog,
        ),
      ).toThrow("Invalid raster revision");
    }
    const unreleased = createCharacterComponentLibrary(
      records.map((r) =>
        r.asset_id === id ? { ...r, runtime_release_status: "unreleased" } : r,
      ),
      catalog,
    );
    expect(
      componentsAtGeneration(unreleased, 3).some((c) => c.assetId === id),
    ).toBe(false);
    expect(
      componentsAtGeneration(unreleased, 3).some(
        (c) =>
          c.assetId ===
          revisions.assets[0]!.candidate_component.supersedes_asset_id,
      ),
    ).toBe(true);
  });
});
describe("explicit new-life review lineage", () => {
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "coherence-replay",
    startAge: 34,
  };
  it("ordinary and historical setup defaults remain unchanged", () => {
    expect(setupForArtPreview(setup, "production")).toBe(setup);
    const old = { ...setup, appearanceRecipeVersion: undefined };
    expect(setupForArtPreview(old, "candidate-review")).toBe(old);
    const pinned = { ...setup, appearanceCatalogGeneration: 2 };
    expect(setupForArtPreview(pinned, "candidate-review")).toBe(pinned);
  });
  it("pins a new preview and replays that exact creation lineage without changing world identity", () => {
    const reviewed = setupForArtPreview(setup, "candidate-review");
    expect(reviewed.appearanceCatalogGeneration).toBe(
      library.catalogGeneration,
    );
    expect(worldSeedFor(reviewed)).toBe(worldSeedFor(setup));
    const decoded = decodeReplayDescriptor(encodeReplayDescriptor(reviewed))!;
    expect(decoded.appearanceCatalogGeneration).toBe(library.catalogGeneration);
    const game = createNewGameWorld(decoded);
    for (const p of Object.values(game.world.people))
      expect(p.appearance!.catalogGeneration).toBe(library.catalogGeneration);
    const old = decodeReplayDescriptor(encodeReplayDescriptor(setup))!;
    expect(old.appearanceCatalogGeneration).toBeUndefined();
  });
});
