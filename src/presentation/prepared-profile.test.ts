import { sha256Text } from "./sha256";
import { describe, expect, it } from "vitest";
import fixtureManifest from "../../art/fixtures/valid_character_manifest.json";
import fixtureCatalog from "../../art/fixtures/valid_character_catalog.json";
import {
  computeCharacterGenerationSignature,
  createCharacterComponentLibrary,
  componentsAtGeneration,
  resolveCharacterRecipe,
  type CharacterComponentManifestRecord,
  type CharacterCatalogData,
} from "./character-components";

const original =
  fixtureManifest.assets as unknown as CharacterComponentManifestRecord[];
const catalog = fixtureCatalog as unknown as CharacterCatalogData;
const canonicalSource = JSON.stringify({
  id: "new-authored-rig",
  schema: "modular-body-profile-v1",
});
const profile = { id: "new-authored-rig", sha256: sha256Text(canonicalSource) };
function fixture() {
  const records = original.map((r) => ({
    ...r,
    runtime_release_status: "released" as const,
    generation_status: "approved" as const,
    qa_status: "approved" as const,
  }));
  const added = records
    .filter((r) => r.component)
    .map((r) => ({
      ...r,
      asset_id: `${r.asset_id}-prepared`,
      component: {
        ...r.component!,
        catalog_generation: 2,
        supersedes_asset_id: r.asset_id,
        prepared_profile: profile,
        ...(r.component!.origin
          ? { origin: { ...r.component!.origin, x: 0.51 } }
          : {}),
        ...(r.component!.root
          ? { root: { ...r.component!.root, x: 0.51 } }
          : {}),
      },
    }));
  return {
    records: [...records, ...added],
    added,
    catalog: {
      ...catalog,
      prepared_profiles: [{ ...profile, canonicalSource }],
      catalog_generation: 2,
      generations: [
        ...catalog.generations,
        {
          generation: 2,
          component_ids: added.map((r) => r.asset_id).sort(),
          signature: computeCharacterGenerationSignature(
            added.map((r) => ({
              assetId: r.asset_id,
              definition: r.component,
            })),
          ),
        },
      ],
    },
  };
}
const appearance = {
  seed: "prepared-profile-regression",
  recipeVersion: "appearance-recipe-v2",
  catalogGeneration: 1,
};
describe("explicit prepared rig revisions", () => {
  it("admits recalibrated geometry without changing any historical recipe", () => {
    const f = fixture();
    const before = createCharacterComponentLibrary(
      f.records.filter((r) => !r.asset_id.endsWith("-prepared")),
      catalog,
    );
    const after = createCharacterComponentLibrary(f.records, f.catalog);
    const request = { appearance, poseFamily: "standing-neutral" };
    expect(resolveCharacterRecipe(request, after)).toEqual(
      resolveCharacterRecipe(request, before),
    );
    expect(
      componentsAtGeneration(after, 2).every((c) =>
        c.assetId.endsWith("-prepared"),
      ),
    ).toBe(true);
  });
  it("requires a real profile hash for a geometry-changing revision", () => {
    for (const prepared_profile of [
      undefined,
      { id: "rig", sha256: "unbound" },
      { id: "rig", sha256: "f".repeat(64) },
    ]) {
      const f = fixture();
      const records = f.records.map((r) =>
        r.asset_id.endsWith("-prepared")
          ? { ...r, component: { ...r.component!, prepared_profile } }
          : r,
      );
      expect(() => createCharacterComponentLibrary(records, f.catalog)).toThrow(
        /Invalid (raster revision|prepared profile)/,
      );
    }
  });
  it("a profile never authorizes a different logical identity or pose", () => {
    for (const patch of [
      { layer: 1 },
      { family: "replacement-identity" },
      { compatible_pose_families: ["invented-view"] },
    ]) {
      const f = fixture();
      const target = f.added.find((r) => r.component.kind === "head")!;
      const records = f.records.map((r) =>
        r.asset_id === target.asset_id
          ? { ...r, component: { ...r.component!, ...patch } }
          : r,
      );
      expect(() => createCharacterComponentLibrary(records, f.catalog)).toThrow(
        /Invalid raster revision/,
      );
    }
  });
});

it("rejects an orphan profiled successor before it silently removes hair", () => {
  const f = fixture();
  const records = f.records.filter(
    (r) =>
      !r.asset_id.endsWith("-prepared") || r.component?.kind === "hair-front",
  );
  expect(() => createCharacterComponentLibrary(records, f.catalog)).toThrow(
    /Incomplete prepared kit/,
  );
});
it("rejects changed bytes behind a declared profile hash", () => {
  const f = fixture();
  expect(() =>
    createCharacterComponentLibrary(f.records, {
      ...f.catalog,
      prepared_profiles: [
        { ...profile, canonicalSource: canonicalSource + " " },
      ],
    }),
  ).toThrow(/profile/);
});
