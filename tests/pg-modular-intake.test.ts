import fs from "fs";
import os from "os";
import path from "path";

import * as PImage from "pureimage";
import { describe, expect, it } from "vitest";

import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import {
  deriveOfficeRuntimePlate,
  OFFICE_FOREGROUND_REGIONS,
} from "../scripts/art-asset-factory/office-plate-derive";
import {
  BODY_KEYING,
  COMPONENT_KEYING,
  keyNeutralBackground,
  measureBodyRig,
  measureFaceGap,
  opaqueBounds,
  PG_BODY_RUNTIME_HEIGHT,
  PG_BODY_SPECS,
  PG_COMPONENT_SPECS,
  PG_MASTER_SOURCE_DIRECTORY,
  runPgModularIntake,
} from "../scripts/art-asset-factory/pg-modular-intake";
import { measureSeatedContact } from "../scripts/art-asset-factory/seated-contact";
import type {
  AssetManifest,
  CharacterCatalogData,
  ProvenanceData,
} from "../scripts/art-asset-factory/schemas";
import { computeCharacterGenerationSignature } from "../src/presentation/character-components";
import { CHARACTER_VISUAL_RECIPES } from "../src/presentation/visual-integration";

const REPO_ROOT = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), "utf-8"));
}

function bitmap(width: number, height: number, fill: [number, number, number]) {
  const image = PImage.make(width, height);
  for (let index = 0; index < width * height; index += 1) {
    image.data[index * 4] = fill[0];
    image.data[index * 4 + 1] = fill[1];
    image.data[index * 4 + 2] = fill[2];
    image.data[index * 4 + 3] = 255;
  }
  return image;
}

function paint(
  image: ReturnType<typeof PImage.make>,
  x0: number,
  y0: number,
  w: number,
  h: number,
  rgb: [number, number, number],
) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const offset = (y * image.width + x) * 4;
      image.data[offset] = rgb[0];
      image.data[offset + 1] = rgb[1];
      image.data[offset + 2] = rgb[2];
      image.data[offset + 3] = 255;
    }
  }
}

