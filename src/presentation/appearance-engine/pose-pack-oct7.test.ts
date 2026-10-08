import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import poseData from "../../../data/content/pose-by-activity.json" with { type: "json" };
import {
  BODY_BUILDS,
  BODY_POSES,
  BODY_VIEWS,
  composeEnginePerson,
  isSeatedPose,
  poseFallbacks,
  presentationFallbacks,
  posedPieces,
  presentationPose,
  type BodyPose,
  type BodyPresentation,
  type EngineRecipe,
  type PackPresentation,
  type PackView,
  type PackPostures,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";

/**
 * The poses painted Oct. 7, 2026 and cut into the people pack: what a
 * standing person is doing or feeling, the same turned three quarters, and
 * seen from behind. They are painted bare for now; each reaches clothed
 * people by itself when its outfits are cut into the same folder.
 */

const manifest = manifestJson as unknown as PeoplePackManifest;
const PRESENTATIONS = ["feminine", "masculine"] as const;
const PACK = "art/people-engine/v1";

/** Painted standing, in front, for at least one presentation. */
const FRONT = [
  "angry",
  "arms-wide",
  "checking-phone",
  "clapping",
  "fidgeting",
  "hand-on-heart",
  "hands-behind-back",
  "hands-clasped",
  "hands-on-hips",
  "handshake",
  "holding-cup",
  "holding-folder",
  "phone-call",
  "pointing",
  "shrug",
  "slumped",
  "stern",
  "thinking",
  "walking",
  "waving",
  "weight-shift",
] as const satisfies readonly BodyPose[];
/** Painted turned three quarters. */
const THREE_QUARTER = [
  "arms-folded",
  "checking-phone",
  "explaining",
  "hands-on-hips",
  "holding-folder",
  "pointing",
  "shrug",
  "walking",
] as const satisfies readonly BodyPose[];
/** Painted seen from behind. */
const BACK = [
  "back-arms-folded",
  "back-hands-in-pockets",
  "back-hands-on-hips",
  "back-pointing",
  "back-walking",
] as const satisfies readonly BodyPose[];

function postures(
  pack: PackPresentation,
  view: "front" | "three-quarter" | "back",
): PackPostures | undefined {
  return view === "front" ? pack : pack.views?.[view];
}

/** Every pose painted in any view for at least one presentation. */
function paintedPoses(): Set<string> {
  const painted = new Set<string>(["standing", "seated"]);
  for (const presentation of PRESENTATIONS) {
    const pack = manifest.presentations[presentation];
    for (const view of ["front", "three-quarter", "back"] as const)
      for (const pose of Object.keys(postures(pack, view)?.poses ?? {}))
        painted.add(pose);
  }
  return painted;
}

function read(file: string): Raster {
  const png = PNG.sync.read(readFileSync(`${PACK}/${file}`));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

/** The pack with no clothes: the new poses are painted bare. */
function undressed(presentation: BodyPresentation): PeoplePackManifest {
  return {
    ...manifest,
    presentations: {
      ...manifest.presentations,
      [presentation]: {
        ...manifest.presentations[presentation],
        outfits: [],
      },
    },
  };
}

function recipe(
  presentation: BodyPresentation,
  overrides: Partial<EngineRecipe> = {},
): EngineRecipe {
  const pack = manifest.presentations[presentation];
  const view = overrides.view;
  const turned = view && view !== "front" ? pack.views?.[view] : undefined;
  return {
    presentation,
    build: "average",
    shade: 4,
    face: (turned?.faces[0] ?? pack.faces[0]!).id,
    hair: (turned?.hair[0] ?? pack.hair[0]!).id,
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
    ...overrides,
  };
}

describe("the Oct. 7 poses in the people pack", () => {
  it("lists the views the engine draws a person in", () => {
    expect(BODY_VIEWS).toEqual(["front", "three-quarter", "side", "back"]);
    for (const presentation of PRESENTATIONS) {
      const pack = manifest.presentations[presentation];
      expect(pack.views?.["three-quarter"]).toBeDefined();
      expect(pack.views?.back).toBeDefined();
      // From behind no face is painted, and the figure turns neither way.
      expect(pack.views!.back!.faceless).toBe(true);
      expect(pack.views!.back!.faces).toEqual([]);
      expect(pack.views!.back!.toward).toBeNull();
      expect(pack.views!.back!.hair.length).toBe(pack.hair.length);
    }
  });

  it("lists every new pose in front, turned and from behind, for at least one presentation", () => {
    const listed = (view: "front" | "three-quarter" | "back") =>
      new Set(
        PRESENTATIONS.flatMap((presentation) =>
          Object.keys(
            postures(manifest.presentations[presentation], view)?.poses ?? {},
          ),
        ),
      );
    for (const pose of FRONT) expect(listed("front")).toContain(pose);
    for (const pose of THREE_QUARTER)
      expect(listed("three-quarter")).toContain(pose);
    for (const pose of BACK) expect(listed("back")).toContain(pose);
    // Every pose listed is one the engine names.
    for (const view of ["front", "three-quarter", "back"] as const)
      for (const pose of listed(view))
        expect(BODY_POSES as readonly string[]).toContain(pose);
  });

  it("has every painted body for every build, on the pack's canvas, with its head where the standing body has it", () => {
    for (const presentation of PRESENTATIONS)
      for (const view of ["front", "three-quarter", "back"] as const) {
        const posed = postures(manifest.presentations[presentation], view)!;
        for (const [pose, painted] of Object.entries(posed.poses ?? {}))
          for (const build of BODY_BUILDS) {
            const body = painted?.bodies[build];
            expect(
              body,
              `${presentation} ${view} ${pose} ${build}`,
            ).toBeDefined();
            expect(existsSync(`${PACK}/${body!.file}`)).toBe(true);
            if (isSeatedPose(pose as BodyPose)) continue;
            const standing = posed.bodies[build].anchors;
            expect(body!.anchors.top).toBe(standing.top);
            expect(body!.anchors.neck).toEqual(standing.neck);
            const raster = read(body!.file);
            expect([raster.width, raster.height]).toEqual([
              manifest.canvas.width,
              manifest.canvas.height,
            ]);
          }
      }
  });

  it("draws no floor shadow or haze under any new body", () => {
    const solesGap = 6;
    for (const presentation of PRESENTATIONS) {
      const pack = manifest.presentations[presentation];
      for (const pose of FRONT) {
        const body = pack.poses?.[pose]?.bodies.average;
        if (!body) continue;
        const raster = read(body.file);
        // Nothing opaque below the standing body's soles.
        for (
          let y = pack.bodies.average.anchors.feet * 2 + solesGap;
          y < raster.height;
          y += 1
        )
          for (let x = 0; x < raster.width; x += 1)
            expect(raster.data[(y * raster.width + x) * 4 + 3]).toBe(0);
      }
    }
  });
});

describe("the pose data", () => {
  it("names only poses the pack has, and holds back the ones it must not draw", () => {
    const painted = paintedPoses();
    const named = new Set<string>();
    for (const views of Object.values(poseData.activities))
      for (const spots of Object.values(views))
        for (const entries of Object.values(spots))
          for (const entry of entries as { pose: string }[])
            named.add(entry.pose);
    for (const poses of Object.values(poseData.byExpression))
      if (Array.isArray(poses)) for (const pose of poses) named.add(pose);
    // Poses painted before the Oct. 7 sheets are all in the pack.
    for (const pose of ["podium", "arms-folded", "explaining"]) named.add(pose);
    for (const pose of named)
      expect(painted.has(pose), `${pose} is in the pose data`).toBe(true);
    // A held-back pose is not packed and not chosen.
    for (const pose of Object.keys(poseData.heldBack)) {
      expect(painted.has(pose), `${pose} is held back`).toBe(false);
      expect(named.has(pose)).toBe(false);
    }
  });

  it("gives every later-painted pose a stand-in that clothed people are painted in", () => {
    const standIn = poseData.standIn as Record<string, BodyPose>;
    for (const [pose, stand] of Object.entries(standIn)) {
      expect(BODY_POSES as readonly string[]).toContain(pose);
      expect(BODY_POSES as readonly string[]).toContain(stand);
      expect(poseFallbacks(pose as BodyPose)).toEqual(
        stand === "standing" ? [pose, "standing"] : [pose, stand, "standing"],
      );
      for (const presentation of PRESENTATIONS) {
        const own = presentationPose(stand, presentation);
        if (own === "standing") continue;
        expect(
          manifest.presentations[presentation].outfits.some((outfit) =>
            BODY_BUILDS.every(
              (build) => outfit.poses?.[own as "explaining"]?.[build],
            ),
          ),
          `${presentation} has an outfit painted ${own}`,
        ).toBe(true);
      }
    }
  });

  it("draws a clothed person in a stand-in while the pose has no outfit, never nothing", () => {
    for (const presentation of PRESENTATIONS)
      for (const pose of FRONT) {
        const pieces = posedPieces(
          manifest.presentations[presentation],
          recipe(presentation, { pose }),
        );
        expect(presentationFallbacks(pose, presentation)).toContain(
          pieces.pose,
        );
        expect(pieces.outfit).toBeDefined();
      }
  });
});

describe("every view loads", () => {
  const FOUR = [
    ["front", "angry"],
    ["three-quarter", "pointing"],
    ["back", "back-arms-folded"],
  ] as const;

  for (const presentation of PRESENTATIONS)
    for (const build of BODY_BUILDS)
      it(`draws a bare ${build} ${presentation} person in each view, with the face or the back of the head`, () => {
        const bare = undressed(presentation);
        for (const [view, pose] of FOUR) {
          const drawn = composeEnginePerson(
            bare,
            read,
            recipe(presentation, { build, view, pose }),
          );
          // The pose and view asked for, when painted for this body.
          const turned = postures(manifest.presentations[presentation], view);
          const painted = turned?.poses?.[pose as "angry"]?.bodies[build];
          // A turned view is drawn only where it has heads to put on its
          // bodies (a face, or the back of the head); until the turned
          // heads are painted the person is drawn facing front.
          const headed =
            view === "front" ||
            (((turned as PackView).faceless === true ||
              (turned as PackView).faces.length > 0) &&
              (turned as PackView).hair.length > 0);
          if (painted && headed) {
            expect([drawn.pose, drawn.view]).toEqual([pose, view]);
          } else {
            expect(presentationFallbacks(pose, presentation)).toContain(
              drawn.pose,
            );
          }
          expect([drawn.raster.width, drawn.raster.height]).toEqual([
            manifest.canvas.width,
            manifest.canvas.height,
          ]);
          // The neck and the middle of the head are drawn solid.
          const at = (x: number, y: number) =>
            drawn.raster.data[
              (Math.round(y) * drawn.raster.width + Math.round(x)) * 4 + 3
            ];
          expect(at(drawn.anchors.neck.centerX, drawn.anchors.neck.row)).toBe(
            255,
          );
          expect(
            at(
              (drawn.anchors.head.left + drawn.anchors.head.right) / 2,
              drawn.anchors.head.top + 30,
            ),
          ).toBe(255);
        }
      });

  it("draws a clothed person from behind in their outfit, and facing front when it is not painted from behind", () => {
    for (const presentation of PRESENTATIONS) {
      const pack = manifest.presentations[presentation];
      const dressed = pack.outfits.find((outfit) => outfit.views?.back);
      expect(dressed).toBeDefined();
      const behind = posedPieces(
        pack,
        recipe(presentation, {
          view: "back",
          outfit: dressed!.id,
          pose: "back-arms-folded",
        }),
      );
      expect(behind.view).toBe("back");
      expect(behind.outfit).toBeDefined();
      expect(behind.face).toBeUndefined();
      for (const outfit of pack.outfits.filter((o) => !o.views?.back))
        expect(
          posedPieces(
            pack,
            recipe(presentation, { view: "back", outfit: outfit.id }),
          ).view,
        ).toBe("front");
    }
  });
});
