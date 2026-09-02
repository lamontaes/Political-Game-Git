import { describe, expect, it } from "vitest";

import fixtureCatalog from "../../art/fixtures/valid_character_catalog.json";
import fixtureManifest from "../../art/fixtures/valid_character_manifest.json";
import { createRunBFixture } from "./run-b-fixture";
import {
  computeCharacterGenerationSignature,
  createCharacterComponentLibrary,
  type CharacterCatalogData,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
} from "./character-components";
import {
  CHARACTER_PROOF_REAL_SEED,
  CHARACTER_PROOF_SCENE,
  CHARACTER_PROOF_SEED,
  CHARACTER_PROOF_SETS,
  composeCharacterProof,
  createCharacterProofSetWorld,
  createCharacterProofWorld,
  loadCharacterProofSnapshot,
  saveCharacterProofSnapshot,
  summarizeComponentReuse,
} from "./character-proof";
import {
  buildCharacterRenderPlan,
  LEGACY_APPEARANCE_CATALOG_GENERATION,
  resolvePersonCatalogGeneration,
  type ModularSceneAnchor,
} from "./character-render-plan";
import {
  composeOfficeVisuals,
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "./visual-integration";
import { derivePersonAppearance } from "../simulation/person-appearance";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";

const STANDING = CHARACTER_PROOF_SCENE.stageAnchors[0]!;
const SEATED = CHARACTER_PROOF_SCENE.sideAnchor;
const PLATE = CHARACTER_PROOF_SCENE.plate;

class MemoryStorage {
  readonly items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

function planFor(
  seedIndex: number,
  anchor: ModularSceneAnchor,
  generation?: number,
) {
  const appearance = derivePersonAppearance(
    `person_plan_${seedIndex}`,
    undefined,
    generation,
  );
  return buildCharacterRenderPlan({
    personId: `person_plan_${seedIndex}`,
    appearance,
    anchor,
    plate: PLATE,
    library: PRODUCTION_CHARACTER_LIBRARY,
    visualLibrary: PRODUCTION_VISUAL_LIBRARY,
  });
}

/** Production library plus one generation-3 hairstyle, garment, and accessory for the real families. */
function grownProductionLibrary() {
  const base: CharacterComponentManifestRecord[] = [
    ...PRODUCTION_CHARACTER_LIBRARY.components.values(),
  ].map((component) => ({
    asset_id: component.assetId,
    asset_type: "character-component",
    fixed_or_modular: "modular",
    generation_status: "approved",
    qa_status: "approved",
    runtime_release_status: "released",
    availability: component.fixture
      ? "development-fixture"
      : "production-candidate",
    component: component.definition,
  }));
  const added: Record<string, CharacterComponentDefinition> = {
    pg_hair_f_test_v3: {
      kind: "hair-front",
      family: "pg-hair-f-test",
      catalog_generation: 3,
      layer: 40,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: { x: 0.5, y: 0.95 },
      compatible_head_families: ["pg-head-f-01"],
      compatible_head_orientations: ["front"],
    },
    pg_top_test_fl_v3: {
      kind: "top",
      family: "pg-top-test",
      catalog_generation: 3,
      layer: 25,
      canvas: { width: 236, height: 250 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: ["pg-female-lean"],
      compatible_pose_families: ["standing-neutral"],
    },
    pg_accessory_test_v3: {
      kind: "accessory",
      family: "pg-accessory-test",
      catalog_generation: 3,
      layer: 26,
      canvas: { width: 40, height: 40 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.5 },
      compatible_body_families: ["pg-female-lean", "pg-male-lean"],
    },
  };
  const extra = Object.entries(added).map(
    ([asset_id, component]): CharacterComponentManifestRecord => ({
      asset_id,
      asset_type: "character-component",
      fixed_or_modular: "modular",
      generation_status: "draft",
      qa_status: "pending",
      runtime_release_status: "unreleased",
      availability: "production-candidate",
      component,
    }),
  );
  const catalog: CharacterCatalogData = {
    catalog_generation: 3,
    slots: PRODUCTION_CHARACTER_LIBRARY.slots,
    generations: [
      ...PRODUCTION_CHARACTER_LIBRARY.generations,
      {
        generation: 3,
        component_ids: Object.keys(added).sort(),
        signature: computeCharacterGenerationSignature(
          Object.entries(added).map(([assetId, definition]) => ({
            assetId,
            definition,
          })),
        ),
      },
    ],
  };
  return createCharacterComponentLibrary([...base, ...extra], catalog);
}

describe("Character render plan", () => {
  it("carries the DEV fixtures at generation 1 and the production candidates at generation 2", () => {
    expect(PRODUCTION_CHARACTER_LIBRARY.catalogGeneration).toBe(2);
    const components = [...PRODUCTION_CHARACTER_LIBRARY.components.values()];
    expect(components.filter((c) => c.fixture)).toHaveLength(16);
    expect(components.filter((c) => !c.fixture)).toHaveLength(35);
    for (const component of components) {
      expect(component.released).toBe(true);
      expect(PRODUCTION_VISUAL_LIBRARY.has(component.assetId)).toBe(true);
      expect(component.definition.catalog_generation).toBe(
        component.fixture ? 1 : 2,
      );
    }
  });

  it("orders layers by draw order with the rig behind garments and hair-back behind everything", () => {
    const plan = planFor(1, STANDING);
    expect(plan.complete).toBe(true);
    const layers = plan.layers.map((layer) => layer.layer);
    expect([...layers].sort((a, b) => a - b)).toEqual(layers);
    expect(new Set(layers).size).toBe(layers.length);
    const kindOrder = plan.layers.map((layer) => layer.kind);
    const index = (kind: string) => kindOrder.indexOf(kind as never);
    expect(index("body")).toBeLessThan(index("top"));
    expect(index("top")).toBeLessThan(index("head"));
    if (kindOrder.includes("hair-back")) {
      expect(index("hair-back")).toBeLessThan(index("body"));
      expect(index("head")).toBeLessThan(index("hair-front"));
    }
    if (kindOrder.includes("eyewear")) {
      expect(index("head")).toBeLessThan(index("eyewear"));
    }
    for (const layer of plan.layers) {
      expect(layer.url).toContain(layer.assetId);
      expect(layer.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("places every attached component's origin exactly on its body-rig anchor", () => {
    for (let index = 0; index < 40; index += 1) {
      const plan = planFor(index, STANDING);
      const anchors = new Map(
        plan.attachmentAnchors.map((anchor) => [anchor.id, anchor]),
      );
      const body = plan.layers.find((layer) => layer.kind === "body")!;
      expect(body.leftPercent).toBeCloseTo(plan.box.leftPercent, 9);
      expect(body.widthPercent).toBeCloseTo(plan.box.widthPercent, 9);
      expect(plan.root).toEqual({
        id: "pelvis-hip-center",
        xPercent: STANDING.xPercent,
        yPercent: STANDING.yPercent,
      });
      for (const layer of plan.layers) {
        if (layer.kind === "body") continue;
        const definition = PRODUCTION_CHARACTER_LIBRARY.components.get(
          layer.assetId,
        )!.definition;
        const anchor = anchors.get(layer.attachmentAnchorId!)!;
        expect(anchor).toBeDefined();
        expect(
          layer.leftPercent + definition.origin!.x * layer.widthPercent,
        ).toBeCloseTo(anchor.xPercent, 9);
        expect(
          layer.topPercent + definition.origin!.y * layer.heightPercent,
        ).toBeCloseTo(anchor.yPercent, 9);
      }
    }
  });

  it("omits optional components deterministically and omits pose-less art without changing identity", () => {
    const plans = Array.from({ length: 60 }, (_, index) =>
      planFor(index, STANDING),
    );
    const withEyewear = plans.filter((plan) => plan.identity.slots.eyewear);
    expect(withEyewear.length).toBeGreaterThan(0);
    expect(withEyewear.length).toBeLessThan(plans.length);
    for (const plan of plans) {
      const hasEyewearLayer = plan.layers.some(
        (layer) => layer.kind === "eyewear",
      );
      expect(hasEyewearLayer).toBe(plan.identity.slots.eyewear !== null);
      // Footwear has standing art only.
      expect(plan.layers.some((layer) => layer.kind === "footwear")).toBe(true);
    }
    const seated = planFor(3, SEATED);
    const standing = planFor(3, STANDING);
    expect(seated.identity).toEqual(standing.identity);
    expect(seated.recipeKey).toBe(standing.recipeKey);
    expect(seated.layers.some((layer) => layer.kind === "footwear")).toBe(
      false,
    );
    expect(seated.complete).toBe(true);
  });

  it("never selects a component incompatible with the resolved body or head family", () => {
    for (let index = 0; index < 60; index += 1) {
      const plan = planFor(index, STANDING);
      for (const layer of plan.layers) {
        const definition = PRODUCTION_CHARACTER_LIBRARY.components.get(
          layer.assetId,
        )!.definition;
        if (definition.compatible_body_families) {
          expect(definition.compatible_body_families).toContain(
            plan.identity.bodyFamily,
          );
        }
        if (definition.compatible_head_families) {
          expect(definition.compatible_head_families).toContain(
            plan.identity.headFamily,
          );
        }
        if (definition.compatible_pose_families) {
          expect(definition.compatible_pose_families).toContain(
            STANDING.poseFamily,
          );
        }
      }
    }
    const badAnchor: ModularSceneAnchor = { ...STANDING, bodyWidthPercent: 0 };
    expect(() => planFor(1, badAnchor)).toThrow("positive bodyWidthPercent");
  });

  it("keeps identity fixed across scene placement and never mutates the world", () => {
    const world = createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY);
    const before = JSON.stringify(world);
    const person = world.people[world.personOrder[0]!]!;
    const a = buildCharacterRenderPlan({
      personId: person.id,
      appearance: person.appearance!,
      anchor: CHARACTER_PROOF_SCENE.stageAnchors[0]!,
      plate: PLATE,
      library: PRODUCTION_CHARACTER_LIBRARY,
      visualLibrary: PRODUCTION_VISUAL_LIBRARY,
    });
    const b = buildCharacterRenderPlan({
      personId: person.id,
      appearance: person.appearance!,
      anchor: CHARACTER_PROOF_SCENE.stageAnchors[3]!,
      plate: PLATE,
      library: PRODUCTION_CHARACTER_LIBRARY,
      visualLibrary: PRODUCTION_VISUAL_LIBRARY,
    });
    expect(b.recipeKey).toBe(a.recipeKey);
    expect(b.identity).toEqual(a.identity);
    expect(b.layers.map((layer) => layer.assetId)).toEqual(
      a.layers.map((layer) => layer.assetId),
    );
    expect(b.box.leftPercent).not.toBe(a.box.leftPercent);
    expect(b.box.widthPercent).toBeCloseTo(a.box.widthPercent, 9);
    expect(JSON.stringify(world)).toBe(before);
  });

  describe("persistence", () => {
    it("pins new people to the current catalog generation and round-trips through the snapshot codec", () => {
      const world = createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY);
      for (const personId of world.personOrder) {
        expect(world.people[personId]!.appearance?.catalogGeneration).toBe(2);
      }
      const restored = deserializeWorld(serializeWorld(world));
      expect(restored).toEqual(world);
      const original = composeCharacterProof(
        world,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
      );
      const reloaded = composeCharacterProof(
        restored,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
      );
      expect(reloaded.stage.map((c) => c.plan)).toEqual(
        original.stage.map((c) => c.plan),
      );
      expect(reloaded.side.plan).toEqual(original.side.plan);
    });

    it("saves and restores the proof world through presentation storage", () => {
      const storage = new MemoryStorage();
      expect(loadCharacterProofSnapshot(storage)).toBeNull();
      const world = createCharacterProofWorld(PRODUCTION_CHARACTER_LIBRARY);
      saveCharacterProofSnapshot(storage, world);
      const restored = loadCharacterProofSnapshot(storage);
      expect(restored).toEqual(world);
      storage.setItem("political-game:character-proof:snapshot:v1", "{corrupt");
      expect(loadCharacterProofSnapshot(storage)).toBeNull();
    });

    it("treats unpinned legacy appearances as the frozen first generation", () => {
      const legacy = derivePersonAppearance("person_legacy");
      expect(legacy.catalogGeneration).toBeUndefined();
      expect(
        resolvePersonCatalogGeneration(legacy, PRODUCTION_CHARACTER_LIBRARY),
      ).toBe(LEGACY_APPEARANCE_CATALOG_GENERATION);
      const runB = createRunBFixture();
      for (const scenePerson of runB.scenePeople) {
        const person = runB.world.people[scenePerson.personId]!;
        expect(person.appearance?.catalogGeneration).toBeUndefined();
      }
      expect(() =>
        resolvePersonCatalogGeneration(
          derivePersonAppearance("person_future", undefined, 9),
          PRODUCTION_CHARACTER_LIBRARY,
        ),
      ).toThrow("pinned to catalog generation 9");
    });

    it("keeps established people unchanged when the catalog grows, while new people can use the new generation", () => {
      const grown = grownProductionLibrary();
      expect(grown.catalogGeneration).toBe(3);
      let sawNewContent = false;
      for (let index = 0; index < 120; index += 1) {
        const id = `person_established_${index}`;
        for (const pinnedGeneration of [1, 2]) {
          const appearance = derivePersonAppearance(
            id,
            undefined,
            pinnedGeneration,
          );
          const before = buildCharacterRenderPlan({
            personId: id,
            appearance,
            anchor: STANDING,
            plate: PLATE,
            library: PRODUCTION_CHARACTER_LIBRARY,
            visualLibrary: PRODUCTION_VISUAL_LIBRARY,
          });
          const after = buildCharacterRenderPlan({
            personId: id,
            appearance,
            anchor: STANDING,
            plate: PLATE,
            library: grown,
            visualLibrary: PRODUCTION_VISUAL_LIBRARY,
          });
          expect(after.identity).toEqual(before.identity);
          expect(after.recipeKey).toBe(before.recipeKey);
          expect(after.layers.map((l) => l.assetId)).toEqual(
            before.layers.map((l) => l.assetId),
          );
        }
        // Legacy (unpinned) people behave exactly like generation 1.
        const legacy = buildCharacterRenderPlan({
          personId: id,
          appearance: derivePersonAppearance(id),
          anchor: STANDING,
          plate: PLATE,
          library: grown,
          visualLibrary: PRODUCTION_VISUAL_LIBRARY,
        });
        expect(legacy.catalogGeneration).toBe(1);
        expect(legacy.layers.every((l) => l.assetId.startsWith("dev_"))).toBe(
          true,
        );

        const fresh = buildCharacterRenderPlan({
          personId: id,
          appearance: derivePersonAppearance(id, undefined, 3),
          anchor: STANDING,
          plate: PLATE,
          library: grown,
          visualLibrary: PRODUCTION_VISUAL_LIBRARY,
        });
        expect(fresh.catalogGeneration).toBe(3);
        expect(fresh.layers.every((l) => !l.assetId.startsWith("dev_"))).toBe(
          true,
        );
        if (fresh.layers.some((layer) => layer.assetId.endsWith("_v3"))) {
          sawNewContent = true;
          expect(fresh.complete).toBe(false); // unreleased gen-3 art fails closed
        }
      }
      expect(sawNewContent).toBe(true);
    });
  });

  describe("four-character proof (DEV set, pinned to generation 1)", () => {
    const world = createCharacterProofSetWorld(
      PRODUCTION_CHARACTER_LIBRARY,
      CHARACTER_PROOF_SETS.dev,
    );
    const composition = composeCharacterProof(
      world,
      PRODUCTION_CHARACTER_LIBRARY,
      PRODUCTION_VISUAL_LIBRARY,
    );

    it("renders four complete, distinct characters that recombine shared components", () => {
      expect(world.seed).toBe(CHARACTER_PROOF_SEED);
      for (const character of composition.stage) {
        expect(character.plan.catalogGeneration).toBe(1);
        expect(
          character.plan.layers.every((l) => l.assetId.startsWith("dev_")),
        ).toBe(true);
      }
      expect(composition.stage).toHaveLength(4);
      const keys = new Set(composition.stage.map((c) => c.plan.recipeKey));
      expect(keys.size).toBe(4);
      for (const character of composition.stage) {
        expect(character.plan.complete).toBe(true);
        expect(character.plan.pinnedByPerson).toBe(true);
        expect(character.plan.layers.length).toBeGreaterThanOrEqual(5);
      }
      const identities = composition.stage.map((c) => c.plan.identity);
      expect(
        new Set(identities.map((i) => i.headFamily)).size,
      ).toBeGreaterThanOrEqual(2);
      expect(
        new Set(identities.map((i) => i.slots.hair)).size,
      ).toBeGreaterThanOrEqual(2);
      expect(
        new Set(identities.map((i) => i.slots.top)).size,
      ).toBeGreaterThanOrEqual(2);
      const eyewear = identities.map((i) => i.slots.eyewear !== null);
      expect(eyewear).toContain(true);
      expect(eyewear).toContain(false);

      const reuse = summarizeComponentReuse(composition.stage);
      const body = reuse.find(
        (row) => row.assetId === "dev_body_adult_standing_v1",
      )!;
      expect(body.usedBy).toEqual(["stage-1", "stage-2", "stage-3", "stage-4"]);
      expect(
        reuse.filter((row) => row.usedBy.length > 1).length,
      ).toBeGreaterThanOrEqual(3);
    });

    it("shows the first person again in another scene with the same identity", () => {
      expect(composition.side.plan.recipeKey).toBe(
        composition.stage[0]!.plan.recipeKey,
      );
      expect(composition.side.plan.poseFamily).toBe("seated-at-desk");
      expect(composition.side.plan.complete).toBe(true);
      expect(
        composition.side.plan.layers.some((l) => l.kind === "footwear"),
      ).toBe(false);
    });
  });

  describe("four-character proof (real Political Game components, generation 2)", () => {
    const world = createCharacterProofSetWorld(
      PRODUCTION_CHARACTER_LIBRARY,
      CHARACTER_PROOF_SETS.real,
    );
    const composition = composeCharacterProof(
      world,
      PRODUCTION_CHARACTER_LIBRARY,
      PRODUCTION_VISUAL_LIBRARY,
    );

    it("recombines both real body families, several heads, hairstyles, and wardrobe with every layer released", () => {
      expect(world.seed).toBe(CHARACTER_PROOF_REAL_SEED);
      expect(composition.stage).toHaveLength(4);
      expect(new Set(composition.stage.map((c) => c.plan.recipeKey)).size).toBe(
        4,
      );
      const identities = composition.stage.map((c) => c.plan.identity);
      expect(new Set(identities.map((i) => i.bodyFamily))).toEqual(
        new Set(["pg-female-lean", "pg-male-lean"]),
      );
      expect(
        new Set(identities.map((i) => i.headFamily)).size,
      ).toBeGreaterThanOrEqual(3);
      const women = identities.filter((i) => i.bodyFamily === "pg-female-lean");
      expect(women).toHaveLength(2);
      expect(new Set(women.map((i) => i.slots.hair)).size).toBe(2);
      expect(
        new Set(identities.map((i) => i.slots.top)).size,
      ).toBeGreaterThanOrEqual(3);
      expect(
        new Set(identities.map((i) => i.slots.bottom)).size,
      ).toBeGreaterThanOrEqual(2);
      for (const character of composition.stage) {
        expect(character.plan.catalogGeneration).toBe(2);
        expect(character.plan.pinnedByPerson).toBe(true);
        expect(character.plan.complete).toBe(true);
        expect(
          character.plan.layers.every((l) => l.assetId.startsWith("pg_")),
        ).toBe(true);
        expect(character.plan.layers.every((l) => l.url !== null)).toBe(true);
        const kinds = character.plan.layers.map((l) => l.kind);
        for (const kind of ["body", "head", "top", "bottom", "footwear"]) {
          expect(kinds).toContain(kind);
        }
        if (character.plan.identity.bodyFamily === "pg-female-lean") {
          expect(kinds).toContain("hair-front");
          // Garment derivatives fitted to the person's own body family.
          for (const layer of character.plan.layers) {
            if (["top", "bottom", "footwear"].includes(layer.kind)) {
              expect(layer.assetId).toMatch(/_fl_v1$/);
            }
          }
        } else {
          for (const layer of character.plan.layers) {
            if (["top", "bottom", "footwear"].includes(layer.kind)) {
              expect(layer.assetId).toMatch(/_ml_v1$/);
            }
          }
        }
      }
      const reuse = summarizeComponentReuse(composition.stage);
      expect(
        reuse.find((r) => r.assetId === "pg_body_fl_standing_v1")!.usedBy,
      ).toHaveLength(2);
      expect(
        reuse.find((r) => r.assetId === "pg_body_ml_standing_v1")!.usedBy,
      ).toHaveLength(2);
      expect(
        reuse.filter((r) => r.usedBy.length > 1).length,
      ).toBeGreaterThanOrEqual(2);
      // Garment designs are shared across body families through per-family derivatives.
      const designFamilies = composition.stage.flatMap((c) =>
        Object.values(c.plan.identity.slots).filter(
          (f): f is string => f !== null,
        ),
      );
      const sharedDesigns = [...new Set(designFamilies)].filter(
        (family) => designFamilies.filter((f) => f === family).length > 1,
      );
      expect(sharedDesigns.length).toBeGreaterThanOrEqual(3);
    });

    it("has no seated real body yet, so the seated side view fails closed rather than faking a pose", () => {
      expect(composition.side.plan.recipeKey).toBe(
        composition.stage[0]!.plan.recipeKey,
      );
      expect(composition.side.plan.layers).toEqual([]);
      expect(composition.side.plan.complete).toBe(false);
      expect(composition.side.plan.missing[0]).toMatch(/^body:pg-/);
    });
  });

  it("does not regress the authored A01/B01 office path", () => {
    const office = composeOfficeVisuals(
      createRunBFixture().scenePeople,
      PRODUCTION_VISUAL_LIBRARY,
    );
    expect(office.characters.map((c) => c.asset?.assetId)).toEqual([
      "human_candidate_A01_primary_desk_seated_v1",
      "human_candidate_B01_left_guest_seated_v1",
    ]);
    expect(office.characters.every((c) => !c.isPlaceholder)).toBe(true);
    expect(office.characters[0]!.asset?.hash).toBe(
      "8e5882e26eab1c6cf966cff188bfebd4e40cd117804e87930a0b06d67ca66e43",
    );
    expect(office.environment.hash).toBe(
      "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
    );
    // The #46 fixture library remains a separate, unreleased test library.
    const fixture = createCharacterComponentLibrary(
      fixtureManifest.assets as unknown as CharacterComponentManifestRecord[],
      fixtureCatalog as unknown as CharacterCatalogData,
    );
    expect([...fixture.components.values()].every((c) => !c.released)).toBe(
      true,
    );
  });
});
