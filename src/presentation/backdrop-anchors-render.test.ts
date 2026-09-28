import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import manifestJson from "../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  BODY_BUILDS,
  composeEnginePerson,
  isSeatedPose,
  mirrorToFace,
  type EngineRecipe,
  type PeoplePackManifest,
} from "./appearance-engine/pack";
import type { Raster } from "./appearance-engine/raster";
import {
  backdropStaging,
  spotFigure,
  spotPose,
  spotView,
  type StagingSpot,
} from "./backdrop-people";

/**
 * People drawn on the anchors of three places: a legislative chamber, an
 * office and a diner. Each spot gets a real engine figure in the pose the
 * spot calls for, composed from the pack's paintings, and the figure is laid
 * on the picture the way the scene lays it: its canvas scaled into the spot's
 * box. Then the drawn feet must land on the spot's foot point, a seated
 * figure's seat on the painted seat, and a figure turned toward a side must
 * be turned that way.
 */

const PACK = manifestJson as unknown as PeoplePackManifest;
const SCENES = ["state-legislative-chamber-bicameral", "office", "diner"];

function read(file: string): Raster {
  const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

function recipeAt(spot: StagingSpot, index: number): EngineRecipe {
  const presentation = index % 2 === 0 ? "feminine" : "masculine";
  const pack = PACK.presentations[presentation];
  const seed = `anchor-render-${index}`;
  const recipe: EngineRecipe = {
    presentation,
    build: BODY_BUILDS[index % BODY_BUILDS.length]!,
    shade: 1 + (index % 6),
    face: pack.faces[index % pack.faces.length]!.id,
    hair: pack.hair[index % pack.hair.length]!.id,
    hairColor: "natural",
    outfit: pack.outfits.find((outfit) => outfit.tags.includes("business"))!.id,
    pose: spotPose(spot, seed),
    view: spotView(spot),
  };
  if (spot.facing !== "left" && spot.facing !== "right") return recipe;
  return {
    ...recipe,
    mirrored: mirrorToFace(
      pack,
      recipe,
      spot.x,
      spot.facing === "left" ? spot.x - 10 : spot.x + 10,
    ),
  };
}

describe("people drawn on the anchors", { timeout: 120_000 }, () => {
  it.each(SCENES)("%s: every figure lands on its spot", (place) => {
    const stage = backdropStaging(place)!;
    expect(stage.spots.length).toBeGreaterThan(2);
    const poses = new Set<string>();
    stage.spots.forEach((spot, index) => {
      const recipe = recipeAt(spot, index);
      const drawn = composeEnginePerson(PACK, read, recipe);
      const figure = spotFigure(stage, spot);
      // The canvas fills the spot's box: a canvas row lands at this y.
      const rowY = (row: number) =>
        figure.topPercent + (row / drawn.raster.height) * figure.heightPercent;
      // The painted feet stand on the foot point.
      expect(Math.abs(rowY(drawn.anchors.feet) - spot.y)).toBeLessThan(1);
      // A seat is drawn seated, and its seat lands on the painted seat.
      expect(isSeatedPose(drawn.pose)).toBe(spot.pose === "sit");
      if (spot.pose === "sit") {
        expect(drawn.seatRow).toBeDefined();
        expect(Math.abs(rowY(drawn.seatRow!) - spot.seatY!)).toBeLessThan(
          // The engine's seated bodies sit about 0.1 m higher than a
          // painted sofa or bench cushion.
          figure.heightPercent * 0.15,
        );
      }
      // The head is inside the picture unless the spot is cut by its top.
      expect(rowY(drawn.anchors.head.top)).toBeGreaterThan(-5);
      poses.add(drawn.pose);
    });
    // Not a row of models: a place with seats has people sitting.
    if (stage.spots.some((spot) => spot.pose === "sit"))
      expect([...poses].some((pose) => isSeatedPose(pose as never))).toBe(true);
  });
});