describe("PG modular asset intake", () => {
  const manifest = loadJson<AssetManifest>("art/manifest/asset_manifest.json");
  const provenance = loadJson<ProvenanceData>("art/manifest/provenance.json");
  const catalog = loadJson<CharacterCatalogData>(
    "art/manifest/character_catalog.json",
  );

  it("keys a neutral background per row, keeps colored content, and removes neutral shadows only when asked", () => {
    const image = bitmap(60, 40, [224, 224, 224]);
    paint(image, 20, 10, 20, 12, [30, 80, 160]); // blue garment
    paint(image, 20, 22, 20, 4, [190, 190, 190]); // soft neutral shadow
    paint(image, 0, 30, 60, 10, [200, 200, 200]); // floor band (row gradient)

    const garment = keyNeutralBackground(image, COMPONENT_KEYING);
    expect(garment.data[(15 * 60 + 30) * 4 + 3]).toBe(255); // inside garment
    expect(garment.data[(5 * 60 + 5) * 4 + 3]).toBe(0); // background
    expect(garment.data[(24 * 60 + 30) * 4 + 3]).toBe(0); // shadow suppressed
    expect(garment.data[(35 * 60 + 30) * 4 + 3]).toBe(0); // floor keyed per row

    const body = keyNeutralBackground(image, BODY_KEYING);
    expect(body.data[(24 * 60 + 30) * 4 + 3]).toBe(255); // shadow kept for bodies
    expect(opaqueBounds(garment)).toEqual({
      x: 20,
      y: 10,
      width: 20,
      height: 12,
    });
  });

  it("measures a synthetic mannequin rig in anatomical order", () => {
    const image = bitmap(100, 200, [224, 224, 224]);
    const gray: [number, number, number] = [150, 150, 150];
    paint(image, 42, 5, 16, 20, gray); // head
    paint(image, 46, 25, 8, 8, gray); // neck
    paint(image, 30, 33, 40, 50, gray); // torso with shoulders
    paint(image, 20, 33, 8, 60, gray); // arms
    paint(image, 72, 33, 8, 60, gray);
    paint(image, 36, 83, 28, 10, gray); // waist
    paint(image, 34, 93, 12, 90, gray); // legs
    paint(image, 54, 93, 12, 90, gray);
    paint(image, 30, 183, 18, 6, gray); // feet
    paint(image, 52, 183, 18, 6, gray);
    const keyed = keyNeutralBackground(image, BODY_KEYING);
    const rig = measureBodyRig(keyed);
    expect(rig.headTop).toBe(5);
    expect(rig.neckRow).toBeGreaterThan(rig.headTop);
    expect(rig.shoulderRow).toBeGreaterThan(rig.neckRow);
    expect(rig.waistRow).toBeGreaterThan(rig.shoulderRow);
    expect(rig.crotchRow).toBeGreaterThan(rig.waistRow);
    expect(rig.soleRow).toBe(188);
    expect(rig.headWidth).toBe(16);
    expect(rig.shoulderWidth).toBeGreaterThanOrEqual(40);
    expect(rig.centerX).toBe(50);
  });

  it("measures a hair face gap at cheek level", () => {
    const image = bitmap(120, 100, [224, 224, 224]);
    const dark: [number, number, number] = [40, 30, 20];
    paint(image, 10, 0, 100, 30, dark); // cap (above the 25% scan guard)
    paint(image, 10, 30, 25, 60, dark); // left fall
    paint(image, 85, 30, 25, 60, dark); // right fall
    const gap = measureFaceGap(keyNeutralBackground(image, COMPONENT_KEYING));
    expect(gap).not.toBeNull();
    expect(gap!.width).toBe(50);
    expect(gap!.centerX).toBeCloseTo(59.5, 5);
    expect(gap!.topY).toBe(30);
    expect(gap!.bottomY).toBe(89);
    expect(
      measureFaceGap(
        keyNeutralBackground(bitmap(40, 40, [224, 224, 224]), COMPONENT_KEYING),
      ),
    ).toBeNull();
  });

  it("leaves every source master byte-identical to the hash recorded in provenance", () => {
    const masters = fs
      .readdirSync(path.join(REPO_ROOT, PG_MASTER_SOURCE_DIRECTORY), {
        recursive: true,
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".png"));
    expect(masters.length).toBe(
      PG_BODY_SPECS.length + PG_COMPONENT_SPECS.length,
    );
    for (const entry of masters) {
      const filePath = path.join(entry.parentPath ?? entry.path, entry.name);
      const relative = path.relative(REPO_ROOT, filePath);
      const hash = hashArtFile(filePath);
      const cited = provenance.entries.filter(
        (item) => item.source_url_or_path === relative,
      );
      expect(cited.length, relative).toBeGreaterThan(0);
      for (const item of cited) {
        expect(item.document_photo_plan_title).toContain(
          `master sha256 ${hash}`,
        );
      }
    }
  });

  it("reproduces every released production candidate and the generation-2 signature deterministically", async () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pg-modular-"));
    const outputs = await runPgModularIntake(
      REPO_ROOT,
      path.relative(REPO_ROOT, path.join(scratch, "out")),
    );
    expect(outputs).toHaveLength(35);
    for (const output of outputs) {
      const released = manifest.assets.find(
        (asset) => asset.asset_id === output.assetId,
      );
      expect(released, output.assetId).toBeDefined();
      expect(released!.hash).toBe(output.hash);
      expect(released!.runtime_release_status).toBe("released");
      expect(released!.availability).toBe("production-candidate");
      expect(released!.component).toEqual(output.definition);
      expect(hashArtFile(path.join(REPO_ROOT, released!.final_path!))).toBe(
        output.hash,
      );
      expect(output.definition.canvas.height).toBeLessThanOrEqual(
        PG_BODY_RUNTIME_HEIGHT,
      );
    }
    const generation = catalog.generations.find(
      (entry) => entry.generation === 2,
    )!;
    expect(generation.signature).toBe(
      computeCharacterGenerationSignature(outputs),
    );
    expect(generation.component_ids).toEqual(
      outputs.map((o) => o.assetId).sort(),
    );
    expect(
      manifest.assets.filter((a) => a.availability === "development-fixture"),
    ).toHaveLength(16);
  }, 120_000);

  it("derives body rigs whose anchors and root are ordered and inside the canvas", () => {
    for (const spec of PG_BODY_SPECS) {
      const body = manifest.assets.find(
        (a) => a.asset_id === `pg_body_${spec.suffix}_standing_v1`,
      )!;
      const anchors = Object.fromEntries(
        body.component!.attachment_anchors!.map((a) => [a.id, a.y]),
      );
      expect(anchors.crown).toBeLessThan(anchors.brow!);
      expect(anchors.brow).toBeLessThan(anchors.head!);
      expect(anchors.head).toBeLessThan(anchors.torso!);
      expect(anchors.torso).toBeLessThan(anchors.hips!);
      expect(anchors.hips).toBeLessThan(body.component!.root!.y);
      expect(body.component!.root!.y).toBeLessThan(anchors.feet!);
      expect(anchors.feet).toBeLessThanOrEqual(1);
      expect(body.component!.pose_family).toBe("standing-neutral");
    }
  });
});

