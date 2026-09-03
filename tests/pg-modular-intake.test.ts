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
import {
  CANDIDATE_REVIEW_GENERATION,
  computeCharacterGenerationSignature,
  liftCandidatesForReview,
  promoteCandidateComponent,
  validateCharacterComponentCandidates,
} from "../src/presentation/character-components";
import type { CharacterComponentManifestRecord } from "../src/presentation/character-components";
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

  it("reproduces every banked production candidate deterministically, and holds them unreleased", async () => {
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
      // Banked, reproducible, and NOT released. The bodies are untextured gray
      // mannequins, so every uncovered skin region renders gray, and there is
      // no seated master in the set. Both are visual-acceptance questions a
      // person has to answer, and the manifest says so rather than shipping.
      expect(released!.asset_type).toBe("character-component-candidate");
      expect(released!.runtime_release_status).toBe("unreleased");
      expect(released!.availability).toBe("production-candidate");
      // A banked candidate is not a catalog component: nothing that resolves a
      // person's appearance can see it.
      expect(released!.component).toBeUndefined();
      expect(
        released!.negative_constraints?.some((constraint) =>
          constraint.startsWith("Held UNRELEASED"),
        ),
        output.assetId,
      ).toBe(true);
      expect(released!.candidate_component).toEqual(output.definition);
      // ...and it is in no generation, rather than declaring one it is not in.
      // The field is absent, not zero: a candidate has no membership to state.
      expect(released!.candidate_component).not.toHaveProperty(
        "catalog_generation",
      );
      expect(output.definition).not.toHaveProperty("catalog_generation");
      expect(hashArtFile(path.join(REPO_ROOT, released!.final_path!))).toBe(
        output.hash,
      );
      expect(output.definition.canvas.height).toBeLessThanOrEqual(
        PG_BODY_RUNTIME_HEIGHT,
      );
    }
    // Not one of these appears in any catalog generation. The published
    // generations are exactly the ones PR #74 froze, and their signatures still
    // reproduce, so banking thirty-five candidates changed nobody's appearance.
    const intakeIds = new Set(outputs.map((output) => output.assetId));
    for (const generation of catalog.generations) {
      expect(
        generation.component_ids.filter((id) => intakeIds.has(id)),
      ).toEqual([]);
    }
    expect(catalog.catalog_generation).toBe(2);
    expect(
      catalog.generations.map((generation) => generation.signature),
    ).toEqual(["csig_6f0c19b1dce11425", "csig_620de59dd62c516d"]);
    expect(
      manifest.assets.filter((a) => a.availability === "development-fixture"),
    ).toHaveLength(46);
    expect(
      manifest.assets.filter((a) => a.availability === "production-candidate"),
    ).toHaveLength(35);
    // The generation signature the intake reports is over its own outputs. It
    // is the identity of the set, published so a promotion can prove it is
    // promoting the same thirty-five files it banked — not a catalog entry.
    expect(computeCharacterGenerationSignature(outputs)).toMatch(/^csig_/);
  }, 120_000);

  it("keeps banked candidates out of every generation, and assigns one only at promotion", () => {
    const candidates = (
      manifest.assets as readonly CharacterComponentManifestRecord[]
    ).filter((asset) => asset.candidate_component !== undefined);
    expect(candidates).toHaveLength(35);

    // The contract D-063 states and D-065 repaired: a banked part declares no
    // membership at all. Before the repair each of these declared generation 2
    // while the prose said they were in none, so the records and the authority
    // disagreed about the one thing banking exists to keep straight.
    for (const candidate of candidates) {
      expect(candidate.candidate_component).not.toHaveProperty(
        "catalog_generation",
      );
    }

    // And the rule has teeth against the manifest, which is JSON and cannot be
    // held to the type. A candidate that declares a generation is rejected.
    expect(validateCharacterComponentCandidates(candidates)).toEqual([]);
    const relapsed = {
      ...candidates[0],
      candidate_component: {
        ...candidates[0].candidate_component!,
        catalog_generation: 2,
      },
    } as CharacterComponentManifestRecord;
    expect(validateCharacterComponentCandidates([relapsed])).toEqual([
      `Asset '${relapsed.asset_id}' is a banked candidate and must not declare a 'catalog_generation'; a generation is assigned only when it is promoted.`,
    ]);

    // The review lift still composes them, on a generation it invents for
    // itself rather than one read off the parts.
    const review = liftCandidatesForReview(candidates, catalog.slots);
    expect(review.records).toHaveLength(35);
    expect(review.catalog.catalog_generation).toBe(CANDIDATE_REVIEW_GENERATION);
    expect(review.catalog.generations).toHaveLength(1);
    expect(review.catalog.generations[0].component_ids).toHaveLength(35);
    for (const record of review.records) {
      expect(record.component!.catalog_generation).toBe(
        CANDIDATE_REVIEW_GENERATION,
      );
    }

    // Promotion is where a generation is assigned, and it is the only place.
    const promoted = promoteCandidateComponent(candidates[0], 3);
    expect(promoted.asset_type).toBe("character-component");
    expect(promoted.candidate_component).toBeUndefined();
    expect(promoted.component!.catalog_generation).toBe(3);
    // It returns a new record and promotes nothing in the repository: the
    // thirty-five are still banked, and still await a person's eye.
    expect(candidates[0].candidate_component).not.toHaveProperty(
      "catalog_generation",
    );
    expect(
      manifest.assets.filter(
        (asset) => asset.asset_type === "character-component-candidate",
      ),
    ).toHaveLength(35);
    expect(() => promoteCandidateComponent(promoted, 3)).toThrow(
      /not a banked candidate/,
    );
    expect(() => promoteCandidateComponent(candidates[0], 0)).toThrow(
      /generation >= 1/,
    );
  });

  it("derives body rigs whose anchors and root are ordered and inside the canvas", () => {
    for (const spec of PG_BODY_SPECS) {
      const body = manifest.assets.find(
        (a) => a.asset_id === `pg_body_${spec.suffix}_standing_v1`,
      )!;
      const anchors = Object.fromEntries(
        body.candidate_component!.attachment_anchors!.map((a) => [a.id, a.y]),
      );
      expect(anchors.crown).toBeLessThan(anchors.brow!);
      expect(anchors.brow).toBeLessThan(anchors.head!);
      expect(anchors.head).toBeLessThan(anchors.torso!);
      expect(anchors.torso).toBeLessThan(anchors.hips!);
      expect(anchors.hips).toBeLessThan(body.candidate_component!.root!.y);
      expect(body.candidate_component!.root!.y).toBeLessThan(anchors.feet!);
      expect(anchors.feet).toBeLessThanOrEqual(1);
      expect(body.candidate_component!.pose_family).toBe("standing-neutral");
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
