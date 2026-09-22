import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as PImage from "pureimage";
import { describe, expect, it } from "vitest";
import registry from "../art/manifest/character_candidate_registry.json";
import wardrobe from "../art/manifest/character_candidate_wardrobe_registry.json";
import report from "../art/qa/p95-wave-a-morphology/wave-a-wardrobe-report.json";
import {
  deriveRuntimeBody,
  deriveGarment,
  kindsForPose,
  runtimeBodyRecord,
  writeOrCheckWardrobePng,
} from "../scripts/art-asset-factory/wave-a-wardrobe";
import { PG_COMPONENT_SPECS } from "../scripts/art-asset-factory/pg-modular-intake";
import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import type { CharacterComponentManifestRecord } from "../src/presentation/character-components";

const root = path.resolve(import.meta.dirname, "..");

describe("Wave A wardrobe derivation", () => {
  it("reproduces a normalized body's bytes and refuses a new enlarged garment", async () => {
    const admitted = registry.assets[0] as CharacterComponentManifestRecord;
    const source = path.join(root, admitted.final_path!);
    const before = hashArtFile(source);
    const a = await deriveRuntimeBody(root, admitted, undefined, true);
    expect(a.scale).toBeLessThanOrEqual(1);
    expect(a.bitmap.height).toBe(960);
    expect(
      runtimeBodyRecord(a, hashArtFile(path.join(root, a.repositoryPath))),
    ).toEqual(wardrobe.assets.find((r) => r.asset_id === a.assetId));
    expect(hashArtFile(source)).toBe(before);
    const spec = PG_COMPONENT_SPECS.find(
      (spec) => spec.idStem === "pg_top_001_short_sleeve_crew_tee",
    )!;
    await expect(deriveGarment(root, spec, a, 1)).rejects.toThrow(
      "requires enlargement",
    );
  });

  it("check mode rejects corrupt or missing output without rewriting it", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "people1-check-"));
    try {
      const target = path.join(dir, "sample.png");
      const bitmap = PImage.make(4, 4);
      await expect(
        writeOrCheckWardrobePng(target, bitmap, true),
      ).rejects.toThrow("out of date");
      expect(fs.existsSync(target)).toBe(false);
      await writeOrCheckWardrobePng(target, bitmap, false);
      await writeOrCheckWardrobePng(target, bitmap, true);
      fs.writeFileSync(target, "corrupt");
      await expect(
        writeOrCheckWardrobePng(target, bitmap, true),
      ).rejects.toThrow("out of date");
      expect(fs.readFileSync(target, "utf8")).toBe("corrupt");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("retains all derivatives as candidates and refuses cross-viewpoint lower garments", () => {
    expect(wardrobe.assets).toHaveLength(80);
    for (const asset of wardrobe.assets) {
      expect(asset.runtime_release_status).toBe("unreleased");
      expect(asset.asset_type).toBe("character-component-candidate");
      expect(asset.candidate_component).not.toHaveProperty(
        "catalog_generation",
      );
      expect(hashArtFile(path.join(root, asset.final_path))).toBe(asset.hash);
    }
    expect(kindsForPose("seated-guest-neutral").allowed).toEqual(["top"]);
    expect(
      kindsForPose("seated-guest-neutral").refused.map((r) => r.kind),
    ).toEqual(["bottom", "footwear"]);
    expect(report.summary.within_bound).toBe(0);
    expect(report.max_edge_error_fraction).toBe(0.03);
    // Recovered defect, not a waived generation bound: 49 retained historical
    // candidates were enlarged; the corrected writer refuses to recreate them.
    expect(
      report.garments.filter(
        (garment) => garment.scale_x > 1 || garment.scale_y > 1,
      ),
    ).toHaveLength(49);
  });
});
