import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  VERIFIED_SOURCE_SHEETS,
  buildVisual4SourceLineage,
  smallestCropByKind,
} from "./people-visual4-source-lineage";

const REPOSITORY_ROOT = path.resolve(process.cwd());

function sha256(file: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

/** Real IHDR, not the filename — one of these sheets is named after a size it is not. */
function pngDimensions(file: string): { width: number; height: number } {
  const header = Buffer.alloc(24);
  const handle = fs.openSync(file, "r");
  try {
    fs.readSync(handle, header, 0, 24, 0);
  } finally {
    fs.closeSync(handle);
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

/**
 * The large source bank is present, and a legacy-only report cannot speak for it.
 *
 * A requirements report in this directory measured the legacy pg-modular flat
 * lays, found them too small to dress a 960px body, and was read as a statement
 * about the project's garment sources in general. It was not: the bank the game
 * consumes is the p95 recent-drive-sweep sheets, which are enormous by
 * comparison. These tests pin that difference in place so the mistake cannot be
 * repeated silently — and pin the source identities so nobody is asked to
 * re-upload a file the repository already has.
 */
describe("the verified Visual4 source bank", () => {
  const sheets = VERIFIED_SOURCE_SHEETS.filter(
    (sheet) => sheet.repositoryPath !== null,
  );

  it("covers the front-on footwear sheet and the three wardrobe sheets", () => {
    expect(sheets.map((sheet) => sheet.label).sort()).toEqual([
      "female tops",
      "front-on footwear",
      "male bottoms",
      "male tops",
    ]);
  });

  it.each(sheets)(
    "still holds $label at the exact bytes that were verified",
    (sheet) => {
      const file = path.join(REPOSITORY_ROOT, sheet.repositoryPath!);
      expect(fs.existsSync(file)).toBe(true);
      expect(sha256(file)).toBe(sheet.sha256);
      expect(pngDimensions(file)).toEqual({
        width: sheet.width,
        height: sheet.height,
      });
    },
  );

  /*
   * Both footwear views stay. The owner's direction is explicit: a source
   * unsuitable for one pairing is not useless, and the front-on sheet does not
   * replace the side/angled one. Recording the side sheet with a null
   * repository path keeps that gap visible instead of letting it look settled.
   */
  it("keeps both footwear views distinct, and neither retires the other", () => {
    const views = VERIFIED_SOURCE_SHEETS.filter((sheet) =>
      sheet.label.includes("footwear"),
    );
    expect(views).toHaveLength(2);
    expect(views.map((sheet) => sheet.view).sort()).toEqual([
      "front-on",
      "side/angled",
    ]);
    const side = views.find((sheet) => sheet.view === "side/angled")!;
    expect(side.repositoryPath).toBeNull();
    expect(side.sha256).not.toBe(
      views.find((sheet) => sheet.view === "front-on")!.sha256,
    );
  });
});

describe("the lineage from sheet to runtime", () => {
  const lineage = buildVisual4SourceLineage(REPOSITORY_ROOT);

  it("links every chopped crop back to the sheet it came from", () => {
    expect(lineage.length).toBeGreaterThanOrEqual(36);
    for (const entry of lineage) {
      expect(entry.sheetSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.crop.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.crop.width).toBeGreaterThan(0);
    }
  });

  it("carries every wardrobe crop into the registry", () => {
    const wardrobe = lineage.filter((entry) =>
      ["male bottoms", "male tops", "female tops"].includes(entry.sheetLabel),
    );
    expect(wardrobe.length).toBe(36);
    for (const entry of wardrobe) {
      expect(entry.attachmentAssetId).not.toBeNull();
      expect(entry.registryAssetId).not.toBeNull();
      expect(entry.reachesRuntime).toBe(true);
    }
  });

  /*
   * Reaching the registry and being wearable are different things.
   *
   * `people-visual4.ts` writes `compatible_body_families: []` when no body
   * passed the fit measurement, and the review provider treats that empty list
   * as a measured refusal and drops the part. So a component can be fully
   * ingested, correctly derived, and still reach nobody.
   *
   * Exactly one wardrobe garment is in that state today. Pinning it by name
   * keeps it from dissolving into a percentage: it is a specific piece of art
   * the project owns, that nothing can wear, and the moment a fit is measured
   * for it this test should be updated to say so.
   */
  it("names the one wardrobe garment that fits nobody", () => {
    const wardrobe = lineage.filter((entry) =>
      ["male bottoms", "male tops", "female tops"].includes(entry.sheetLabel),
    );
    const unwearable = wardrobe
      .filter((entry) => entry.compatibleBodyFamilies.length === 0)
      .map((entry) => entry.registryAssetId);
    expect(unwearable).toEqual([
      "pv4_wave_a_female_top_burgundy_short_sleeve_polo_v1",
    ]);
    expect(wardrobe.length - unwearable.length).toBe(35);
  });

  /*
   * The number that makes the scope error impossible to repeat.
   *
   * The legacy masters crop to 108-192px. If a future reader is tempted to
   * conclude from those that the project's garment sources are too small to
   * dress a body, this is the counter-example in the same suite: the bank the
   * runtime actually consumes is several times larger in every kind.
   */
  it("offers crops far larger than the legacy masters that caused the scope error", () => {
    const smallest = smallestCropByKind(lineage);
    for (const [kind, size] of Object.entries(smallest)) {
      if (kind === "unconsumed") continue;
      expect(size.width).toBeGreaterThan(400);
      expect(size.height).toBeGreaterThan(400);
    }
    expect(Object.keys(smallest)).toEqual(
      expect.arrayContaining(["top", "bottom"]),
    );
  });

  /*
   * Footwear is chopped and exported but reaches the registry by a different
   * route than the attachment manifests — `people-visual4.ts` enumerates the
   * front-facing-footwear directory and splits each pair into left and right
   * halves. So these crops legitimately have no attachment record, and saying
   * so here stops a future reader reading the null as a missing source.
   */
  it("records the front-on footwear crops even though they take another route", () => {
    const shoes = lineage.filter(
      (entry) => entry.sheetLabel === "front-on footwear",
    );
    expect(shoes).toHaveLength(12);
    for (const entry of shoes) {
      expect(entry.crop.width).toBeGreaterThan(1000);
      expect(fs.existsSync(path.join(REPOSITORY_ROOT, entry.crop.path))).toBe(
        true,
      );
    }
  });
});
