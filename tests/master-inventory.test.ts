import fs from "fs";
import os from "os";
import path from "path";
import * as PImage from "pureimage";
import { describe, expect, it } from "vitest";

import {
  inferKindFromName,
  inferPoseFromName,
  inventoryMasters,
  pngHasAlphaChannel,
  pngHasVaryingAlpha,
  readPngHeader,
} from "../scripts/art-asset-factory/master-inventory";

/**
 * The intake tool is the gate a batch of paid generations passes through. It
 * has to be right about three things: how big a file is, whether it really has
 * transparency, and whether that clears the class minimum. All three are
 * checked here against rasters written in the test itself, so the tool's
 * verdicts are reproducible rather than asserted against art nobody can see.
 */

async function writePng(
  filePath: string,
  width: number,
  height: number,
  options: { readonly transparent: boolean },
): Promise<void> {
  const image = PImage.make(width, height);
  image.data.fill(options.transparent ? 0 : 255);
  const context = image.getContext("2d");
  context.fillStyle = "#4a3a2a";
  context.fillRect(
    Math.floor(width / 4),
    Math.floor(height / 4),
    Math.max(1, Math.floor(width / 2)),
    Math.max(1, Math.floor(height / 2)),
  );
  const stream = fs.createWriteStream(filePath);
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(image, stream);
  await finished;
}

describe("PNG measurement", () => {
  it("reads dimensions from the header without decoding the image", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "png-header-"));
    const file = path.join(directory, "probe.png");
    await writePng(file, 321, 654, { transparent: true });
    const header = readPngHeader(fs.readFileSync(file));
    expect(header).not.toBeNull();
    expect(header!.width).toBe(321);
    expect(header!.height).toBe(654);
  });

  it("returns null for a file that is not a PNG rather than throwing", () => {
    expect(readPngHeader(Buffer.from("not a png at all, really"))).toBeNull();
    expect(readPngHeader(Buffer.alloc(4))).toBeNull();
  });

  it("knows which PNG colour types carry an alpha channel", () => {
    expect(pngHasAlphaChannel(6)).toBe(true);
    expect(pngHasAlphaChannel(4)).toBe(true);
    expect(pngHasAlphaChannel(2)).toBe(false);
    expect(pngHasAlphaChannel(0)).toBe(false);
    expect(pngHasAlphaChannel(3)).toBe(false);
  });

  /**
   * A picture that only LOOKS cut out is the recorded failure mode. An alpha
   * channel that is fully opaque everywhere is exactly that, and it must not
   * be reported as transparency.
   */
  it("distinguishes real transparency from a fully opaque alpha channel", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "png-alpha-"));
    const transparent = path.join(directory, "transparent.png");
    const opaque = path.join(directory, "opaque.png");
    await writePng(transparent, 64, 64, { transparent: true });
    await writePng(opaque, 64, 64, { transparent: false });

    const readAlpha = (file: string) => {
      const buffer = fs.readFileSync(file);
      return pngHasVaryingAlpha(buffer, readPngHeader(buffer)!);
    };
    expect(readAlpha(transparent)).toBe(true);
    expect(readAlpha(opaque)).toBe(false);
  });
});

describe("component class inference", () => {
  it("recognises the classes the queue actually produces", () => {
    expect(inferKindFromName("PG-HAIR_SHORT_01_BUZZ_TRUE_ALPHA.png")).toBe(
      "hair-front",
    );
    expect(
      inferKindFromName("PG-GEMINI_HAIR_WAVY_BACK_LAYER_TRUE_ALPHA.png"),
    ).toBe("hair-back");
    expect(inferKindFromName("PG-SCENARIO_HEAD_FACE_MASC_BASE.png")).toBe(
      "head",
    );
    expect(inferKindFromName("PG-P01_STANDING_A_POSE_MASTER.png")).toBe("body");
    expect(inferKindFromName("PG_TITLE_BG_COURTROOM_CIVIC.png")).toBe(
      "environment-plate",
    );
    expect(inferKindFromName("PG_SHOE_DERBY_BLACK.png")).toBe("footwear");
  });

  it("refuses to guess a class from a name that does not say one", () => {
    expect(inferKindFromName("output_final_v3.png")).toBeNull();
  });

  it("reads the pose from a body candidate's name where it says one", () => {
    expect(inferPoseFromName("PG-P01_DESK_seated_man.png")).toBe(
      "seated-at-desk",
    );
    expect(inferPoseFromName("PG-P01_STANDING_A_POSE.png")).toBe(
      "standing-neutral",
    );
    expect(inferPoseFromName("PG-BODY_MASTER_v1.png")).toBeUndefined();
  });
});