describe("Office seated-contact repair", () => {
  const manifest = loadJson<AssetManifest>("art/manifest/asset_manifest.json");

  it("declares A01/B01 roots on the measured seat-contact line of each raster", async () => {
    for (const [recipe, file] of [
      [
        CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
        "human_candidate_A01_primary_desk_seated_v1.png",
      ],
      [
        CHARACTER_VISUAL_RECIPES.leftGuestSeated,
        "human_candidate_B01_left_guest_seated_v1.png",
      ],
    ] as const) {
      const measured = await measureSeatedContact(
        path.join(REPO_ROOT, "art/generated/approved", file),
      );
      expect(Math.abs(recipe.root.y - measured.root.y)).toBeLessThan(0.01);
      expect(Math.abs(recipe.root.x - measured.root.x)).toBeLessThan(0.01);
      expect(recipe.seatedContact.root).toEqual(recipe.root);
      // The seat line sits in the lower half of the figure, never mid-torso.
      expect(recipe.root.y).toBeGreaterThan(0.58);
    }
  });

  it("keeps the primary chair out of the foreground occluder while still covering the desk", async () => {
    const worktop = OFFICE_FOREGROUND_REGIONS.find(
      (r) => r.id === "primary-desk-worktop",
    )!;
    expect(Math.max(...worktop.points.map((p) => p.x))).toBeLessThanOrEqual(
      748,
    );
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "office-plate-"));
    const runtime = path.join(scratch, "runtime.png");
    const mask = path.join(scratch, "mask.png");
    await deriveOfficeRuntimePlate(
      path.join(
        REPO_ROOT,
        "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_v1.png",
      ),
      runtime,
      mask,
    );
    const released = manifest.assets.find(
      (a) =>
        a.asset_id ===
        "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
    )!;
    expect(hashArtFile(mask)).toBe(released.hash);
    const image = await PImage.decodePNGFromStream(fs.createReadStream(mask));
    const alphaAt = (x: number, y: number) =>
      image.data[(y * 2 * image.width + x * 2) * 4 + 3] ?? 0;
    // Chair back and seat (source-plate coordinates) are transparent again.
    expect(alphaAt(830, 330)).toBe(0);
    expect(alphaAt(815, 395)).toBe(0);
    expect(alphaAt(860, 360)).toBe(0);
    // The desk corner in front of the figure stays opaque.
    expect(alphaAt(700, 340)).toBe(255);
    expect(alphaAt(560, 420)).toBe(255);
  }, 120_000);
});
