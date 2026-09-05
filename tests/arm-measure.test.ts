import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import armReport from "../art/qa/arm-measurements/arm_measurements.json";
import {
  ARM_MEASUREMENT_TOOL,
  ARM_SIDES,
  assessSleeveFitReadiness,
  measureArms,
  measureArmsFromRuns,
  readRasterRuns,
  renderArmOverlaySvg,
  runsFromRgba,
  type ArmMeasurementEntry,
  type ArmSide,
  type ArmSideMeasurement,
  type ArmSubject,
  type RasterRuns,
} from "../scripts/art-asset-factory/arm-measure";
import {
  ARM_MEASUREMENT_OVERLAY_DIRECTORY,
  collectArmSubjects,
} from "../scripts/art-asset-factory/arm-measure-subjects";

/**
 * The arm measurement against pixels, synthetic and real.
 *
 * The synthetic figure is drawn here so every expected number is known
 * before the tool reads it. The real bodies are the ones the committed
 * report was made from, and the report is regenerated and compared, so the
 * numbers a fit derivation will read cannot drift from the rasters without
 * this file saying so.
 */

const ROOT = path.resolve(__dirname, "..");

/* -------------------------------------------------------------------------- */
/* Synthetic figure                                                            */
/* -------------------------------------------------------------------------- */

interface SyntheticOptions {
  /** Add this many pixels to the left forearm's width. */
  readonly leftForearmExtra?: number;
  /** Mirror the whole figure left-to-right. */
  readonly mirror?: boolean;
  /** Leave the left forearm without a hand at its end. */
  readonly noHand?: boolean;
}

const WIDTH = 200;
const HEIGHT = 400;

/**
 * A figure whose image-left arm hangs clear of the torso from the elbow down
 * and whose image-right arm lies against the torso all the way to the hand.
 * Only the left has an inner edge in the alpha; the right must come back
 * occluded with no wrist and no elbow, whatever the left says.
 */
function syntheticFigure(options: SyntheticOptions = {}): RasterRuns {
  const extra = options.leftForearmExtra ?? 0;
  const data = Buffer.alloc(WIDTH * HEIGHT * 4);
  const paint = (x0: number, x1: number, y0: number, y1: number): void => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const px = options.mirror ? WIDTH - 1 - x : x;
        data[(y * WIDTH + px) * 4 + 3] = 255;
      }
    }
  };
  paint(88, 112, 10, 40); // head
  paint(95, 105, 41, 50); // neck
  paint(60, 140, 51, 200); // torso
  paint(65, 95, 201, 380); // left leg
  paint(105, 135, 201, 380); // right leg
  paint(40, 59, 51, 119); // left upper arm, touching the torso
  // Left forearm, clear of the torso by a gap, tapering toward the wrist.
  for (let y = 120; y <= 229; y += 1) {
    const taper = Math.round(((y - 120) / 109) * 6);
    paint(28 + taper, 28 + taper + 23 - taper + extra, y, y);
  }
  if (!options.noHand) paint(24, 58, 230, 262); // left hand, wider than the wrist
  paint(141, 160, 51, 200); // right arm and hand, against the torso throughout
  return runsFromRgba(WIDTH, HEIGHT, data);
}

const SYNTHETIC_SUBJECT: ArmSubject = {
  assetId: "synthetic_arm_fixture",
  file: "tests/synthetic",
  bodyFamily: "synthetic",
  poseFamily: "standing-neutral",
  source: "test-fixture",
};

const measureSynthetic = (
  options: SyntheticOptions = {},
  subject: ArmSubject = SYNTHETIC_SUBJECT,
): ArmMeasurementEntry =>
  measureArmsFromRuns(subject, syntheticFigure(options), "synthetic");

