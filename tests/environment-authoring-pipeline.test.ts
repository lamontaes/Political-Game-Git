import fs from "fs";
import os from "os";
import path from "path";
import * as PImage from "pureimage";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { serializeAssetBankManifest } from "../src/authoring/asset-bank";
import { toCanonicalJson } from "../src/authoring/canonical-json";
import {
  createSceneAuthoringScaffold,
  evaluateScaffoldReadiness,
} from "../src/authoring/scene-scaffold";
import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import { runEnvironmentIntake } from "../scripts/art-asset-factory/environment-intake";
import {
  deriveRuntimeTiers,
  tierHashMap,
} from "../scripts/art-asset-factory/tier-derive";

/**
 * End-to-end proof over REAL PIXELS.
 *
 * The masters are small so the suite stays fast: pure-JS Lanczos over a 4096px
 * plate is minutes of work, and none of the properties under test — no
 * enlargement, byte determinism, an untouched master, honest lineage — depend
 * on the picture being large. The size contract itself is exercised through the
 * intake unit tests, where dimensions are data rather than pixels.
 */

let workspace: string;

/**
 * A deterministic test master: a fixed gradient with a hard-edged block, so a
 * resample that silently changed kernel or gamma would move the hash.
 */
async function writeMaster(
  filePath: string,
  width: number,
  height: number,
): Promise<void> {
  const bitmap = PImage.make(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const inBlock =
        x > width * 0.3 &&
        x < width * 0.6 &&
        y > height * 0.4 &&
        y < height * 0.8;
      bitmap.data[offset] = inBlock ? 20 : Math.round((x / width) * 255);
      bitmap.data[offset + 1] = inBlock ? 200 : Math.round((y / height) * 255);
      bitmap.data[offset + 2] = inBlock ? 90 : 128;
      bitmap.data[offset + 3] = 255;
    }
  }
  await PImage.encodePNGToStream(bitmap, fs.createWriteStream(filePath));
}

beforeAll(async () => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "authoring-pipeline-"));
  fs.mkdirSync(path.join(workspace, "masters"), { recursive: true });
  await writeMaster(path.join(workspace, "masters", "plate.png"), 256, 144);
  // Narrower than even the smallest requested tier, so no standard width fits.
  await writeMaster(path.join(workspace, "masters", "small.png"), 48, 27);
});

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

const LADDER = [64, 128, 256, 512] as const;

async function derive(
  outputName: string,
  nativeDetailWidth: number | null | "assume-native" = "assume-native",
) {
  return deriveRuntimeTiers({
    assetId: "env_test_plate",
    masterPath: path.join(workspace, "masters", "plate.png"),
    outputDirectory: path.join(workspace, outputName),
    nativeDetailWidth,
    requestedWidths: LADDER,
    repositoryRoot: workspace,
  });
}

