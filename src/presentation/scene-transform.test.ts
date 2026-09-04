import { describe, expect, it } from "vitest";

import { createRunBFixture } from "./run-b-fixture";
import {
  containsSceneRect,
  measureRasterFidelity,
  projectSceneRect,
  resolveSceneTransform,
  type SceneRect,
} from "./scene-transform";
import {
  composeOfficeVisuals,
  OFFICE_VISUAL_SCENE,
  PRODUCTION_VISUAL_LIBRARY,
  resolvePersonVisualRecipe,
} from "./visual-integration";

const VIEWPORT_MATRIX = [
  { id: "small-16-9", width: 1_280, height: 720 },
  { id: "common-laptop", width: 1_366, height: 768 },
  { id: "mac-like-16-10", width: 1_440, height: 900 },
  { id: "full-hd", width: 1_920, height: 1_080 },
  { id: "standard-16-10", width: 1_920, height: 1_200 },
  { id: "qhd", width: 2_560, height: 1_440 },
  { id: "mac-high-vertical", width: 2_560, height: 1_600 },
  { id: "ultrawide", width: 2_560, height: 1_080 },
  { id: "ultrawide-qhd", width: 3_440, height: 1_440 },
  { id: "large-ultrawide", width: 3_840, height: 1_600 },
  { id: "4k", width: 3_840, height: 2_160 },
  { id: "super-ultrawide", width: 5_120, height: 1_440 },
  { id: "extreme-super-ultrawide", width: 7_680, height: 2_160 },
] as const;

const DPR_MATRIX = [1, 1.25, 2] as const;

function characterSceneRect(character: {
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}): SceneRect {
  return {
    x: (character.leftPercent / 100) * OFFICE_VISUAL_SCENE.plate.width,
    y: (character.topPercent / 100) * OFFICE_VISUAL_SCENE.plate.height,
    width: (character.widthPercent / 100) * OFFICE_VISUAL_SCENE.plate.width,
    height: (character.heightPercent / 100) * OFFICE_VISUAL_SCENE.plate.height,
  };
}

describe("responsive office virtual-scene camera", () => {
  const fixture = createRunBFixture();
  const composition = composeOfficeVisuals(
    fixture.scenePeople,
    PRODUCTION_VISUAL_LIBRARY,
  );

  for (const viewport of VIEWPORT_MATRIX) {
    for (const devicePixelRatio of DPR_MATRIX) {
      it(`${viewport.id} ${viewport.width}x${viewport.height} at DPR ${devicePixelRatio}`, () => {
        const transform = resolveSceneTransform(
          viewport,
          OFFICE_VISUAL_SCENE.plate,
          OFFICE_VISUAL_SCENE.camera,
          devicePixelRatio,
        );

        expect(transform.scaleX).toBe(transform.scaleY);
        expect(transform.uniformScale).toBe(transform.scaleX);
        expect(
          transform.renderedSceneWidth / transform.renderedSceneHeight,
        ).toBeCloseTo(
          OFFICE_VISUAL_SCENE.plate.width / OFFICE_VISUAL_SCENE.plate.height,
          12,
        );
        expect(transform.renderedSceneWidth).toBeCloseTo(
          OFFICE_VISUAL_SCENE.plate.width * transform.uniformScale,
          10,
        );
        expect(transform.renderedSceneHeight).toBeCloseTo(
          OFFICE_VISUAL_SCENE.plate.height * transform.uniformScale,
          10,
        );
        expect(
          containsSceneRect(
            transform.visibleScene,
            OFFICE_VISUAL_SCENE.safeArea,
          ),
        ).toBe(true);
        expect(
          containsSceneRect(
            transform.visibleScene,
            OFFICE_VISUAL_SCENE.essentialContentArea,
          ),
        ).toBe(true);
        expect(transform.xOffset * devicePixelRatio).toBeCloseTo(
          Math.round(transform.xOffset * devicePixelRatio),
          10,
        );
        expect(transform.yOffset * devicePixelRatio).toBeCloseTo(
          Math.round(transform.yOffset * devicePixelRatio),
          10,
        );

        const environment = measureRasterFidelity(
          { width: 1_024, height: 572 },
          OFFICE_VISUAL_SCENE.plate,
          transform,
        );
        expect(environment.renderedCssWidth).toBeCloseTo(
          transform.renderedSceneWidth,
          10,
        );
        expect(environment.renderedCssHeight).toBeCloseTo(
          transform.renderedSceneHeight,
          10,
        );

        for (const character of composition.characters) {
          const scenePerson = fixture.scenePeople.find(
            (p) => p.personId === character.personId,
          )!;
          const anchor = OFFICE_VISUAL_SCENE.anchors[character.anchorId];
          const recipe = resolvePersonVisualRecipe(
            scenePerson,
            anchor,
            OFFICE_VISUAL_SCENE,
          );
          // The seated contact is what the compositor places on the seat
          // plane, so it is what the projection has to agree with. `root` is
          // the hip joint above it.
          const root = recipe.seatedContact.root;
          const sceneRect = characterSceneRect(character);

          expect(
            containsSceneRect(transform.visibleScene, sceneRect),
            `${character.visualVariant} left the visible scene`,
          ).toBe(true);
          expect(
            containsSceneRect(OFFICE_VISUAL_SCENE.safeArea, sceneRect),
            `${character.visualVariant} left the guaranteed scene safe area`,
          ).toBe(true);

          const projected = projectSceneRect(sceneRect, transform);
          expect(projected.x + projected.width * root.x).toBeCloseTo(
            transform.xOffset +
              (anchor.xPercent / 100) *
                OFFICE_VISUAL_SCENE.plate.width *
                transform.uniformScale,
            8,
          );
          expect(projected.y + projected.height * root.y).toBeCloseTo(
            transform.yOffset +
              (anchor.yPercent / 100) *
                OFFICE_VISUAL_SCENE.plate.height *
                transform.uniformScale,
            8,
          );

          const source = measureRasterFidelity(
            { width: 765, height: 1_024 },
            { width: sceneRect.width, height: sceneRect.height },
            transform,
          );
          expect(source.requiredPhysicalWidth).toBeCloseTo(
            projected.width * devicePixelRatio,
            8,
          );
          expect(source.requiredPhysicalHeight).toBeCloseTo(
            projected.height * devicePixelRatio,
            8,
          );
        }
      });
    }
  }

  it("bounds super-ultrawide cameras instead of stretching the office", () => {
    for (const viewport of [
      { width: 5_120, height: 1_440 },
      { width: 7_680, height: 2_160 },
    ]) {
      const transform = resolveSceneTransform(
        viewport,
        OFFICE_VISUAL_SCENE.plate,
        OFFICE_VISUAL_SCENE.camera,
        2,
      );
      expect(transform.constrainedAxis).toBe("horizontal");
      expect(transform.camera.width / transform.camera.height).toBeCloseTo(
        12 / 5,
        12,
      );
      expect(transform.camera.width).toBeLessThan(viewport.width);
      expect(transform.scaleX).toBe(transform.scaleY);
    }
  });

  it("rejects malformed dimensions and camera policy", () => {
    expect(() =>
      resolveSceneTransform(
        { width: 0, height: 900 },
        OFFICE_VISUAL_SCENE.plate,
        OFFICE_VISUAL_SCENE.camera,
      ),
    ).toThrow("positive");
    expect(() =>
      resolveSceneTransform(
        { width: 1_440, height: 900 },
        OFFICE_VISUAL_SCENE.plate,
        { ...OFFICE_VISUAL_SCENE.camera, maximumAspectRatio: 1 },
      ),
    ).toThrow("policy");
  });
});
