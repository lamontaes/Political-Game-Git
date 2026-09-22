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
  measureCandidateBodyLandmarks,
  runtimeBodyRecord,
  writeOrCheckWardrobePng,
} from "../scripts/art-asset-factory/wave-a-wardrobe";
import {
  measureBodyRig,
  PG_COMPONENT_SPECS,
} from "../scripts/art-asset-factory/pg-modular-intake";
import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import type { CharacterComponentManifestRecord } from "../src/presentation/character-components";

const root = path.resolve(import.meta.dirname, "..");

describe("Wave A wardrobe derivation", () => {
  /**
   * Named rather than taken by index. This used to read `registry.assets[0]`,
   * and admitting ten more bodies moved a different body into that slot — one
   * whose legs part at the shins, so the case failed on a body it was never
   * about. An index into a generated file is not a subject.
   */
  const bodyNamed = (assetId: string) =>
    registry.assets.find(
      (record) => record.asset_id === assetId,
    ) as CharacterComponentManifestRecord;

  it("reproduces a normalized body's bytes without touching its source", async () => {
    const admitted = bodyNamed(
      "wave_a_average_man_standing_neutral_front_a_v1",
    );
    const source = path.join(root, admitted.final_path!);
    const before = hashArtFile(source);
    const a = await deriveRuntimeBody(root, admitted, undefined, true);
    expect(a.scale).toBeLessThanOrEqual(1);
    expect(a.bitmap.height).toBe(960);
    expect(
      runtimeBodyRecord(a, hashArtFile(path.join(root, a.repositoryPath))),
    ).toEqual(wardrobe.assets.find((r) => r.asset_id === a.assetId));
    expect(hashArtFile(source)).toBe(before);
  });

  /**
   * The two halves of the enlargement rule, which are easy to confuse.
   *
   * Nothing is ever enlarged. But a pairing that WOULD need enlarging can
   * already exist in the bank as a retained historical output, and for those
   * the writer verifies the banked hash instead of making new pixels. So the
   * same garment on the same-sized body is a pass on one body and a refusal on
   * another, and the discriminator is whether a retained output exists — not
   * the size. Both halves are asserted, because an unconditional refusal here
   * is what stopped this pipeline from being runnable at all.
   */
  const crewTee = PG_COMPONENT_SPECS.find(
    (spec) => spec.idStem === "pg_top_001_short_sleeve_crew_tee",
  )!;

  it("verifies a retained enlarged garment rather than remaking it", async () => {
    const body = await deriveRuntimeBody(
      root,
      bodyNamed("wave_a_average_man_standing_neutral_front_a_v1"),
      undefined,
      true,
    );
    const garment = await deriveGarment(
      root,
      crewTee,
      body,
      1,
      undefined,
      true,
    );
    expect(garment.scaleX > 1 || garment.scaleY > 1).toBe(true);
    expect(
      wardrobe.assets.some((record) => record.asset_id === garment.assetId),
    ).toBe(true);
  });

  it("refuses an enlarged garment that was never banked", async () => {
    const body = await deriveRuntimeBody(
      root,
      bodyNamed("ocd_body_adult_fem_standing_neutral_a_v1"),
      undefined,
      true,
    );
    await expect(
      deriveGarment(root, crewTee, body, 1, undefined, true),
    ).rejects.toThrow("does not enlarge a raster");
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
    expect(wardrobe.assets).toHaveLength(89);
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
    // A seated body turned away from square keeps its shirt off too: a flat
    // lay drawn for a torso square to camera has no side seam to give a torso
    // that shows one. Asserted as the contract, because the turned bodies are
    // separately blocked by size today and a larger master must not quietly
    // start fitting square clothes to turned people.
    expect(kindsForPose("seated-guest-three-quarter-right").allowed).toEqual(
      [],
    );
    expect(
      kindsForPose("seated-guest-three-quarter-right").refused.map(
        (r) => r.kind,
      ),
    ).toEqual(["top", "bottom", "footwear"]);
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

  /**
   * Every admitted body is accounted for, either derived or named as not.
   *
   * The point is the arithmetic rather than the four. A body that produced no
   * runtime form used to abort the whole run; it now does not, and the hazard
   * that replaces the crash is a body quietly going missing. So the two lists
   * are required to cover the registry exactly: a body in neither would be one
   * that disappeared, and this is the assertion that would catch it.
   */
  it("accounts for every admitted body, derived or refused by name", () => {
    const derived = new Set(
      report.bodies.map((body) => body.admitted_asset_id),
    );
    const underived = new Set(
      report.bodies_underived.map((body) => body.assetId),
    );
    for (const record of registry.assets) {
      expect(
        derived.has(record.asset_id) || underived.has(record.asset_id),
        record.asset_id,
      ).toBe(true);
    }
    expect(derived.size + underived.size).toBe(registry.assets.length);
    // Stated, so the loop below cannot pass by having nothing to iterate.
    expect(derived.size).toBe(18);
    expect(underived.size).toBe(4);
    for (const body of report.bodies_underived) {
      expect(body.reason).toMatch(/ankle band|leg split|hip band/);
    }
  });
});

/**
 * Silhouettes drawn row by row, so a body that never parts into two legs can be
 * measured without a plate that does not exist in this checkout.
 */
function silhouette(runsForRow: (y: number) => readonly [number, number][]) {
  const bitmap = PImage.make(200, 960);
  const data = bitmap.data as unknown as Uint8Array;
  data.fill(0); // PImage.make starts fully opaque; the silhouette is what we draw.
  for (let y = 0; y < 960; y += 1)
    for (const [from, to] of runsForRow(y))
      for (let x = from; x <= to; x += 1) {
        const i = (y * 200 + x) * 4;
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }
  return bitmap;
}

/** The trunk every case shares: head, neck, shoulders, waist, hips. */
function trunk(y: number): readonly [number, number][] {
  if (y < 100) return [[80, 119]];
  if (y < 130) return [[88, 111]];
  if (y < 301) return [[40, 159]];
  if (y < 401) return [[65, 134]];
  return [[50, 149]];
}

describe("body landmarks refuse a silhouette they cannot measure", () => {
  it("measures a body whose legs part below the hips", () => {
    const bitmap = silhouette((y) =>
      y < 520
        ? trunk(y)
        : [
            [40, 73],
            [127, 160],
          ],
    );
    const rig = measureBodyRig(bitmap as never);
    expect(rig.crotchSplit).toBe(true);
    const landmarks = measureCandidateBodyLandmarks(bitmap as never, rig);
    expect(landmarks.hip).toBeGreaterThan(landmarks.waist);
    expect(landmarks.hip).toBeLessThan(landmarks.crotch);
    expect(landmarks.ankle).toBeGreaterThan(landmarks.crotch);
    expect(landmarks.ankle).toBeLessThan(landmarks.sole);
  });

  it("refuses a body that never parts at the midline", () => {
    const bitmap = silhouette((y) => (y < 520 ? trunk(y) : [[60, 139]]));
    const rig = measureBodyRig(bitmap as never);
    expect(rig.crotchSplit).toBe(false);
    // The old fallback: the crotch stands at the waist and the hip pins to it.
    expect(rig.crotchRow).toBe(rig.waistRow);
    expect(() => measureCandidateBodyLandmarks(bitmap as never, rig)).toThrow(
      "never parts at the midline",
    );
  });

  it("refuses a body whose legs part only at the ankles", () => {
    const bitmap = silhouette((y) =>
      y < 941
        ? y < 520
          ? trunk(y)
          : [[60, 139]]
        : [
            [60, 89],
            [110, 139],
          ],
    );
    const rig = measureBodyRig(bitmap as never);
    expect(rig.crotchSplit).toBe(true);
    expect(rig.crotchRow).toBe(941);
    expect(() => measureCandidateBodyLandmarks(bitmap as never, rig)).toThrow(
      "ankle band to search",
    );
  });
});
