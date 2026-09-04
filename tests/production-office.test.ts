import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE } from "../src/environment/scenes/shared-workroom-office-production";
import { validateEnvironmentSceneSpec } from "../src/environment/environment-scene-spec";
import {
  CHARACTER_SEMANTIC_ANCHOR_ORDER,
  validateProductionBodyAnchors,
  type CharacterComponentManifestRecord,
} from "../src/presentation/character-components";
import {
  composeProductionOffice,
  PRODUCTION_ONLY_CHARACTER_LIBRARY,
} from "../src/presentation/production-office";
import {
  OFFICE_FIXTURE_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  requireScene,
  SCENE_REGISTRY,
} from "../src/presentation/scene-registry";

const REPO_ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(REPO_ROOT, "art/manifest/asset_manifest.json"),
    "utf-8",
  ),
) as { assets: CharacterComponentManifestRecord[] };

/**
 * The production office path.
 *
 * These tests exist because a development fixture spent three review cycles
 * being mistaken for the game's office. The separation they pin is the thing
 * that makes human visual acceptance mean anything: a production scene draws
 * production art or it draws nothing.
 */
describe("the production office", () => {
  it("is a valid scene spec and registers as production", () => {
    const validation = validateEnvironmentSceneSpec(
      SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE,
    );
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);

    const scene = requireScene(SCENE_REGISTRY, PRODUCTION_OFFICE_SCENE_ID);
    expect(scene.presentationStatus).toBe("production");
  });

  /**
   * A production plate may not stand on enlarged pixels. Both tiers are
   * downscales of the 5504x3072 master, so `width` is the truth and neither
   * declares a native-detail shortfall.
   */
  it("ships a downscale-only ladder from the approved master", () => {
    const scene = requireScene(SCENE_REGISTRY, PRODUCTION_OFFICE_SCENE_ID);
    expect(scene.raster).not.toBeNull();
    for (const tier of scene.raster!.ladder.tiers) {
      expect(tier.derivation).toBe("deterministic-downscale");
      expect(tier.nativeDetailWidth).toBeUndefined();
      expect(fs.existsSync(path.join(REPO_ROOT, tier.path))).toBe(true);
    }
    // The master itself is in the repository, not only in Drive.
    expect(
      fs.existsSync(
        path.join(
          REPO_ROOT,
          "art/references/masters/scene-environment/OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg",
        ),
      ),
    ).toBe(true);
  });

  /**
   * The point of the whole exercise. Nothing about the production scene's
   * geometry may be inherited from the fixture: they are different rooms, and a
   * shared number would mean one of them was assumed rather than measured.
   */
  it("shares no geometry with the development fixture", () => {
    const production = requireScene(SCENE_REGISTRY, PRODUCTION_OFFICE_SCENE_ID);
    const fixture = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);

    expect(production.plate).not.toEqual(fixture.plate);
    expect(production.standardBodyWidthPercent).not.toBe(
      fixture.standardBodyWidthPercent,
    );
    expect(production.floorCalibration).not.toEqual(fixture.floorCalibration);

    const fixtureAnchorIds = new Set(fixture.anchors.keys());
    for (const id of production.anchors.keys()) {
      expect(fixtureAnchorIds.has(id), id).toBe(false);
    }
    // Deliberately NOT asserted: that no floor line coincides numerically.
    // The production room's mid-floor anchor measures 82%, and the fixture also
    // happens to declare an 82% floor line for an unrelated anchor in an
    // unrelated room. Two rooms photographed at ordinary height can genuinely
    // share a percentage, and requiring them not to would mean nudging a
    // measured number to satisfy a test — the exact habit this scene exists to
    // end. Provenance is proved by the ramp, the plate and the anchor set
    // above, not by forbidding coincidence.
  });

  /**
   * The production library may not see development fixtures. This is the check
   * that stops a DEV mannequin being drawn on a production plate when no
   * production component of that kind exists yet.
   */
  it("hides every development fixture from the production library", () => {
    for (const component of PRODUCTION_ONLY_CHARACTER_LIBRARY.components.values()) {
      expect(component.fixture, component.assetId).toBe(false);
    }
  });

  /**
   * Today there is no production body, head, hair, wardrobe or footwear art, so
   * every anchor must fail closed and SAY SO. When production art arrives this
   * test is what proves it actually took the modular path.
   */
  it("fails closed on every anchor while no production body art exists", () => {
    const composition = composeProductionOffice();
    expect(composition.characters.length).toBeGreaterThan(0);
    expect(composition.hasAnyProductionPerson).toBe(false);

    for (const character of composition.characters) {
      expect(character.path, character.anchorId).toBe("placeholder");
      expect(character.plan, character.anchorId).toBeNull();
      expect(
        character.failedClosedBecause.length,
        character.anchorId,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The authored A01/B01 recipes are fixture regression art. They are keyed to
   * historical fixture appearance seeds and must never appear on the production
   * scene under any path.
   */
  it("never resolves the authored A01/B01 fixture recipes", () => {
    const composition = composeProductionOffice();
    for (const character of composition.characters) {
      expect(character.path).not.toBe("authored-fixture");
      const assetIds =
        character.plan?.layers.map((layer) => layer.assetId) ?? [];
      for (const assetId of assetIds) {
        expect(assetId).not.toContain("human_candidate_A01");
        expect(assetId).not.toContain("human_candidate_B01");
        expect(assetId.startsWith("dev_")).toBe(false);
      }
    }
  });
});

/**
 * Body anchor semantics.
 *
 * Human review found the banked bodies' `hips` anchor sitting around the lower
 * abdomen. Bottoms attach to `hips`, so that is a placement defect and not a
 * label. These tests state the rule and record the defect mechanically; they do
 * NOT repair the rejected candidates, which stay structural reference evidence.
 */
describe("character body anchor semantics", () => {
  it("orders the semantic anchors down the body", () => {
    expect([...CHARACTER_SEMANTIC_ANCHOR_ORDER]).toEqual([
      "crown",
      "brow",
      "head",
      "torso",
      "hips",
      "feet",
    ]);
  });

  it("accepts a body whose garment hips sit at or below the pelvis root", () => {
    expect(
      validateProductionBodyAnchors({
        root: { convention: "pelvis-hip-center", x: 0.5, y: 0.54 },
        attachment_anchors: [
          { id: "crown", x: 0.5, y: 0.0 },
          { id: "brow", x: 0.5, y: 0.07 },
          { id: "head", x: 0.5, y: 0.13 },
          { id: "torso", x: 0.5, y: 0.3 },
          { id: "hips", x: 0.5, y: 0.55 },
          { id: "feet", x: 0.5, y: 0.997 },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects a garment hips anchor placed above the pelvis root", () => {
    const errors = validateProductionBodyAnchors(
      {
        root: { convention: "pelvis-hip-center", x: 0.5, y: 0.54 },
        attachment_anchors: [
          { id: "crown", x: 0.5, y: 0.0 },
          { id: "brow", x: 0.5, y: 0.05 },
          { id: "head", x: 0.5, y: 0.13 },
          { id: "torso", x: 0.5, y: 0.2 },
          { id: "hips", x: 0.5, y: 0.35 },
          { id: "feet", x: 0.5, y: 0.997 },
        ],
      },
      "example",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("above the pelvis root");
  });

  /**
   * The defect, pinned as evidence rather than fixed.
   *
   * Both banked bodies fail the production rule: their `hips` anchor is roughly
   * a fifth of body height above their own pelvis root. If a future pass
   * "repairs" these coordinates to make this test pass, that is promotion of
   * rejected art by the back door, and the test name says so.
   */
  it("records that the banked gray bodies fail the production anchor rule and are not repaired", () => {
    const bodies = manifest.assets.filter(
      (asset) =>
        asset.candidate_component?.kind === "body" &&
        (asset.candidate_component.attachment_anchors?.length ?? 0) > 0,
    );
    expect(bodies).toHaveLength(2);

    for (const body of bodies) {
      const definition = body.candidate_component!;
      const errors = validateProductionBodyAnchors(definition, body.asset_id);
      expect(errors.length, body.asset_id).toBeGreaterThan(0);
      expect(errors.join(" ")).toContain("above the pelvis root");

      // And the record says out loud that these coordinates are not to be
      // inherited or repaired.
      const notes = (body.negative_constraints ?? []).join(" ");
      expect(notes).toContain("NON-AUTHORITATIVE");
      expect(notes).toContain("not to be repaired for promotion");
    }
  });
});
