import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import fixtureCatalog from "../../art/fixtures/valid_character_catalog.json";
import fixtureManifest from "../../art/fixtures/valid_character_manifest.json";
import { derivePersonAppearance } from "../simulation/person-appearance";
import { createDemoWorld } from "../simulation/demo";
import type { PersonAppearance } from "../simulation/types";
import {
  computeCharacterGenerationSignature,
  createCharacterComponentLibrary,
  projectCharacterLayers,
  reproduceCharacterRecipe,
  resolveCharacterRecipe,
  validateCharacterComponentLibrary,
  type CharacterCatalogData,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
} from "./character-components";

const FIXTURE_RECORDS =
  fixtureManifest.assets as unknown as readonly CharacterComponentManifestRecord[];
const FIXTURE_CATALOG = fixtureCatalog as unknown as CharacterCatalogData;

function appearanceFor(index: number): PersonAppearance {
  return derivePersonAppearance(`person_fixture_${index}`);
}

function cloneRecords(): CharacterComponentManifestRecord[] {
  return JSON.parse(JSON.stringify(FIXTURE_RECORDS));
}

function cloneCatalog(): CharacterCatalogData {
  return JSON.parse(JSON.stringify(FIXTURE_CATALOG));
}

function record(
  assetId: string,
  component: CharacterComponentDefinition,
  overrides: Partial<CharacterComponentManifestRecord> = {},
): CharacterComponentManifestRecord {
  return {
    asset_id: assetId,
    asset_type: "character-component",
    fixed_or_modular: "modular",
    generation_status: "draft",
    qa_status: "pending",
    runtime_release_status: "unreleased",
    component,
    ...overrides,
  };
}

/**
 * Generation 2 adds a hairstyle, a garment, and an accessory. Nothing in
 * generation 1 changes.
 */