describe("arm measurement on a synthetic figure", () => {
  it("measures the arm that clears the torso and refuses the one that does not", () => {
    const entry = measureSynthetic();
    const left = entry.sides.left;
    const right = entry.sides.right;

    expect(left.status).toBe("measured");
    expect(left.posture).toBe("hanging");
    expect(left.shoulder.status).toBe("measured");
    expect(left.wrist.status).toBe("measured");
    expect(left.elbow.status).toBe("partially-measured");
    // The wrist sits just above the hand, where the taper is narrowest.
    expect(left.wrist.px!.y).toBeGreaterThan(200);
    expect(left.wrist.px!.y).toBeLessThan(232);
    expect(left.widths.wrist.status).toBe("measured");
    expect(left.widths.wrist.px).toBeGreaterThanOrEqual(17);
    expect(left.widths.wrist.px).toBeLessThanOrEqual(19);
    expect(left.widths.forearmMid.status).toBe("measured");
    // The upper arm touches the torso: no inner edge, no width.
    expect(left.widths.upperArmNearShoulder.status).toBe("occluded");

    expect(right.status).toBe("occluded");
    expect(right.posture).toBe("fused");
    expect(right.shoulder.status).toBe("measured");
    expect(right.elbow.px).toBeNull();
    expect(right.wrist.px).toBeNull();
    expect(right.extremity.px).toBeNull();
    expect(right.innerContour.samples).toEqual([]);
    for (const width of Object.values(right.widths)) {
      expect(width.px).toBeNull();
      expect(width.status).toBe("occluded");
    }
    expect(right.separation.separatedRowCount).toBe(0);
  });

  it("keeps the sides independent: mirroring the figure swaps the answers", () => {
    const plain = measureSynthetic();
    const mirrored = measureSynthetic({ mirror: true });
    expect(mirrored.sides.right.status).toBe(plain.sides.left.status);
    expect(mirrored.sides.left.status).toBe(plain.sides.right.status);
    expect(mirrored.sides.right.wrist.px!.y).toBeCloseTo(
      plain.sides.left.wrist.px!.y,
      0,
    );
    expect(mirrored.sides.right.wrist.px!.x).toBeCloseTo(
      WIDTH - 1 - plain.sides.left.wrist.px!.x,
      0,
    );
    expect(mirrored.sides.right.widths.wrist.px).toBe(
      plain.sides.left.widths.wrist.px,
    );
  });

  it("changes the measurement when the pixels change", () => {
    const thin = measureSynthetic();
    const thick = measureSynthetic({ leftForearmExtra: 6 });
    // Six pixels wider, within a pixel of rounding along a tilted axis.
    expect(
      Math.abs(
        thick.sides.left.widths.wrist.px! -
          thin.sides.left.widths.wrist.px! -
          6,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        thick.sides.left.widths.forearmMid.px! -
          thin.sides.left.widths.forearmMid.px! -
          6,
      ),
    ).toBeLessThanOrEqual(1);
    // The fused side did not learn anything from the other side changing.
    expect(thick.sides.right).toEqual(thin.sides.right);
  });

  it("is byte-identical run to run", () => {
    expect(JSON.stringify(measureSynthetic())).toBe(
      JSON.stringify(measureSynthetic()),
    );
  });

  it("keeps the pose family in the measurement identity", () => {
    const seated = measureSynthetic(
      {},
      { ...SYNTHETIC_SUBJECT, poseFamily: "seated-guest-neutral" },
    );
    expect(seated.poseFamily).toBe("seated-guest-neutral");
    expect(measureSynthetic().poseFamily).toBe("standing-neutral");
  });

  it("orders shoulder, elbow and wrist down a hanging arm", () => {
    const left = measureSynthetic().sides.left;
    expect(left.shoulder.px!.y).toBeLessThan(left.elbow.px!.y);
    expect(left.elbow.px!.y).toBeLessThan(left.wrist.px!.y);
    expect(left.wrist.px!.y).toBeLessThan(left.extremity.px!.y);
    expect(left.upperArm.status).toBe("partially-measured");
    expect(left.forearm.lengthPx).toBeGreaterThan(0);
    expect(left.elbowBendDeg.value).toBeGreaterThan(150);
  });

  it("reports an empty raster as unavailable rather than inventing a figure", () => {
    const empty = runsFromRgba(8, 8, Buffer.alloc(8 * 8 * 4));
    const entry = measureArmsFromRuns(SYNTHETIC_SUBJECT, empty, "empty");
    expect(entry.figure).toBeNull();
    for (const side of ARM_SIDES) {
      expect(entry.sides[side].status).toBe("unavailable");
      expect(entry.sides[side].shoulder.px).toBeNull();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Real bodies                                                                 */
/* -------------------------------------------------------------------------- */

const subjects = collectArmSubjects(ROOT);
const measured = new Map(
  subjects.map((subject) => [
    subject.assetId,
    measureArms(subject, subject.absoluteFile),
  ]),
);
const entry = (assetId: string): ArmMeasurementEntry => {
  const found = measured.get(assetId);
  if (!found) throw new Error(`No measured subject '${assetId}'.`);
  return found;
};

describe("arm measurement on the repository's body rasters", () => {
  it("reproduces the committed report from the rasters", () => {
    expect(armReport.tool).toBe(ARM_MEASUREMENT_TOOL);
    const regenerated = subjects.map((subject) => {
      const fresh = entry(subject.assetId);
      return {
        ...fresh,
        overlay: `${ARM_MEASUREMENT_OVERLAY_DIRECTORY}/${subject.assetId}.svg`,
        sha256MatchesSourceRecord:
          subject.expectedSha256 === null
            ? null
            : subject.expectedSha256 === fresh.sha256,
      };
    });
    expect(regenerated).toEqual(armReport.subjects);
  });

  it("reproduces every committed overlay from the measurement", () => {
    for (const subject of subjects) {
      const overlayPath = path.join(
        ROOT,
        ARM_MEASUREMENT_OVERLAY_DIRECTORY,
        `${subject.assetId}.svg`,
      );
      const href = path
        .relative(path.dirname(overlayPath), subject.absoluteFile)
        .split(path.sep)
        .join("/");
      expect(fs.readFileSync(overlayPath, "utf8")).toBe(
        renderArmOverlaySvg(entry(subject.assetId), href),
      );
    }
  });

  it("does not write to the source art", () => {
    const subject = subjects.find(
      (s) => s.assetId === "pg_body_ml_standing_v1",
    )!;
    const before = createHash("sha256")
      .update(fs.readFileSync(subject.absoluteFile))
      .digest("hex");
    const stat = fs.statSync(subject.absoluteFile);
    measureArms(subject, subject.absoluteFile);
    measureArms(subject, subject.absoluteFile);
    const after = createHash("sha256")
      .update(fs.readFileSync(subject.absoluteFile))
      .digest("hex");
    expect(after).toBe(before);
    expect(fs.statSync(subject.absoluteFile).mtimeMs).toBe(stat.mtimeMs);
    expect(entry(subject.assetId).sha256).toBe(before);
  });

  it("measures the same raster to the same bytes twice", () => {
    const subject = subjects.find(
      (s) => s.assetId === "pg_body_fl_standing_v1",
    )!;
    expect(JSON.stringify(measureArms(subject, subject.absoluteFile))).toBe(
      JSON.stringify(measureArms(subject, subject.absoluteFile)),
    );
  });

  it("measures left and right independently on a gesturing pose", () => {
    const gesture = entry("ocd_body_adult_fem_standing_conversational_a_v1");
    expect(gesture.sides.left.status).toBe("occluded");
    expect(gesture.sides.right.status).not.toBe("occluded");
    expect(gesture.sides.right.posture).toBe("raised-or-forward");
    expect(gesture.sides.left.wrist.px).toBeNull();
    expect(gesture.sides.right.elbow.px).not.toBeNull();

    const seated = entry("ocd_body_adult_fem_seated_gesture_forward_v1");
    expect(seated.sides.left.status).not.toBe("occluded");
    expect(seated.sides.right.status).toBe("occluded");
  });

  it("gives an occluded arm no geometry", () => {
    const front = entry("ocd_body_adult_fem_seated_guest_front_v1");
    for (const side of ARM_SIDES) {
      const arm = front.sides[side];
      expect(arm.status).toBe("occluded");
      expect(arm.elbow.px).toBeNull();
      expect(arm.wrist.px).toBeNull();
      expect(arm.extremity.px).toBeNull();
      expect(arm.innerContour.samples).toEqual([]);
      expect(arm.upperArm.vectorPx).toBeNull();
      expect(arm.forearm.vectorPx).toBeNull();
      expect(arm.elbowBendDeg.value).toBeNull();
      for (const width of Object.values(arm.widths))
        expect(width.px).toBeNull();
      // The shoulder tip is still a silhouette point, and the outer contour is
      // reported as the outline of arm-and-torso together, not as the arm's.
      expect(arm.shoulder.px).not.toBeNull();
      expect(arm.outerContour.status).toBe("partially-measured");
      expect(arm.outerContour.samples.length).toBeGreaterThan(0);
    }
  });

  it("labels what the silhouette cannot decide as ambiguous, never with a number", () => {
    // The generation-2 fixture arm is a polygon with no hand: nothing widens
    // past its narrowest point, so no wrist is placed.
    const fixture = entry("dev_g2_body_broad_deep_rich_standing_v1");
    for (const side of ARM_SIDES) {
      expect(fixture.sides[side].wrist.status).toBe("ambiguous");
      expect(fixture.sides[side].wrist.px).toBeNull();
      expect(fixture.sides[side].elbow.status).toBe("unavailable");
    }
    // A synthetic forearm that ends without a hand gets no wrist either, and
    // without a wrist there is no chord to read an elbow against.
    const noHand = measureSynthetic({ noHand: true }).sides.left;
    expect(noHand.wrist.status).toBe("ambiguous");
    expect(noHand.wrist.px).toBeNull();
    expect(noHand.elbow.status).toBe("unavailable");
    expect(noHand.status).toBe("partially-measured");
  });

  it("keeps every landmark on the silhouette", () => {
    const opaque = (raster: RasterRuns, x: number, y: number): boolean => {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const px = Math.round(x + dx);
          const py = Math.round(y + dy);
          if (py < 0 || py >= raster.height) continue;
          if (raster.rows[py]!.some((run) => run.lo <= px && px <= run.hi)) {
            return true;
          }
        }
      }
      return false;
    };
    for (const subject of subjects) {
      const raster = readRasterRuns(subject.absoluteFile);
      const measuredEntry = entry(subject.assetId);
      for (const side of ARM_SIDES) {
        const arm = measuredEntry.sides[side];
        for (const [id, mark] of [
          ["shoulder", arm.shoulder],
          ["elbow", arm.elbow],
          ["wrist", arm.wrist],
          ["extremity", arm.extremity],
        ] as const) {
          if (!mark.px) continue;
          expect(
            opaque(raster, mark.px.x, mark.px.y),
            `${subject.assetId} ${side} ${id} at ${mark.px.x},${mark.px.y}`,
          ).toBe(true);
          expect(mark.normalized!.x).toBeGreaterThanOrEqual(0);
          expect(mark.normalized!.x).toBeLessThanOrEqual(1);
          expect(mark.normalized!.y).toBeGreaterThanOrEqual(0);
          expect(mark.normalized!.y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("orders shoulder, elbow and wrist down every hanging arm", () => {
    let checked = 0;
    for (const measuredEntry of measured.values()) {
      for (const side of ARM_SIDES) {
        const arm = measuredEntry.sides[side];
        if (arm.posture !== "hanging") continue;
        if (arm.elbow.px) {
          expect(arm.shoulder.px!.y).toBeLessThan(arm.elbow.px.y);
        }
        if (arm.elbow.px && arm.wrist.px) {
          expect(arm.elbow.px.y).toBeLessThan(arm.wrist.px.y);
          checked += 1;
        }
        if (arm.wrist.px) {
          expect(arm.wrist.px.y).toBeLessThan(arm.extremity.px!.y);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("measures different morphologies to different numbers", () => {
    const feminine = entry("pg_body_fl_standing_v1");
    const masculine = entry("pg_body_ml_standing_v1");
    expect(feminine.poseFamily).toBe(masculine.poseFamily);
    expect(feminine.sides.left.widths.wrist.px).not.toBe(
      masculine.sides.left.widths.wrist.px,
    );
    expect(feminine.sides.left.shoulder.normalized!.x).not.toBe(
      masculine.sides.left.shoulder.normalized!.x,
    );
    const broad = entry("dev_g2_body_broad_deep_rich_standing_v1");
    const slim = entry("dev_g2_body_slim_deep_rich_standing_v1");
    expect(broad.sides.left.shoulder.px!.x).toBeLessThan(
      slim.sides.left.shoulder.px!.x,
    );
  });

  it("reports the registered pose's nominal landmarks as deviations, never as values", () => {
    const masculine = entry("pg_body_ml_standing_v1");
    expect(masculine.sides.left.registryDeviation).not.toBeNull();
    expect(masculine.sides.left.registryDeviation!.wrist).not.toBeNull();
    // The fixture family's own registry entry was measured from it, so its
    // shoulder deviation is small; the real candidate's is not assumed.
    const fixture = entry("dev_g2_body_broad_deep_rich_standing_v1");
    expect(
      Math.abs(fixture.sides.left.registryDeviation!.shoulder!.x),
    ).toBeLessThan(0.05);
  });
});

/* -------------------------------------------------------------------------- */
/* Sleeve fit readiness                                                        */
/* -------------------------------------------------------------------------- */

const armOf = (assetId: string, side: ArmSide) => {
  const measuredEntry = entry(assetId);
  return {
    assetId,
    bodyFamily: measuredEntry.bodyFamily,
    poseFamily: measuredEntry.poseFamily,
    arm: measuredEntry.sides[side],
  };
};

describe("sleeve fit readiness", () => {
  it("refuses to compare arms across poses unless the caller declares them compatible", () => {
    const standing = armOf("ocd_body_adult_fem_standing_neutral_b_v1", "right");
    const gesture = armOf(
      "ocd_body_adult_fem_standing_conversational_b_v1",
      "right",
    );
    const refused = assessSleeveFitReadiness(standing, gesture);
    expect(refused.status).toBe("refused");
    if (refused.status === "refused") {
      expect(refused.code).toBe("sleeve-pose-mismatch");
    }
    // Declared compatible, the next gate is posture, and these differ.
    const declared = assessSleeveFitReadiness(standing, gesture, {
      posesDeclaredCompatible: true,
    });
    expect(declared.status).toBe("refused");
    if (declared.status === "refused") {
      expect(declared.code).toBe("sleeve-posture-mismatch");
    }
  });

  it("refuses an occluded arm", () => {
    const measuredArm = armOf("pg_body_ml_standing_v1", "left");
    const occluded = armOf("ocd_body_adult_fem_seated_guest_front_v1", "left");
    const result = assessSleeveFitReadiness(measuredArm, {
      ...occluded,
      poseFamily: measuredArm.poseFamily,
    });
    expect(result.status).toBe("refused");
    if (result.status === "refused") {
      expect(result.code).toBe("sleeve-arm-occluded");
    }
  });

  it("refuses an arm with a landmark the silhouette did not decide", () => {
    const complete = {
      assetId: "synthetic_arm_fixture",
      bodyFamily: "synthetic",
      poseFamily: "standing-neutral",
      arm: measureSynthetic().sides.left,
    };
    const noWrist = {
      ...complete,
      assetId: "synthetic_arm_fixture_no_hand",
      arm: measureSynthetic({ noHand: true }).sides.left,
    };
    const result = assessSleeveFitReadiness(complete, noWrist);
    expect(result.status).toBe("refused");
    if (result.status === "refused") {
      expect(result.code).toBe("sleeve-landmarks-incomplete");
      expect(result.reasons.join(" ")).toContain("wrist");
    }
  });

  it("never mirrors a side into the other", () => {
    const left = armOf("pg_body_ml_standing_v1", "left");
    const right = armOf("pg_body_ml_standing_v1", "right");
    const result = assessSleeveFitReadiness(left, right);
    expect(result.status).toBe("refused");
    if (result.status === "refused") {
      expect(result.code).toBe("sleeve-side-mismatch");
    }
  });

  it("returns ratios, not a transform, when both arms are measured, and leaves both untouched", () => {
    const source = armOf("pg_body_ml_standing_v1", "left");
    const target = armOf("pg_body_fl_standing_v1", "left");
    const sourceBefore = JSON.stringify(source);
    const targetBefore = JSON.stringify(target);
    const result = assessSleeveFitReadiness(source, target);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.comparison.forearm.lengthRatio).toBeGreaterThan(0);
      expect(result.comparison.widthRatios.wrist).toBeGreaterThan(0);
      expect(result.comparison.upperArm.status).toBe("partially-measured");
      expect(result.note).toContain("No transform");
    }
    expect(JSON.stringify(source)).toBe(sourceBefore);
    expect(JSON.stringify(target)).toBe(targetBefore);
  });

  it("carries the source raster's hash so a report can be checked against the file it came from", () => {
    for (const subject of subjects) {
      const measuredEntry = entry(subject.assetId);
      expect(measuredEntry.sha256).toMatch(/^[0-9a-f]{64}$/);
      if (subject.expectedSha256 !== null) {
        expect(measuredEntry.sha256).toBe(subject.expectedSha256);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Type-level guard                                                            */
/* -------------------------------------------------------------------------- */

const statusOf = (arm: ArmSideMeasurement): string => arm.status;
void statusOf;
