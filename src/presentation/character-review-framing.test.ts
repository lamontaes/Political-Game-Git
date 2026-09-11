import { expect, it } from "vitest";
import {
  admittedCandidateBodies,
  composeCandidateReviewSubject,
  WAVE_A_REVIEW_CHARACTER_LIBRARY,
  WAVE_A_REVIEW_VISUAL_LIBRARY,
} from "./candidate-review";
import { CHARACTER_PROOF_SCENE } from "./character-proof";
import { frameCharacterReview } from "./character-review-framing";
import { resolveSceneTransform } from "./scene-transform";

it("reproduces clipped figures and frames every existing candidate without changing the rig", () => {
  const plate = CHARACTER_PROOF_SCENE.plate;
  let legacyClipped = 0;
  for (const body of admittedCandidateBodies()) {
    const subject = composeCandidateReviewSubject({
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      bodyAssetId: body.assetId,
      plate,
    })!;
    const before = JSON.stringify(subject.plan);
    for (const viewport of [
      { width: 1224, height: 684 },
      { width: 720, height: 480 },
      { width: 320, height: 480 },
    ]) {
      const old = resolveSceneTransform(
        viewport,
        plate,
        CHARACTER_PROOF_SCENE.camera,
      );
      const next = frameCharacterReview(
        viewport,
        plate,
        [subject.plan],
        CHARACTER_PROOF_SCENE.camera,
      );
      for (const layer of subject.plan.layers) {
        const x = (layer.leftPercent * plate.width) / 100;
        const y = (layer.topPercent * plate.height) / 100;
        const right =
          ((layer.leftPercent + layer.widthPercent) * plate.width) / 100;
        const bottom =
          ((layer.topPercent + layer.heightPercent) * plate.height) / 100;
        if (
          y * old.uniformScale + old.yOffset < 0 ||
          bottom * old.uniformScale + old.yOffset > viewport.height
        )
          legacyClipped++;
        expect(x * next.uniformScale + next.xOffset).toBeGreaterThanOrEqual(0);
        expect(y * next.uniformScale + next.yOffset).toBeGreaterThanOrEqual(0);
        expect(right * next.uniformScale + next.xOffset).toBeLessThanOrEqual(
          viewport.width,
        );
        expect(bottom * next.uniformScale + next.yOffset).toBeLessThanOrEqual(
          viewport.height,
        );
      }
    }
    expect(JSON.stringify(subject.plan)).toBe(before);
  }
  expect(legacyClipped).toBeGreaterThan(0);
});
