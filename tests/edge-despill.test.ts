import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import despillReport from "../art/qa/p76/edge_despill_report.json";
import {
  classifyDespill,
  despillGreenEdge,
  DEFAULT_DESPILL_OPTIONS,
} from "../scripts/art-asset-factory/edge-despill";

/**
 * The salvage, held to the promises it makes.
 *
 * Eight body poses were classified REVISE for a green matte edge, and the
 * obvious response — eight new generations — turned out to be the wrong one:
 * the contamination is entirely on the boundary and the interiors are clean, so
 * a deterministic despill clears it. What makes that a repair rather than a
 * retouch is that the operation cannot change the figure, and this is where
 * that is checked rather than asserted in prose.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

describe("The green-edge despill repairs the edge and nothing else", () => {
  it("leaves the silhouette and the interior byte-identical", () => {
    for (const entry of despillReport.entries) {
      // Alpha untouched means the morphology and the pose are untouched. There
      // is no tolerance here on purpose: a despill that moved one alpha byte
      // moved the body, and that is a different operation.
      expect(
        entry.report.alphaSha256After,
        `${entry.assetId} changed its silhouette`,
      ).toBe(entry.report.alphaSha256Before);
      expect(
        entry.report.interiorRgbSha256After,
        `${entry.assetId} changed an interior pixel`,
      ).toBe(entry.report.interiorRgbSha256Before);
    }
  });

  it("clears the defect the intake actually measured", () => {
    for (const entry of despillReport.entries) {
      expect(
        entry.report.softEdgeGreenPercentBefore,
        `${entry.assetId} was not contaminated to begin with`,
      ).toBeGreaterThan(50);
      expect(
        entry.report.softEdgeGreenPercentAfter,
        `${entry.assetId} still carries green fringe`,
      ).toBeLessThanOrEqual(0.5);
      expect(entry.disposition).toBe("SALVAGEABLE BY DETERMINISTIC DESPILL");
    }
  });

  it("reproduces its own output from the source it names", () => {
    // The report is an artifact rather than a run log, so re-running the
    // operation on the recorded source has to land on the recorded numbers.
    const entry = despillReport.entries[0]!;
    const source = PNG.sync.read(
      fs.readFileSync(path.join(REPOSITORY_ROOT, entry.source)),
    );
    const { report } = despillGreenEdge(source, DEFAULT_DESPILL_OPTIONS);
    expect(report.pixelsReconstructed).toBe(entry.report.pixelsReconstructed);
    expect(report.alphaSha256After).toBe(entry.report.alphaSha256After);
    expect(report.softEdgeGreenPercentAfter).toBeCloseTo(
      entry.report.softEdgeGreenPercentAfter,
      6,
    );
  });

  it("protects a garment that is genuinely green", () => {
    // The reason the operation is safe on a figure wearing green, built rather
    // than argued: a solid green torso with a green matte edge. The interior is
    // green at full alpha, which is what green material looks like, so the
    // distance gate engages and the interior digest cannot move.
    const width = 64;
    const height = 64;
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const inside = x >= 8 && x < 56 && y >= 8 && y < 56;
        const edge = inside && (x < 10 || x >= 54 || y < 10 || y >= 54);
        png.data[offset] = inside ? 40 : 0;
        png.data[offset + 1] = inside ? 160 : 0;
        png.data[offset + 2] = inside ? 50 : 0;
        png.data[offset + 3] = inside ? (edge ? 120 : 255) : 0;
      }
    }
    const { report } = despillGreenEdge(png, DEFAULT_DESPILL_OPTIONS);
    expect(report.materialGreenInteriorPixels).toBeGreaterThan(
      report.materialGreenFloor,
    );
    expect(report.boundaryGateApplied).toBe(true);
    expect(report.interiorRgbSha256After).toBe(report.interiorRgbSha256Before);
  });

  it("classifies a run that moved the silhouette as unsalvageable", () => {
    // The classifier is not allowed to call something salvaged on the strength
    // of the colour numbers alone.
    const base = despillReport.entries[0]!.report;
    expect(
      classifyDespill({
        ...base,
        alphaSha256After: "different",
      } as typeof base),
    ).toBe("RE-EXPORT PREFERRED");
    expect(
      classifyDespill({
        ...base,
        interiorRgbSha256After: "different",
      } as typeof base),
    ).toBe("RE-EXPORT PREFERRED");
  });
});