function withGenerationTwo(): {
  records: CharacterComponentManifestRecord[];
  catalog: CharacterCatalogData;
} {
  const added: Record<string, CharacterComponentDefinition> = {
    hair_buzz_front_tql_v2: {
      kind: "hair-front",
      family: "buzz",
      catalog_generation: 2,
      layer: 40,
      canvas: { width: 250, height: 150 },
      attaches_to: "head",
      origin: { x: 0.5, y: 0.8 },
      compatible_head_families: ["round", "oval"],
      compatible_head_orientations: ["three-quarter-left"],
      paired_with: "hair_buzz_back_tql_v2",
    },
    hair_buzz_back_tql_v2: {
      kind: "hair-back",
      family: "buzz",
      catalog_generation: 2,
      layer: 10,
      canvas: { width: 250, height: 150 },
      attaches_to: "head",
      origin: { x: 0.5, y: 0.8 },
      compatible_head_families: ["round", "oval"],
      compatible_head_orientations: ["three-quarter-left"],
    },
    top_cardigan_rust_seated_v2: {
      kind: "top",
      family: "cardigan-rust",
      catalog_generation: 2,
      layer: 25,
      canvas: { width: 800, height: 600 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.1 },
      compatible_body_families: ["adult-medium", "adult-tall"],
      compatible_pose_families: ["seated-at-desk"],
    },
    accessory_reading_glasses_case_v2: {
      kind: "accessory",
      family: "glasses-case",
      catalog_generation: 2,
      layer: 27,
      canvas: { width: 60, height: 30 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.5 },
      compatible_body_families: ["adult-medium", "adult-tall"],
    },
  };
  const records = [
    ...cloneRecords(),
    ...Object.entries(added).map(([id, definition]) => record(id, definition)),
  ];
  const catalog: CharacterCatalogData = {
    ...cloneCatalog(),
    catalog_generation: 2,
    generations: [
      ...FIXTURE_CATALOG.generations,
      {
        generation: 2,
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
  return { records, catalog };
}

function definitionOf(
  records: CharacterComponentManifestRecord[],
  assetId: string,
): CharacterComponentDefinition {
  const found = records.find((entry) => entry.asset_id === assetId);
  if (!found?.component) throw new Error(`Fixture is missing ${assetId}`);
  return found.component as CharacterComponentDefinition;
}

function mutate(
  records: CharacterComponentManifestRecord[],
  assetId: string,
  patch: Partial<CharacterComponentDefinition>,
): void {
  const index = records.findIndex((entry) => entry.asset_id === assetId);
  const current = records[index];
  if (!current?.component) throw new Error(`Fixture is missing ${assetId}`);
  records[index] = {
    ...current,
    component: { ...current.component, ...patch },
  };
}

describe("Modular character component contract", () => {
  const library = createCharacterComponentLibrary(
    FIXTURE_RECORDS,
    FIXTURE_CATALOG,
  );

  describe("component-schema validation", () => {
    it("accepts the fixture library", () => {
      expect(
        validateCharacterComponentLibrary(FIXTURE_RECORDS, FIXTURE_CATALOG),
      ).toEqual([]);
    });

    it("rejects duplicate component IDs", () => {
      const records = cloneRecords();
      records.push({ ...records[0]! });
      const errors = validateCharacterComponentLibrary(
        records,
        FIXTURE_CATALOG,
      );
      expect(errors).toContain(
        `Duplicate character component ID '${records[0]!.asset_id}'.`,
      );
    });

    it("rejects a component asset that lacks a modular declaration", () => {
      const records = cloneRecords();
      records[0] = { ...records[0]!, fixed_or_modular: "fixed" };
      expect(
        validateCharacterComponentLibrary(records, FIXTURE_CATALOG).join("\n"),
      ).toContain("must declare fixed_or_modular 'modular'");
    });

    it("rejects invalid layer and canvas definitions", () => {
      const records = cloneRecords();
      mutate(records, "head_round_tql_v1", { layer: 1.5 });
      mutate(records, "head_oval_tql_v1", { canvas: { width: 0, height: 10 } });
      const errors = validateCharacterComponentLibrary(
        records,
        FIXTURE_CATALOG,
      );
      expect(errors.join("\n")).toContain(
        "'head_round_tql_v1' must declare an integer 'layer'",
      );
      expect(errors.join("\n")).toContain(
        "'head_oval_tql_v1' must declare a positive integer 'canvas'",
      );
    });

    it("rejects a component whose paired hair-back is missing or misordered", () => {
      const missing = cloneRecords();
      mutate(missing, "hair_short_crop_front_tql_v1", {
        paired_with: "hair_does_not_exist",
      });
      expect(
        validateCharacterComponentLibrary(missing, FIXTURE_CATALOG).join("\n"),
      ).toContain("pairs with missing component 'hair_does_not_exist'");

      const misordered = cloneRecords();
      mutate(misordered, "hair_short_crop_back_tql_v1", { layer: 41 });
      expect(
        validateCharacterComponentLibrary(misordered, FIXTURE_CATALOG).join(
          "\n",
        ),
      ).toContain("hair-back layer must be behind its hair-front layer");
    });

    it("rejects an optional slot without a presence rate and a required body slot marked optional", () => {
      const catalog = cloneCatalog();
      const slots = catalog.slots.map((slot) =>
        slot.slot_id === "eyewear"
          ? { slot_id: slot.slot_id, kind: slot.kind, required: false }
          : slot.slot_id === "body"
            ? { ...slot, required: false, presence_rate: 0.5 }
            : slot,
      );
      const errors = validateCharacterComponentLibrary(FIXTURE_RECORDS, {
        ...catalog,
        slots,
      });
      expect(errors.join("\n")).toContain(
        "Optional character slot 'eyewear' must declare 'presence_rate'",
      );
      expect(errors.join("\n")).toContain(
        "Character slot 'body' of kind 'body' must be required",
      );
    });
  });

  describe("compatibility validation", () => {
    it("rejects references to unknown body, head, pose, and orientation families", () => {
      const records = cloneRecords();
      mutate(records, "head_round_tql_v1", {
        compatible_body_families: ["adult-medium", "adult-giant"],
      });
      mutate(records, "eyewear_round_glasses_tql_v1", {
        compatible_head_families: ["round", "square"],
        compatible_head_orientations: ["profile"],
      });
      mutate(records, "top_blazer_navy_seated_v1", {
        compatible_pose_families: ["seated-at-desk", "lying-down"],
      });
      const errors = validateCharacterComponentLibrary(
        records,
        FIXTURE_CATALOG,
      );
      expect(errors).toContain(
        "Character component 'head_round_tql_v1' references unknown body family 'adult-giant'.",
      );
      expect(errors).toContain(
        "Character component 'eyewear_round_glasses_tql_v1' references unknown head family 'square'.",
      );
      expect(errors).toContain(
        "Character component 'eyewear_round_glasses_tql_v1' references unknown head orientation 'profile'.",
      );
      expect(errors).toContain(
        "Character component 'top_blazer_navy_seated_v1' references unknown pose family 'lying-down'.",
      );
    });

    it("requires uniform head compatibility within a family while allowing per-body-family garment derivatives", () => {
      const records = cloneRecords();
      mutate(records, "hair_short_crop_front_front_v1", {
        compatible_head_families: ["round"],
      });
      expect(
        validateCharacterComponentLibrary(records, FIXTURE_CATALOG).join("\n"),
      ).toContain(
        "declares different head compatibility from other members of hair-front family 'short-crop'",
      );

      // A garment design fitted separately per body family keeps one family.
      const partitioned = cloneRecords();
      mutate(partitioned, "top_blazer_navy_standing_v1", {
        compatible_body_families: ["adult-medium"],
      });
      mutate(partitioned, "top_blazer_navy_seated_v1", {
        compatible_body_families: ["adult-tall"],
      });
      expect(
        validateCharacterComponentLibrary(partitioned, FIXTURE_CATALOG).filter(
          (error) => error.includes("blazer-navy"),
        ),
      ).toEqual([]);
    });

    it("never resolves an incompatible head or hair family", () => {
      for (let index = 0; index < 300; index += 1) {
        const recipe = resolveCharacterRecipe(
          { appearance: appearanceFor(index), poseFamily: "seated-at-desk" },
          library,
        );
        if (recipe.identity.bodyFamily === "adult-tall") {
          expect(recipe.identity.headFamily).toBe("round");
        }
        if (recipe.identity.slots.hair === "long-wave") {
          expect(recipe.identity.headFamily).toBe("round");
        }
        if (recipe.identity.slots.top === "tee-grey") {
          expect(recipe.identity.bodyFamily).toBe("adult-medium");
        }
      }
    });

    it("fails closed when a required slot has no compatible family", () => {
      const records = cloneRecords().filter(
        (entry) => entry.component?.kind !== "bottom",
      );
      const catalog: CharacterCatalogData = {
        ...cloneCatalog(),
        generations: [
          {
            generation: 1,
            component_ids: records.map((entry) => entry.asset_id).sort(),
            signature: computeCharacterGenerationSignature(
              records.map((entry) => ({
                assetId: entry.asset_id,
                definition: entry.component as CharacterComponentDefinition,
              })),
            ),
          },
        ],
      };
      const thin = createCharacterComponentLibrary(records, catalog);
      expect(() =>
        resolveCharacterRecipe(
          { appearance: appearanceFor(1), poseFamily: "seated-at-desk" },
          thin,
        ),
      ).toThrow("Required character slot 'bottom' has no bottom family");
      expect(
        validateCharacterComponentLibrary(records, catalog).join("\n"),
      ).toContain("Character recipe resolution failed");
    });
  });

  describe("attachment-slot validation", () => {
    it("requires body rigs to declare a root and unique anchors, and attached components to declare origin and anchor", () => {
      const records = cloneRecords();
      const body = definitionOf(records, "body_adult_medium_seated_desk_v1");
      mutate(records, "body_adult_medium_seated_desk_v1", {
        root: undefined,
        attachment_anchors: [
          ...(body.attachment_anchors ?? []),
          { id: "head", x: 0.4, y: 0.4 },
        ],
      });
      mutate(records, "eyewear_round_glasses_tql_v1", {
        origin: undefined,
        attaches_to: undefined,
      });
      const errors = validateCharacterComponentLibrary(
        records,
        FIXTURE_CATALOG,
      );
      expect(errors).toContain(
        "Character component 'body_adult_medium_seated_desk_v1' (body) must declare a normalized pelvis-hip-center 'root'.",
      );
      expect(errors).toContain(
        "Character component 'body_adult_medium_seated_desk_v1' (body) declares duplicate attachment anchor 'head'.",
      );
      expect(errors).toContain(
        "Character component 'eyewear_round_glasses_tql_v1' must declare 'attaches_to'.",
      );
      expect(errors).toContain(
        "Character component 'eyewear_round_glasses_tql_v1' must declare a normalized 'origin'.",
      );
    });

    it("rejects a component attached to an anchor its reachable bodies do not declare", () => {
      const records = cloneRecords();
      mutate(records, "hair_short_crop_front_tql_v1", { attaches_to: "crown" });
      const errors = validateCharacterComponentLibrary(
        records,
        FIXTURE_CATALOG,
      );
      expect(errors).toContain(
        "Character component 'hair_short_crop_front_tql_v1' attaches to anchor 'crown' which body 'body_adult_medium_seated_desk_v1' does not declare.",
      );
    });

    it("keeps scene, root, and attachment anchors distinct in projection", () => {
      const recipe = resolveCharacterRecipe(
        { appearance: appearanceFor(7), poseFamily: "seated-at-desk" },
        library,
      );
      const projected = projectCharacterLayers(recipe, library);
      expect(projected).not.toBeNull();
      expect(projected!.root).toEqual({
        convention: "pelvis-hip-center",
        x: 0.5,
        y: recipe.identity.bodyFamily === "adult-tall" ? 0.58 : 0.6,
      });

      const body = projected!.layers.find((layer) => layer.kind === "body")!;
      expect(body.attachmentAnchorId).toBeNull();
      expect([body.left, body.top, body.width, body.height]).toEqual([
        0, 0, 1, 1,
      ]);

      const head = projected!.layers.find((layer) => layer.kind === "head")!;
      const bodyDefinition = library.components.get(body.assetId)!.definition;
      const headDefinition = library.components.get(head.assetId)!.definition;
      const anchor = bodyDefinition.attachment_anchors!.find(
        (candidate) => candidate.id === "head",
      )!;
      expect(head.attachmentAnchorId).toBe("head");
      // The declared origin lands exactly on the declared anchor.
      expect(head.left + headDefinition.origin!.x * head.width).toBeCloseTo(
        anchor.x,
        10,
      );
      expect(head.top + headDefinition.origin!.y * head.height).toBeCloseTo(
        anchor.y,
        10,
      );
      expect(head.width).toBeCloseTo(
        headDefinition.canvas.width / bodyDefinition.canvas.width,
        10,
      );

      const layers = projected!.layers.map((layer) => layer.layer);
      expect([...layers].sort((a, b) => a - b)).toEqual(layers);
      expect(new Set(layers).size).toBe(layers.length);
      if (recipe.identity.slots.hair) {
        const hairBack = projected!.layers.find(
          (layer) => layer.kind === "hair-back",
        );
        expect(hairBack).toBeDefined();
        expect(hairBack!.layer).toBeLessThan(body.layer);
      }
    });
  });

  describe("stable deterministic recipe behavior", () => {
    it("resolves the same recipe for the same appearance, version, and generation", () => {
      for (let index = 0; index < 200; index += 1) {
        const request = {
          appearance: appearanceFor(index),
          poseFamily: "seated-at-desk",
        };
        expect(resolveCharacterRecipe(request, library)).toEqual(
          resolveCharacterRecipe(request, library),
        );
      }
    });

    it("keeps identity pose-independent while context follows the pose", () => {
      let contextDiffered = false;
      for (let index = 0; index < 200; index += 1) {
        const appearance = appearanceFor(index);
        const seated = resolveCharacterRecipe(
          { appearance, poseFamily: "seated-at-desk" },
          library,
        );
        const standing = resolveCharacterRecipe(
          { appearance, poseFamily: "standing-neutral" },
          library,
        );
        expect(standing.identity).toEqual(seated.identity);
        if (seated.identity.bodyFamily === "adult-tall") {
          // No standing art for the tall body: context fails closed, identity remains.
          expect(standing.context.components).toEqual([]);
          expect(projectCharacterLayers(standing, library)).toBeNull();
        } else {
          expect(standing.context.headOrientation).toBe("front");
          expect(seated.context.headOrientation).toBe("three-quarter-left");
          const seatedIds = seated.context.components.map((c) => c.assetId);
          const standingIds = standing.context.components.map((c) => c.assetId);
          if (seatedIds.join() !== standingIds.join()) contextDiffered = true;
          // Footwear has standing art only; seated context omits it without
          // changing the identity's footwear family.
          expect(seated.identity.slots.footwear).toBe("oxford-black");
          expect(seatedIds.some((id) => id.startsWith("footwear_"))).toBe(
            false,
          );
          expect(standingIds.some((id) => id.startsWith("footwear_"))).toBe(
            true,
          );
        }
      }
      expect(contextDiffered).toBe(true);
    });

    it("varies identity across different people and honors optional slots", () => {
      const recipes: CharacterRecipe[] = [];
      for (let index = 0; index < 200; index += 1) {
        recipes.push(
          resolveCharacterRecipe(
            { appearance: appearanceFor(index), poseFamily: "seated-at-desk" },
            library,
          ),
        );
      }
      const heads = new Set(
        recipes.map((recipe) => recipe.identity.headFamily),
      );
      const tops = new Set(recipes.map((recipe) => recipe.identity.slots.top));
      expect(heads.size).toBeGreaterThan(1);
      expect(tops.size).toBeGreaterThan(1);
      const withGlasses = recipes.filter(
        (r) => r.identity.slots.eyewear,
      ).length;
      expect(withGlasses).toBeGreaterThan(0);
      expect(withGlasses).toBeLessThan(recipes.length);
      for (const recipe of recipes) {
        expect(recipe.identity.slots.body).toBe(recipe.identity.bodyFamily);
        expect(recipe.identity.slots.head).toBe(recipe.identity.headFamily);
      }
    });

    it("ignores release state when selecting identity", () => {
      const released = cloneRecords().map((entry) =>
        entry.asset_id === "top_tee_grey_seated_v1"
          ? {
              ...entry,
              generation_status: "approved" as const,
              qa_status: "approved" as const,
              runtime_release_status: "released" as const,
            }
          : entry,
      );
      const releasedLibrary = createCharacterComponentLibrary(
        released,
        FIXTURE_CATALOG,
      );
      for (let index = 0; index < 100; index += 1) {
        const request = {
          appearance: appearanceFor(index),
          poseFamily: "seated-at-desk",
        };
        const before = resolveCharacterRecipe(request, library);
        const after = resolveCharacterRecipe(request, releasedLibrary);
        expect(after.identity).toEqual(before.identity);
        expect(after.context.components.map((c) => c.assetId)).toEqual(
          before.context.components.map((c) => c.assetId),
        );
        const tee = after.context.components.find(
          (c) => c.assetId === "top_tee_grey_seated_v1",
        );
        if (tee) expect(tee.released).toBe(true);
      }
    });

    it("rejects a generation outside the catalog lineage", () => {
      expect(() =>
        resolveCharacterRecipe(
          {
            appearance: appearanceFor(1),
            poseFamily: "seated-at-desk",
            catalogGeneration: 2,
          },
          library,
        ),
      ).toThrow("outside the catalog range 1..1");
      const empty = createCharacterComponentLibrary([], {
        catalog_generation: 0,
        slots: [],
        generations: [],
      });
      expect(() =>
        resolveCharacterRecipe(
          { appearance: appearanceFor(1), poseFamily: "seated-at-desk" },
          empty,
        ),
      ).toThrow("Character catalog has no generation");
    });
  });

  describe("library growth does not change an established recipe", () => {
    const grown = withGenerationTwo();
    const grownLibrary = createCharacterComponentLibrary(
      grown.records,
      grown.catalog,
    );

    it("validates the grown library and freezes generation 1 by signature", () => {
      expect(
        validateCharacterComponentLibrary(grown.records, grown.catalog),
      ).toEqual([]);

      const rewritten = withGenerationTwo();
      mutate(rewritten.records, "top_blazer_navy_seated_v1", { layer: 28 });
      const errors = validateCharacterComponentLibrary(
        rewritten.records,
        rewritten.catalog,
      );
      expect(errors.join("\n")).toContain(
        "Character catalog generation 1 signature",
      );

      const smuggled = withGenerationTwo();
      smuggled.records.push(
        record("hair_smuggled_front_v1", {
          ...definitionOf(smuggled.records, "hair_buzz_front_tql_v2"),
          family: "smuggled",
          catalog_generation: 1,
          paired_with: undefined,
        }),
      );
      expect(
        validateCharacterComponentLibrary(
          smuggled.records,
          smuggled.catalog,
        ).join("\n"),
      ).toContain("generation 1 membership does not match");
    });

    it("reproduces every generation-1 identity exactly and reports drift only at generation 2", () => {
      let changedAtCurrent = false;
      for (let index = 0; index < 300; index += 1) {
        const appearance = appearanceFor(index);
        const established = resolveCharacterRecipe(
          { appearance, poseFamily: "seated-at-desk" },
          library,
        );
        expect(established.catalogGeneration).toBe(1);

        const pinned = resolveCharacterRecipe(
          { appearance, poseFamily: "seated-at-desk", catalogGeneration: 1 },
          grownLibrary,
        );
        expect(pinned.identity).toEqual(established.identity);
        expect(pinned.context.components.map((c) => c.assetId)).toEqual(
          established.context.components.map((c) => c.assetId),
        );

        const reproduced = reproduceCharacterRecipe(
          established,
          "seated-at-desk",
          grownLibrary,
        );
        expect(reproduced.identity).toEqual(established.identity);

        const current = resolveCharacterRecipe(
          { appearance, poseFamily: "seated-at-desk" },
          grownLibrary,
        );
        expect(current.catalogGeneration).toBe(2);
        if (
          JSON.stringify(current.identity) !==
          JSON.stringify(established.identity)
        ) {
          changedAtCurrent = true;
        }
      }
      // The pin is what protects identity: an unpinned resolve at the new
      // generation legitimately sees the new families.
      expect(changedAtCurrent).toBe(true);
    });

    it("refuses to reproduce an established identity the lineage no longer supports", () => {
      const established = resolveCharacterRecipe(
        { appearance: appearanceFor(3), poseFamily: "seated-at-desk" },
        library,
      );
      expect(() =>
        reproduceCharacterRecipe(
          {
            ...established,
            identity: { ...established.identity, headFamily: "square" },
          },
          "seated-at-desk",
          grownLibrary,
        ),
      ).toThrow("could not be reproduced");
    });
  });

  describe("presentation-only architecture", () => {
    it("never mutates the person, appearance, or world it reads", () => {
      const world = createDemoWorld("modular-character-boundary");
      const personId = world.personOrder[0]!;
      const person = world.people[personId]!;
      const before = JSON.stringify(world);
      const frozenAppearance = Object.freeze({ ...person.appearance! });
      const recipe = resolveCharacterRecipe(
        { appearance: frozenAppearance, poseFamily: "seated-at-desk" },
        library,
      );
      projectCharacterLayers(recipe, library);
      expect(recipe.appearanceSeed).toBe(person.appearance!.seed);
      expect(JSON.stringify(world)).toBe(before);
      expect(world.people[personId]).toBe(person);
    });

    it("stays independent of React, DOM, Vite, Node, and ambient entropy", async () => {
      const modulePath = join(
        dirname(fileURLToPath(import.meta.url)),
        "character-components.ts",
      );
      const source = await readFile(modulePath, "utf8");
      expect(source).not.toMatch(
        /from\s+["'](?:react(?:-dom)?|node:[a-z]+|fs|path|vite)["']/,
      );
      expect(source).not.toMatch(/import\.meta\.glob/);
      expect(source).not.toMatch(
        /\b(?:document|window|navigator|localStorage|fetch)\b/,
      );
      expect(source).not.toMatch(/\b(?:Math\.random|Date\.now)\b/);
      expect(source).toMatch(/from "\.\.\/simulation\/rng"/);
      expect(source).toMatch(/from "\.\.\/simulation\/ids"/);
    });
  });
});