describe("tier derivation over real pixels", () => {
  it("derives every tier the master can fill and skips the one it cannot", async () => {
    const result = await derive("tiers-a");
    expect(result.derived.map((tier) => tier.width)).toEqual([64, 128, 256]);
    expect(result.plan.skipped.map((tier) => tier.width)).toEqual([512]);
    expect(result.plan.skipped[0]!.reason).toBe("would-enlarge-master");
  });

  it("writes files whose real dimensions match the plan", async () => {
    const result = await derive("tiers-dims");
    for (const tier of result.derived) {
      const absolute = path.join(workspace, tier.path);
      expect(fs.existsSync(absolute)).toBe(true);
      const bitmap = await PImage.decodePNGFromStream(
        fs.createReadStream(absolute),
      );
      expect(bitmap.width).toBe(tier.width);
      expect(bitmap.height).toBe(tier.height);
      // Nothing wider than the master was ever written.
      expect(bitmap.width).toBeLessThanOrEqual(256);
    }
  });

  it("preserves the source aspect at every derived tier", async () => {
    const result = await derive("tiers-aspect");
    for (const tier of result.derived) {
      expect(tier.width / tier.height).toBeCloseTo(256 / 144, 2);
    }
  });

  it("produces byte-identical tiers when the same command is re-run", async () => {
    // Same master, same metadata, same destination: the whole artefact must
    // reproduce, not merely the pixel content.
    const first = await derive("tiers-rerun");
    const second = await derive("tiers-rerun");
    expect(second.derived.map((tier) => tier.hash)).toEqual(
      first.derived.map((tier) => tier.hash),
    );
    expect(toCanonicalJson(second.plan)).toBe(toCanonicalJson(first.plan));
  });

  it("produces the same pixels regardless of where the tiers are written", async () => {
    const first = await derive("tiers-place-a");
    const second = await derive("tiers-place-b");
    expect(second.derived.map((tier) => tier.hash)).toEqual(
      first.derived.map((tier) => tier.hash),
    );
  });

  it("never overwrites the approved master", async () => {
    const masterPath = path.join(workspace, "masters", "plate.png");
    const before = hashArtFile(masterPath);
    const result = await derive("tiers-master-safe");
    expect(result.masterHashBefore).toBe(before);
    expect(result.masterHashAfter).toBe(before);
    for (const tier of result.derived) {
      expect(path.resolve(workspace, tier.path)).not.toBe(masterPath);
    }
  });

  it("carries an external upscale's lineage into the tiers it taints", async () => {
    const result = await derive("tiers-upscaled", 128);
    const byWidth = new Map(result.derived.map((tier) => [tier.width, tier]));
    expect(byWidth.get(64)!.derivation).toBe("deterministic-downscale");
    expect(byWidth.get(64)!.nativeDetailWidth).toBeUndefined();
    expect(byWidth.get(256)!.derivation).toBe("external-upscale-derivative");
    expect(byWidth.get(256)!.nativeDetailWidth).toBe(128);
  });

  it("reports unverified detail rather than assuming the master's pixels", async () => {
    const result = await derive("tiers-unverified", null);
    expect(result.plan.nativeDetailWidth).toBeNull();
    expect(result.plan.warnings.map((w) => w.code)).toContain(
      "native-detail-unverified",
    );
  });

  it("builds only the master's own tier when it is below every requested width", async () => {
    const result = await deriveRuntimeTiers({
      assetId: "env_test_small",
      masterPath: path.join(workspace, "masters", "small.png"),
      outputDirectory: path.join(workspace, "tiers-small"),
      nativeDetailWidth: "assume-native",
      requestedWidths: LADDER,
      repositoryRoot: workspace,
    });
    expect(result.derived.map((tier) => tier.width)).toEqual([48]);
    expect(result.derived[0]!.derivation).toBe("native-master");
    expect(result.plan.warnings.map((w) => w.code)).toContain(
      "master-below-smallest-tier",
    );
    expect(result.plan.skipped.map((tier) => tier.width)).toEqual([...LADDER]);
  });
});

