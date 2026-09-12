import { describe, expect, it, vi } from "vitest";
import { createDemoWorld } from "../src/simulation/demo";
import {
  planLifeScenePeople,
  type LifeSceneWardrobeOptions,
} from "../src/presentation/life-scene-people";
import { DOMESTIC_CANONICAL_SCENE_ID } from "../src/presentation/scene-registry";
import { composeSceneCharacter } from "../src/presentation/scene-composition";
import type { CharacterWardrobeContext } from "../src/presentation/character-components";
import type * as VisualIntegration from "../src/presentation/visual-integration";
import type * as SceneRegistry from "../src/presentation/scene-registry";

// Isolate the planning seam from unreleased production art and scene calibration.
// Saved preference validation still uses the real typed adapter and fixture catalog.
vi.mock("../src/presentation/visual-integration", async (importOriginal) => {
  const actual = await importOriginal<typeof VisualIntegration>();
  const { createCharacterComponentLibrary } =
    await import("../src/presentation/character-components");
  const manifest =
    await import("../art/fixtures/valid_character_manifest.json");
  const catalog = await import("../art/fixtures/valid_character_catalog.json");
  return {
    ...actual,
    PRODUCTION_CHARACTER_LIBRARY: createCharacterComponentLibrary(
      manifest.assets as unknown as Parameters<
        typeof createCharacterComponentLibrary
      >[0],
      catalog.default as Parameters<typeof createCharacterComponentLibrary>[1],
    ),
  };
});

vi.mock("../src/presentation/scene-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof SceneRegistry>();
  const scenes = new Map(actual.SCENE_REGISTRY.scenes);
  const scene = scenes.get(actual.DOMESTIC_CANONICAL_SCENE_ID)!;
  scenes.set(scene.sceneId, {
    ...scene,
    floorCalibration: {
      near: { floor_y_percent: 90, scale: 1 },
      far: { floor_y_percent: 50, scale: 0.7 },
    },
    standardBodyWidthPercent: 12,
  });
  return { ...actual, SCENE_REGISTRY: { ...actual.SCENE_REGISTRY, scenes } };
});

vi.mock("../src/presentation/scene-composition", () => ({
  composeSceneCharacter: vi.fn((request) => ({
    complete: true,
    recipe: { context: { poseFamily: "standing-neutral" } },
    /*
     * `SceneCharacterPresentation` always carries these, empty when the
     * composition is clean, and the planner now reads them on every path
     * rather than only on the way to refusing — a figure that drew against an
     * uncalibrated room was reporting an unqualified success. This double left
     * them off, which a `vi.mock` factory is not type-checked against, so it
     * modelled a shape the real compositor cannot produce.
     */
    poseGaps: [],
    diagnostics: [],
    layers: [
      {
        assetId: "planning-seam-layer",
        url: request.wardrobe?.families.top?.[0] ?? "seeded-top",
        leftPercent: 1,
        topPercent: 2,
        widthPercent: 3,
        heightPercent: 4,
      },
    ],
  })),
}));

function fixture() {
  const original = createDemoWorld();
  const ids = original.personOrder.slice(0, 4);
  const world = {
    ...original,
    people: {
      ...original.people,
      ...Object.fromEntries(
        ids.map((id) => [
          id,
          {
            ...original.people[id]!,
            appearance: {
              ...original.people[id]!.appearance!,
              catalogGeneration: 1,
              selection: {
                bodyFamily: "adult-medium",
                headFamily: "round",
                hairFamily: null,
              },
            },
          },
        ]),
      ),
    },
  };
  const present = ids.map((id) => ({
    personId: id,
    name: id,
    relationship: null,
    introduction: id,
  }));
  return { world, present, ids };
}

describe("saved wardrobe at the scene planning seam", () => {
  it("renders distinct validated preferences, isolates one refusal, and keeps the global fallback", () => {
    const { world, present, ids } = fixture();
    const global: CharacterWardrobeContext = {
      id: "legacy-global",
      families: { top: ["legacy-top"] },
    };
    const before = JSON.stringify(world);
    vi.mocked(composeSceneCharacter).mockClear();
    const result = planLifeScenePeople(
      world,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
      global,
      {
        wardrobeByPersonId: {
          [ids[0]!]: { personId: ids[0]!, families: { top: "tee-grey" } },
          [ids[1]!]: { personId: ids[1]!, families: { top: "blazer-navy" } },
          [ids[2]!]: { personId: ids[2]!, families: { top: "missing-top" } },
        },
      },
    );
    const byId = new Map(result.map((person) => [person.personId, person]));
    expect(byId.get(ids[0]!)?.layers[0]?.url).toBe("tee-grey");
    expect(byId.get(ids[1]!)?.layers[0]?.url).toBe("blazer-navy");
    expect(byId.get(ids[2]!)?.wardrobeRefusal).toContain("missing-top");
    expect(byId.get(ids[2]!)?.hasArt).toBe(false);
    expect(byId.get(ids[2]!)?.layers).toEqual([]);
    expect(byId.get(ids[3]!)?.layers[0]?.url).toBe("legacy-top");
    for (const id of [ids[0]!, ids[1]!, ids[3]!])
      expect(byId.get(id)).not.toHaveProperty("wardrobeRefusal");
    expect(
      vi
        .mocked(composeSceneCharacter)
        .mock.calls.some(
          ([request]) =>
            request.personId === ids[2] && request.wardrobe !== undefined,
        ),
    ).toBe(false);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("uses the caller's catalog-aware resolver and refuses mismatched canonical ownership first", () => {
    const { world, present, ids } = fixture();
    const resolver = vi.fn<
      NonNullable<LifeSceneWardrobeOptions["resolveWardrobe"]>
    >(() => ({
      id: "supplied-catalog",
      families: { top: ["caller-top"] },
    }));
    const result = planLifeScenePeople(
      world,
      present.slice(0, 2),
      DOMESTIC_CANONICAL_SCENE_ID,
      undefined,
      {
        wardrobeByPersonId: {
          [ids[0]!]: { personId: ids[0]!, families: {} },
          [ids[1]!]: { personId: ids[0]!, families: {} },
        },
        resolveWardrobe: resolver,
      },
    );
    expect(resolver).toHaveBeenCalledOnce();
    expect(resolver.mock.calls[0]?.[0]).toBe(world.people[ids[0]!]);
    expect(
      result.find((person) => person.personId === ids[0])?.layers[0]?.url,
    ).toBe("caller-top");
    expect(
      result.find((person) => person.personId === ids[1])?.wardrobeRefusal,
    ).toContain("canonical person");
  });
});