describe("master inventory", () => {
  it("passes a compliant master and fails an undersized one, with the shortfall", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "master-inv-"));
    await writePng(path.join(directory, "PG_HAIR_GOOD.png"), 1_024, 1_024, {
      transparent: true,
    });
    await writePng(path.join(directory, "PG_HAIR_SMALL.png"), 256, 256, {
      transparent: true,
    });

    const report = inventoryMasters(directory);
    expect(report.fileCount).toBe(2);
    expect(report.passCount).toBe(1);
    expect(report.failCount).toBe(1);

    const good = report.entries.find((entry) => entry.file.includes("GOOD"))!;
    expect(good.verdict).toBe("PASS");
    expect(good.hasVaryingAlpha).toBe(true);
    expect(good.hash).toMatch(/^[0-9a-f]{64}$/);

    const small = report.entries.find((entry) => entry.file.includes("SMALL"))!;
    expect(small.verdict).toBe("FAIL");
    expect(small.requiredUpscaleFactor).toBeCloseTo(4, 6);
    expect(small.reasons.join(" ")).toContain("1024px minimum");
  });

  it("reports an unrecognised class as unmeasured rather than assigning one", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "master-inv-2-"));
    await writePng(path.join(directory, "output_final_v3.png"), 2_048, 2_048, {
      transparent: true,
    });
    const report = inventoryMasters(directory);
    expect(report.unmeasuredCount).toBe(1);
    expect(report.entries[0]!.assumedKind).toBeNull();
    expect(report.entries[0]!.width).toBe(2_048);
  });

  it("never modifies the files it measures", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "master-inv-3-"));
    const file = path.join(directory, "PG_HAIR_PROBE.png");
    await writePng(file, 512, 512, { transparent: true });
    const before = fs.readFileSync(file);
    inventoryMasters(directory);
    expect(fs.readFileSync(file).equals(before)).toBe(true);
  });

  it("is deterministic for the same folder", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "master-inv-4-"));
    await writePng(path.join(directory, "PG_HAIR_A.png"), 1_024, 1_024, {
      transparent: true,
    });
    await writePng(path.join(directory, "PG_SHOE_B.png"), 300, 300, {
      transparent: true,
    });
    expect(JSON.stringify(inventoryMasters(directory))).toBe(
      JSON.stringify(inventoryMasters(directory)),
    );
  });
});

describe("the committed measurement of the banked Drive candidates", () => {
  /**
   * The nine PG-HAIR_SHORT authorities were expected to close the masculine
   * hair gap by intake alone. Measured, they are 247-318px on the long edge and
   * cannot. The report is committed as evidence because the files themselves
   * are Drive-only paid outputs and do not belong in this tree.
   */
  it("records that the banked short-hair authorities are far below the minimum", () => {
    const report = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "art/qa/banked_master_inventory.json"),
        "utf-8",
      ),
    ) as {
      entries: {
        file: string;
        verdict: string;
        longEdge: number | null;
        hasVaryingAlpha: boolean | null;
      }[];
    };

    const shortHair = report.entries.filter((entry) =>
      entry.file.startsWith("PG-HAIR_SHORT_"),
    );
    expect(shortHair).toHaveLength(9);
    for (const entry of shortHair) {
      expect(entry.verdict, entry.file).toBe("FAIL");
      expect(entry.longEdge!, entry.file).toBeLessThan(1_024);
      // Their "TRUE_ALPHA" filenames are accurate; only their size is not.
      expect(entry.hasVaryingAlpha, entry.file).toBe(true);
    }

    const wavyPair = report.entries.filter((entry) =>
      entry.file.includes("HAIR_WAVY"),
    );
    expect(wavyPair).toHaveLength(2);
    for (const entry of wavyPair) {
      expect(entry.verdict, entry.file).toBe("PASS");
    }
  });
});