describe("intake reads declarations, not filenames", () => {
  function writeRequest(name: string, candidates: unknown[]): string {
    const directory = path.join(workspace, name);
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync(
      path.join(workspace, "masters", "plate.png"),
      path.join(directory, "plate.png"),
    );
    const requestPath = path.join(directory, "request.json");
    fs.writeFileSync(
      requestPath,
      JSON.stringify({ requestVersion: 1, batchId: name, candidates }, null, 2),
    );
    return requestPath;
  }

  it("catalogues a declared reference asset and measures it honestly", () => {
    const requestPath = writeRequest("intake-reference", [
      {
        asset_id: "ref_plate",
        file: "plate.png",
        target_class: "reference",
        lineage_class: "reference-only",
        native_detail_state: "unverified",
        rights_status: "unknown",
      },
    ]);
    const { report } = runEnvironmentIntake(requestPath, workspace);
    expect(report.records).toHaveLength(1);
    const record = report.records[0]!;
    expect(record.disposition).toBe("reference");
    expect(record.width).toBe(256);
    expect(record.height).toBe(144);
    expect(record.contentHash).toHaveLength(64);
    expect(record.format).toBe("png");
  });

  it("rejects an undersized environment plate and says how short it is", () => {
    const requestPath = writeRequest("intake-undersized", [
      {
        asset_id: "env_plate",
        file: "plate.png",
        target_class: "environment-plate",
        lineage_class: "original-master",
        native_detail_state: "native",
        rights_status: "owned",
      },
    ]);
    const { report } = runEnvironmentIntake(requestPath, workspace);
    const record = report.records[0]!;
    expect(record.disposition).toBe("reject");
    expect(record.findings.map((f) => f.code)).toContain(
      "master-width-below-minimum",
    );
  });

  it("reports an undeclared file instead of adopting it", () => {
    const requestPath = writeRequest("intake-stray", [
      {
        asset_id: "ref_plate",
        file: "plate.png",
        target_class: "reference",
        lineage_class: "reference-only",
        native_detail_state: "unverified",
      },
    ]);
    fs.copyFileSync(
      path.join(workspace, "masters", "small.png"),
      path.join(path.dirname(requestPath), "mystery_office_plate.png"),
    );
    const result = runEnvironmentIntake(requestPath, workspace);
    expect(result.report.records).toHaveLength(1);
    expect(result.undeclaredFiles).toHaveLength(1);
    expect(result.undeclaredFiles[0]).toContain("mystery_office_plate.png");
  });

  it("rejects a file the request names but disk does not have", () => {
    const directory = path.join(workspace, "intake-missing");
    fs.mkdirSync(directory, { recursive: true });
    const requestPath = path.join(directory, "request.json");
    fs.writeFileSync(
      requestPath,
      JSON.stringify({
        requestVersion: 1,
        batchId: "intake-missing",
        candidates: [
          {
            asset_id: "env_absent",
            file: "absent.png",
            target_class: "environment-plate",
            lineage_class: "original-master",
            native_detail_state: "native",
          },
        ],
      }),
    );
    const { report } = runEnvironmentIntake(requestPath, workspace);
    expect(report.records[0]!.disposition).toBe("reject");
    expect(report.records[0]!.findings.map((f) => f.code)).toContain(
      "unreadable-dimensions",
    );
  });

  it("seeds an asset bank with nothing assessed, deterministically", () => {
    const requestPath = writeRequest("intake-bank", [
      {
        asset_id: "ref_plate",
        file: "plate.png",
        target_class: "reference",
        lineage_class: "reference-only",
        native_detail_state: "unverified",
      },
    ]);
    const first = runEnvironmentIntake(requestPath, workspace);
    const second = runEnvironmentIntake(requestPath, workspace);
    expect(serializeAssetBankManifest(second.assetBank)).toBe(
      serializeAssetBankManifest(first.assetBank),
    );
    const entry = first.assetBank.entries[0]!;
    expect(entry.bakedPeople).toBe("unassessed");
    expect(entry.disposition).toBe("undecided");
    expect(entry.width).toBe(256);
    expect(toCanonicalJson(second.report)).toBe(toCanonicalJson(first.report));
  });
});

describe("a derived ladder reaches the scene scaffold intact", () => {
  it("carries tier hashes and declared lineage into the scaffold's raster", async () => {
    const result = await derive("tiers-scaffold", 128);
    const scaffold = createSceneAuthoringScaffold({
      sceneId: "test-scene",
      label: "Test scene",
      plate: { width: 256, height: 144 },
      tierPlan: result.plan,
      tierHashes: tierHashMap(result),
      assetId: "env_test_plate",
      plannedAnchors: [
        { id: "standing", type: "position", kind: "floor-standing" },
      ],
    });

    expect(scaffold.raster).not.toBeNull();
    expect(scaffold.raster!.tiers.map((tier) => tier.width)).toEqual([
      64, 128, 256,
    ]);
    for (const tier of scaffold.raster!.tiers) {
      expect(tier.hash).toMatch(/^[a-f0-9]{64}$/);
    }
    const top = scaffold.raster!.tiers.find((tier) => tier.width === 256)!;
    expect(top.derivation).toBe("external-upscale-derivative");
    expect(top.native_detail_width).toBe(128);

    // The picture is settled; the geometry is not, and the scaffold says so.
    const readiness = evaluateScaffoldReadiness(scaffold);
    expect(readiness.registrable).toBe(false);
    expect(readiness.gaps.map((gap) => gap.path)).toContain(
      "anchors.standing.floorContact",
    );
  });
});
