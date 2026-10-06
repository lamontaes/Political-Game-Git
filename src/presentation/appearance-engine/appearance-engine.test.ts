import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import type { Person, World } from "../../simulation/types";
import { seatedEngineBox } from "../life-scene-people";
import {
  PART_PALETTES,
  composeEnginePerson,
  type PeoplePackManifest,
} from "./pack";
import { engineRecipeFor, faceBand, withEngineChoice } from "./recipe";
import { measureBodyAnchors, neckOffset } from "./anchors";
import {
  assemblePerson,
  composite,
  featherBottomEdge,
  placeLayers,
} from "./assemble";
import { neckJoin, skinInGarment } from "./checks";
import { extractGarment } from "./extract";
import { fabricRamp, recolorFabric } from "./fabric";
import { createRaster, luminance, type Raster } from "./raster";
import { registrationOffset, translateRaster } from "./register";
import {
  SKIN_RAMPS,
  isSkinPixel,
  measureSkinLuminance,
  recolorSkin,
} from "./skin";

type Rgba = readonly [number, number, number, number];
const SKIN: Rgba = [214, 153, 102, 255];
const SKIN_SHADOW: Rgba = [170, 110, 70, 255];
const GRAY: Rgba = [128, 128, 128, 255];
const OUTLINE: Rgba = [30, 25, 22, 255];

function fill(
  r: Raster,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: Rgba,
) {
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1) r.data.set(c, (y * r.width + x) * 4);
}

/** A stick figure: head, narrow neck, wide shoulders, body, feet at the bottom. */
function figure(headTop: number, neckRow: number, shift = 0): Raster {
  const r = createRaster(60, 100);
  fill(r, 22 + shift, headTop, 37 + shift, neckRow - 3, SKIN); // head
  fill(r, 27 + shift, neckRow - 2, 32 + shift, neckRow + 2, SKIN); // neck
  fill(r, 12 + shift, neckRow + 3, 47 + shift, 70, SKIN); // shoulders and torso
  fill(r, 20 + shift, 55, 39 + shift, 65, GRAY); // underwear
  fill(r, 20 + shift, 71, 39 + shift, 95, SKIN_SHADOW); // legs
  return r;
}

describe("body anchors", () => {
  it("finds the head top, the narrowest neck row, and the feet", () => {
    const anchors = measureBodyAnchors(figure(5, 25));
    expect(anchors.top).toBe(5);
    expect(anchors.feet).toBe(95);
    expect(anchors.neck.width).toBe(6);
    expect(anchors.neck.row).toBeGreaterThanOrEqual(23);
    expect(anchors.neck.row).toBeLessThanOrEqual(27);
    expect(anchors.neck.centerX).toBe(29.5);
  });

  it("moves a head drawn for one body onto another body's neck", () => {
    const a = measureBodyAnchors(figure(5, 25));
    const b = measureBodyAnchors(figure(9, 29, 3));
    const { dx, dy } = neckOffset(a, b);
    expect(dx).toBe(3);
    expect(dy).toBe(b.neck.row - a.neck.row);
  });
});

describe("skin recolor", () => {
  it("treats warm saturated pixels as skin, and gray, outline and empty pixels as not", () => {
    expect(isSkinPixel(...SKIN)).toBe(true);
    expect(isSkinPixel(...GRAY)).toBe(false);
    expect(isSkinPixel(...OUTLINE)).toBe(false);
    expect(isSkinPixel(214, 153, 102, 0)).toBe(false);
  });

  it("repaints skin in every shade, keeps its shading order, and leaves the rest alone", () => {
    const body = figure(5, 25);
    const source = measureSkinLuminance(body);
    for (const ramp of SKIN_RAMPS) {
      const out = recolorSkin(body, ramp, source);
      const at = (x: number, y: number) =>
        Array.from(
          out.data.slice((y * out.width + x) * 4, (y * out.width + x) * 4 + 4),
        );
      // underwear untouched
      expect(at(30, 60)).toEqual([...GRAY]);
      // shadowed legs stay darker than the lit torso
      const torso = at(15, 40);
      const leg = at(25, 80);
      expect(luminance(leg[0]!, leg[1]!, leg[2]!)).toBeLessThan(
        luminance(torso[0]!, torso[1]!, torso[2]!),
      );
      // alpha kept
      expect(torso[3]).toBe(255);
    }
  });

  it("orders the seven shades from lightest to darkest", () => {
    const body = figure(5, 25);
    const lums = SKIN_RAMPS.map((ramp) => {
      const out = recolorSkin(body, ramp);
      const i = (40 * out.width + 15) * 4;
      return luminance(out.data[i]!, out.data[i + 1]!, out.data[i + 2]!);
    });
    expect(SKIN_RAMPS).toHaveLength(7);
    for (let k = 1; k < lums.length; k += 1)
      expect(lums[k]).toBeLessThan(lums[k - 1]!);
  });

  it("keeps cloth-colored cuff overlap unchanged across every skin tone", () => {
    const outfit = createRaster(3, 1);
    const skin = createRaster(3, 1);
    const cuff = createRaster(3, 1);
    fill(outfit, 0, 0, 2, 0, SKIN);
    skin.data[3] = 255;
    skin.data[7] = 96;
    cuff.data[7] = 128;
    cuff.data[11] = 255;

    for (const ramp of SKIN_RAMPS) {
      const recolored = recolorSkin(
        outfit,
        ramp,
        measureSkinLuminance(outfit),
        skin,
        [cuff],
      );
      expect(Array.from(recolored.data.slice(4, 8))).toEqual([...SKIN]);
      expect(Array.from(recolored.data.slice(8, 12))).toEqual([...SKIN]);
      expect(Array.from(recolored.data.slice(0, 4))).not.toEqual([...SKIN]);

      const withoutSkinMask = recolorSkin(
        outfit,
        ramp,
        measureSkinLuminance(outfit),
        undefined,
        [cuff],
      );
      expect(Array.from(withoutSkinMask.data.slice(4, 8))).toEqual([...SKIN]);
      expect(Array.from(withoutSkinMask.data.slice(8, 12))).toEqual([...SKIN]);
    }
  });
});

describe("assembly", () => {
  it("draws in the fixed order with the head above the top, and a dress replaces top and bottoms", () => {
    const body = figure(5, 25);
    const anchors = measureBodyAnchors(body);
    const top = createRaster(60, 100);
    fill(top, 10, 20, 49, 60, GRAY); // a high collar that reaches the jaw rows
    const head = createRaster(60, 100);
    fill(head, 22, 5, 37, 22, SKIN);
    const dress = createRaster(60, 100);
    const order = placeLayers(anchors, [
      { slot: "head", raster: head },
      { slot: "top", raster: top },
      { slot: "body", raster: body },
    ]).map((layer) => layer.slot);
    expect(order).toEqual(["body", "top", "head"]);
    const withDress = placeLayers(anchors, [
      { slot: "top", raster: top },
      { slot: "dress", raster: dress },
      { slot: "body", raster: body },
    ]).map((layer) => layer.slot);
    expect(withDress).toEqual(["body", "dress"]);
    // the jaw row shows the head's skin, not the collar
    const out = assemblePerson(anchors, [
      { slot: "body", raster: body },
      { slot: "top", raster: top },
      { slot: "head", raster: head },
    ]);
    const i = (21 * out.width + 30) * 4;
    expect(
      isSkinPixel(
        out.data[i]!,
        out.data[i + 1]!,
        out.data[i + 2]!,
        out.data[i + 3]!,
      ),
    ).toBe(true);
  });

  it("composites straight alpha: an opaque layer covers what is under it", () => {
    const a = createRaster(4, 4);
    const b = createRaster(4, 4);
    fill(a, 0, 0, 3, 3, GRAY);
    fill(b, 1, 1, 2, 2, SKIN);
    const out = composite(4, 4, [
      { slot: "body", raster: a, dx: 0, dy: 0 },
      { slot: "top", raster: b, dx: 0, dy: 0 },
    ]);
    expect(
      Array.from(out.data.slice((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 4)),
    ).toEqual([...SKIN]);
    expect(Array.from(out.data.slice(0, 4))).toEqual([...GRAY]);
  });
});

describe("jigsaw checks", () => {
  it("flags a shirt that carries painted skin, and passes a clean one", () => {
    const clean = createRaster(20, 20);
    fill(clean, 2, 2, 17, 17, GRAY);
    expect(skinInGarment(clean).skinPixels).toBe(0);
    const dirty = createRaster(20, 20);
    fill(dirty, 2, 2, 17, 17, GRAY);
    fill(dirty, 8, 2, 11, 5, SKIN); // a painted neck and chin
    expect(skinInGarment(dirty).skinPixels).toBe(16);
  });

  it("with the body underneath, does not mistake tan fabric for skin", () => {
    const body = createRaster(20, 20);
    fill(body, 0, 0, 19, 19, SKIN);
    const tanShirt = createRaster(20, 20);
    fill(tanShirt, 2, 2, 17, 17, [195, 170, 125, 255]); // khaki cloth, not the body skin
    fill(tanShirt, 8, 2, 11, 5, SKIN); // a painted copy of the neck
    expect(skinInGarment(tanShirt).skinPixels).toBeGreaterThan(16); // color alone over-flags
    expect(skinInGarment(tanShirt, body).skinPixels).toBe(16); // body-aware finds only the neck
  });

  it("measures the step where a head's neck meets the body's neck", () => {
    const body = figure(5, 25);
    const head = createRaster(60, 100);
    fill(head, 22, 5, 37, 21, SKIN);
    fill(head, 27, 22, 32, 26, SKIN); // neck matching the body's
    const matched = neckJoin(
      { slot: "head", raster: head, dx: 0, dy: 0 },
      body,
    );
    expect(matched?.leftStep).toBe(0);
    expect(matched?.rightStep).toBe(0);
    const shifted = neckJoin(
      { slot: "head", raster: head, dx: 5, dy: 0 },
      body,
    );
    expect(shifted?.leftStep).toBe(5);
  });
});

describe("garment extraction", () => {
  it("keeps sleeves over bare skin at any height, drops the painting's skin and head, and leaves the underwear bottoms", () => {
    const bare = figure(5, 25);
    const anchors = measureBodyAnchors(bare);
    const onBody = new Uint8ClampedArray(bare.data);
    const painted = { width: bare.width, height: bare.height, data: onBody };
    const SHIRT: Rgba = [150, 150, 152, 255];
    fill(painted, 12, 32, 47, 58, SHIRT); // torso from the shoulders down over the top of the underwear
    fill(painted, 12, 59, 15, 80, SHIRT); // a sleeve hanging far below the hem, over the arm's skin
    fill(painted, 25, 5, 34, 12, [90, 90, 90, 255]); // paint in the head box must be refused
    const { layer } = extractGarment(painted, bare, anchors, "top");
    const alpha = (x: number, y: number) =>
      layer.data[(y * layer.width + x) * 4 + 3]!;
    expect(alpha(20, 40)).toBe(255); // torso
    expect(alpha(13, 75)).toBe(255); // sleeve well below the hem
    expect(alpha(30, 8)).toBe(0); // head box refused
    expect(alpha(30, 62)).toBe(0); // underwear bottoms are not the top
    expect(skinInGarment(layer, bare).skinPixels).toBe(0);
  });
});

describe("head blending", () => {
  it("fades the bottom rows of a layer so a head's neck cut leaves no line", () => {
    const head = createRaster(10, 20);
    fill(head, 2, 0, 7, 15, SKIN);
    const faded = featherBottomEdge(head, 4);
    const alpha = (y: number) => faded.data[(y * 10 + 4) * 4 + 3]!;
    expect(alpha(10)).toBe(255);
    expect(alpha(15)).toBeLessThan(alpha(14));
    expect(alpha(14)).toBeLessThan(alpha(13));
    expect(alpha(15)).toBeGreaterThan(0);
  });
});

describe("collars sit in front of the neck", () => {
  it("draws clothing over the head between the neck row and the neckline, and never above the neck row", () => {
    const body = figure(5, 25);
    const anchors = measureBodyAnchors(body);
    const head = createRaster(60, 100);
    fill(head, 22, 5, 37, 30, SKIN); // head with its neck reaching below the neck row
    const shirt = createRaster(60, 100);
    const COLLAR: Rgba = [40, 50, 90, 255];
    fill(shirt, 20, anchors.neck.row - 3, 39, 60, COLLAR); // a collar that rises above the neck row
    const out = assemblePerson(anchors, [
      { slot: "body", raster: body },
      { slot: "top", raster: shirt },
      { slot: "head", raster: head },
    ]);
    const px = (x: number, y: number) =>
      Array.from(out.data.slice((y * 60 + x) * 4, (y * 60 + x) * 4 + 3));
    expect(px(30, anchors.neck.row + 1)).toEqual([40, 50, 90]); // collar in front of the neck
    expect(px(30, anchors.neck.row - 2)).not.toEqual([40, 50, 90]); // the head wins above the neck row
  });

  it("lets an outfit replace separate top, bottoms, shoes and dress", () => {
    const anchors = measureBodyAnchors(figure(5, 25));
    const layer = createRaster(60, 100);
    const slots = placeLayers(anchors, [
      { slot: "body", raster: layer },
      { slot: "top", raster: layer },
      { slot: "shoes", raster: layer },
      { slot: "outfit", raster: layer },
    ]).map((placed) => placed.slot);
    expect(slots).toEqual(["body", "outfit"]);
  });
});

/** A figure whose arms hang apart from the hips, as on the six real bodies. */
function figureWithArms(): Raster {
  const r = createRaster(80, 120);
  fill(r, 32, 5, 47, 22, SKIN); // head
  fill(r, 37, 23, 42, 27, SKIN); // neck
  fill(r, 10, 28, 69, 34, SKIN); // shoulders, joining the arms
  fill(r, 26, 35, 53, 80, SKIN); // torso and hips
  fill(r, 10, 35, 18, 85, SKIN); // left arm, apart from the hips
  fill(r, 61, 35, 69, 85, SKIN); // right arm
  fill(r, 28, 60, 51, 72, GRAY); // underwear bottoms
  fill(r, 28, 81, 37, 115, SKIN_SHADOW); // left leg
  fill(r, 42, 81, 51, 115, SKIN_SHADOW); // right leg
  return r;
}

const copy = (r: Raster): Raster => ({
  width: r.width,
  height: r.height,
  data: new Uint8ClampedArray(r.data),
});
const alphaOf = (r: Raster, x: number, y: number) =>
  r.data[(y * r.width + x) * 4 + 3]!;

describe("trousers from a gloved fitting suit", () => {
  const bare = figureWithArms();
  const anchors = measureBodyAnchors(bare);
  const TROUSERS: Rgba = [96, 96, 100, 255];
  const painting = copy(bare);
  fill(painting, 26, 58, 53, 80, TROUSERS);
  fill(painting, 28, 81, 37, 115, TROUSERS);
  fill(painting, 43, 81, 51, 115, TROUSERS);
  fill(painting, 42, 81, 42, 115, [0, 0, 0, 0]); // the painted right leg stands a pixel off the bare one
  fill(painting, 10, 70, 18, 85, [120, 120, 120, 255]); // a glove on the left hand
  const { layer, hidesBody } = extractGarment(
    painting,
    bare,
    anchors,
    "legwear",
  );

  it("keeps the trousers and drops the gloves", () => {
    expect(alphaOf(layer, 32, 95)).toBe(255);
    expect(alphaOf(layer, 30, 65)).toBe(255);
    expect(alphaOf(layer, 14, 80)).toBe(0);
  });

  it("hides the bare legs under the trousers, but never the arms", () => {
    expect(hidesBody).not.toBeNull();
    expect(hidesBody![100 * 80 + 42]).toBe(1); // bare leg beside the narrower trouser leg
    expect(hidesBody![80 * 80 + 14]).toBe(0); // the hand
    const out = assemblePerson(anchors, [
      { slot: "body", raster: bare },
      { slot: "bottoms", raster: layer, hidesBody },
    ]);
    expect(alphaOf(out, 42, 100)).toBe(0); // no sliver of skin
    expect(alphaOf(out, 14, 80)).toBe(255); // the hand is the body's own
  });

  it("keeps the body where the painting shows skin, like the top of a foot", () => {
    const pumps = copy(painting);
    fill(pumps, 30, 112, 35, 113, SKIN_SHADOW);
    const { hidesBody: hides } = extractGarment(
      pumps,
      bare,
      anchors,
      "legwear",
    );
    expect(hides![112 * 80 + 32]).toBe(0);
  });
});

describe("a top below the waist", () => {
  it("keeps sleeves on the arms and drops the painting's own underwear on the hips", () => {
    const bare = figureWithArms();
    const anchors = measureBodyAnchors(bare);
    const painting = copy(bare);
    const SHIRT: Rgba = [150, 150, 152, 255];
    fill(painting, 26, 36, 53, 59, SHIRT);
    fill(painting, 10, 35, 18, 82, SHIRT); // a sleeve to the wrist
    fill(painting, 26, 62, 27, 70, GRAY); // underwear painted over the bare hip's skin
    const { layer } = extractGarment(painting, bare, anchors, "top");
    expect(alphaOf(layer, 14, 78)).toBe(255);
    expect(alphaOf(layer, 26, 66)).toBe(0);
    expect(alphaOf(layer, 40, 45)).toBe(255);
  });
});

describe("registration and fabric color", () => {
  it("moves a painting so its soles and head line up with the body", () => {
    const body = figureWithArms();
    const painting = translateRaster(body, 2, -3);
    const offset = registrationOffset(
      measureBodyAnchors(painting),
      measureBodyAnchors(body),
    );
    expect(offset).toEqual({ dx: -2, dy: 3 });
    const back = translateRaster(painting, offset.dx, offset.dy);
    expect(alphaOf(back, 32, 100)).toBe(alphaOf(body, 32, 100));
  });

  it("recolors gray cloth by its light and shade, and keeps ink lines dark on any color", () => {
    const cloth = createRaster(10, 10);
    fill(cloth, 0, 0, 9, 5, [128, 128, 128, 255]); // base
    fill(cloth, 0, 6, 9, 7, [95, 95, 95, 255]); // shadow
    fill(cloth, 0, 8, 9, 8, [175, 175, 175, 255]); // highlight
    fill(cloth, 0, 9, 9, 9, [25, 25, 25, 255]); // ink
    const lum = (r: Raster, y: number) => {
      const i = y * r.width * 4;
      return luminance(r.data[i]!, r.data[i + 1]!, r.data[i + 2]!);
    };
    const navy = recolorFabric(cloth, fabricRamp("navy"));
    expect(Array.from(navy.data.slice(0, 3))).toEqual([37, 52, 89]); // navy base
    expect(lum(navy, 6)).toBeLessThan(lum(navy, 0));
    expect(lum(navy, 8)).toBeGreaterThan(lum(navy, 0));
    const white = recolorFabric(cloth, fabricRamp("white"));
    expect(lum(white, 0)).toBeGreaterThan(200);
    expect(lum(white, 9)).toBeLessThan(40); // the drawing survives on white
  });
});

describe("a shirt tucked into trousers", () => {
  const bare = figureWithArms();
  const anchors = measureBodyAnchors(bare);
  const SUIT: Rgba = [120, 120, 124, 255];
  const TROUSERS: Rgba = [100, 100, 104, 255];
  const INK: Rgba = [20, 20, 22, 255];
  const painting = copy(bare);
  fill(painting, 26, 36, 53, 54, SUIT); // the fitting suit's top above the waistband
  fill(painting, 40, 36, 40, 54, INK); // a vertical seam in it
  fill(painting, 26, 55, 53, 80, TROUSERS);
  fill(painting, 28, 81, 37, 115, TROUSERS);
  fill(painting, 42, 81, 51, 115, TROUSERS);
  fill(painting, 26, 55, 53, 55, INK); // waistband top edge
  fill(painting, 26, 57, 53, 57, INK); // waistband lower edge
  const legwear = extractGarment(painting, bare, anchors, "legwear");

  it("finds the painted waistband and starts the trousers there", () => {
    expect(legwear.waistline![35]).toBe(55);
    expect(legwear.waistline![40]).toBe(55); // the seam does not count
    expect(alphaOf(legwear.layer, 35, 50)).toBe(0); // the suit above is not trousers
    expect(alphaOf(legwear.layer, 35, 56)).toBe(255);
  });

  it("draws the waistband over the shirt and ends the shirt under it", () => {
    const shirt = createRaster(80, 120);
    const SHIRT: Rgba = [200, 60, 60, 255];
    fill(shirt, 26, 36, 53, 59, SHIRT);
    const bottoms = {
      slot: "bottoms" as const,
      raster: legwear.layer,
      tucksTop: { waistline: legwear.waistline! },
    };
    expect(
      placeLayers(anchors, [
        { slot: "body", raster: bare },
        bottoms,
        { slot: "top", raster: shirt },
      ]).map((layer) => layer.slot),
    ).toEqual(["body", "top", "bottoms"]);
    const out = assemblePerson(anchors, [
      { slot: "body", raster: bare },
      bottoms,
      { slot: "top", raster: shirt },
    ]);
    const px = (x: number, y: number) =>
      Array.from(out.data.slice((y * 80 + x) * 4, (y * 80 + x) * 4 + 3));
    expect(px(35, 50)).toEqual([200, 60, 60]); // shirt above the waistband
    expect(px(35, 55)).toEqual([20, 20, 22]); // the waistband's edge over it
    expect(px(35, 58)).toEqual([100, 100, 104]); // trousers, not shirt, below
  });
});

describe("the people engine in the game", () => {
  const manifest = JSON.parse(
    readFileSync("art/people-engine/v1/manifest.json", "utf8"),
  ) as PeoplePackManifest;
  const adult = (overrides: Partial<Person> = {}): Person =>
    ({
      id: "person:test-1",
      birthDate: "1990-04-01",
      appearance: { seed: "seed-1", recipeVersion: "appearance-recipe-v1" },
      ...overrides,
    }) as unknown as Person;

  it("gives the same person the same look every time, and none to a child", () => {
    const first = engineRecipeFor(adult(), "2026-09-27", manifest);
    expect(first).not.toBeNull();
    expect(engineRecipeFor(adult(), "2026-09-27", manifest)).toEqual(first);
    expect(
      engineRecipeFor(
        adult({ birthDate: "2015-01-01" }),
        "2026-09-27",
        manifest,
      ),
    ).toBeNull();
  });

  it("follows the recorded gender, the player's choices and the occasion", () => {
    const woman = adult({
      identity: { gender: "female", pronouns: "she-her" },
    } as Partial<Person>);
    expect(engineRecipeFor(woman, "2026-09-27", manifest)!.presentation).toBe(
      "feminine",
    );
    const chosen = withEngineChoice(
      { people: { [woman.id]: woman } } as unknown as World,
      woman.id,
      {
        version: "people-engine-v1",
        build: "fuller",
        shade: 6,
        outfit: "formal",
      },
    ).people[woman.id]!;
    const recipe = engineRecipeFor(chosen, "2026-09-27", manifest)!;
    expect([recipe.build, recipe.shade, recipe.outfit]).toEqual([
      "fuller",
      6,
      "formal",
    ]);
    // Formal wear chosen, and the place is formal: it is kept.
    expect(
      engineRecipeFor(chosen, "2026-09-27", manifest, { wear: "formal" })!
        .outfit,
    ).toBe("formal");
    // At home she wears one of her everyday outfits, the same one every time.
    const home = engineRecipeFor(chosen, "2026-09-27", manifest, {
      wear: "casual",
    })!.outfit;
    const everyday = manifest.presentations.feminine.outfits.filter((outfit) =>
      outfit.tags.includes("casual"),
    );
    expect(everyday.map((outfit) => outfit.id)).toContain(home);
    expect(
      engineRecipeFor(chosen, "2026-09-27", manifest, { wear: "casual" })!
        .outfit,
    ).toBe(home);
    // Outdoors in the cold she wears her coat.
    const coat = engineRecipeFor(chosen, "2026-01-15", manifest, {
      wear: "cold",
    })!.outfit;
    expect(
      manifest.presentations.feminine.outfits
        .find((outfit) => outfit.id === coat)!
        .tags.includes("cold"),
    ).toBe(true);
  });

  it("has every outfit for every body, and composes a whole person from the pack", () => {
    const read = (file: string): Raster => {
      const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
      return {
        width: png.width,
        height: png.height,
        data: new Uint8ClampedArray(png.data),
      };
    };
    for (const presentation of ["feminine", "masculine"] as const)
      for (const outfit of manifest.presentations[presentation].outfits)
        for (const build of ["lean", "average", "fuller"] as const) {
          expect(outfit.builds[build]).toBeDefined();
          // Every colorable part has a mask, and every part a known palette.
          expect(
            Object.keys(outfit.builds[build]!.regions ?? {}).sort(),
          ).toEqual(Object.keys(outfit.parts).sort());
          for (const palette of Object.values(outfit.parts))
            expect(PART_PALETTES[palette]?.length).toBeGreaterThan(0);
        }
    const { raster, anchors } = composeEnginePerson(manifest, read, {
      presentation: "masculine",
      build: "average",
      shade: 5,
      face: "",
      hair: "",
      hairColor: "blonde",
      outfit: "formal",
    });
    expect([raster.width, raster.height]).toEqual([
      manifest.canvas.width,
      manifest.canvas.height,
    ]);
    // Opaque from the top of the head to the soles, at the neck point.
    expect(
      alphaOf(raster, Math.round(anchors.neck.centerX), anchors.neck.row),
    ).toBe(255);
    expect(skinInGarment(raster).share).toBeLessThan(0.5);
  });

  it("ages a face with the person: the same face, painted for their years", () => {
    const at = (birthDate: string) =>
      engineRecipeFor(
        adult({ birthDate, identity: { gender: "male" } } as Partial<Person>),
        "2026-09-27",
        manifest,
      )!.face;
    const young = at("1996-01-01");
    expect(young.startsWith("20s30s-")).toBe(true);
    const number = young.slice(-2);
    expect(at("1971-01-01")).toBe(`50s-${number}`);
    expect(at("1950-01-01")).toBe(`70s-${number}`);
    expect(faceBand(44)).toBe("20s30s");
    expect(faceBand(45)).toBe("50s");
    expect(faceBand(65)).toBe("70s");
  });

  it("dresses a crowd in many outfits, and nobody in a uniform by chance", () => {
    const worn = new Map<string, number>();
    for (let n = 0; n < 200; n += 1) {
      const recipe = engineRecipeFor(
        adult({
          id: `person:crowd-${n}`,
          appearance: {
            seed: `crowd-${n}`,
            recipeVersion: "appearance-recipe-v1",
          },
        } as Partial<Person>),
        "2026-09-27",
        manifest,
      )!;
      const outfit = manifest.presentations[recipe.presentation].outfits.find(
        (o) => o.id === recipe.outfit,
      )!;
      expect(outfit.tags).toContain("casual");
      expect(outfit.tags).not.toContain("uniform");
      const key = `${recipe.presentation}:${recipe.outfit}`;
      worn.set(key, (worn.get(key) ?? 0) + 1);
    }
    const everyday = (["feminine", "masculine"] as const).flatMap((p) =>
      manifest.presentations[p].outfits
        .filter((o) => o.tags.includes("casual") && !o.tags.includes("uniform"))
        .map((o) => `${p}:${o.id}`),
    );
    // Every everyday outfit turns up in a crowd of 200.
    expect([...worn.keys()].sort()).toEqual(everyday.sort());
  });

  it("seats people: every outfit on every seated body, hips on the seat, feet on the floor", () => {
    const read = (file: string): Raster => {
      const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
      return {
        width: png.width,
        height: png.height,
        data: new Uint8ClampedArray(png.data),
      };
    };
    for (const presentation of ["feminine", "masculine"] as const) {
      const pack = manifest.presentations[presentation];
      for (const outfit of pack.outfits)
        for (const build of ["lean", "average", "fuller"] as const)
          expect(outfit.seated?.[build]).toBeDefined();
      const recipe = {
        presentation,
        build: "average" as const,
        shade: 4,
        face: "",
        hair: "",
        hairColor: "natural",
        outfit: pack.outfits[0]!.id,
        pose: "seated" as const,
      };
      const { raster, anchors, seatRow } = composeEnginePerson(
        manifest,
        read,
        recipe,
      );
      expect(seatRow).toBe(pack.seated!.bodies.average.seatRow);
      // The body is there at the seat, between the soles and the head.
      expect(seatRow!).toBeGreaterThan(anchors.neck.row);
      expect(seatRow!).toBeLessThan(anchors.feet);
      expect(
        alphaOf(raster, Math.round(anchors.neck.centerX), seatRow! - 4),
      ).toBe(255);
      // In a room: the soles on the floor line, the seat row on the seat line.
      const seat = {
        seat_plane_y_percent: 62,
        seat_front_x_percent: 50,
        seat_width_percent: 9,
        floor_y_percent: 76,
        seat_z_order: 2,
        backrest_z_order: 1,
      };
      const standingBox = 34;
      const box = seatedEngineBox(recipe, seat, standingBox);
      const body = pack.seated!.bodies.average.anchors;
      const figure = body.feet - body.top + 1;
      const rowY = (row: number) =>
        box.topPercent + ((row - body.top) / figure) * box.heightPercent;
      expect(rowY(body.feet + 1)).toBeCloseTo(76, 5);
      expect(rowY(seatRow! + 1)).toBeCloseTo(62, 0);
    }
  });

  it("never cuts off a hairstyle at the top of the picture, on any body", () => {
    const cache = new Map<string, Raster>();
    const read = (file: string): Raster => {
      const cached = cache.get(file);
      if (cached) return cached;
      const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
      const raster = {
        width: png.width,
        height: png.height,
        data: new Uint8ClampedArray(png.data),
      };
      cache.set(file, raster);
      return raster;
    };
    const clipped: string[] = [];
    for (const presentation of ["feminine", "masculine"] as const)
      for (const hair of manifest.presentations[presentation].hair)
        for (const build of ["lean", "average", "fuller"] as const) {
          const { raster } = composeEnginePerson(manifest, read, {
            presentation,
            build,
            shade: 3,
            face: "",
            hair: hair.id,
            hairColor: "natural",
            outfit: "casual",
          });
          // The top rows stay empty: the hair ends below the picture's edge.
          let opaque = 0;
          for (let i = 3; i < raster.width * 8 * 4; i += 4)
            if (raster.data[i]! > 0) opaque += 1;
          if (opaque > 0) clipped.push(`${presentation} ${hair.id} ${build}`);
        }
    expect(clipped).toEqual([]);
  }, 120_000);
});

describe("resource currency startup", () => {
  it("creates a validated money amount after the appearance suite initializes", async () => {
    const { money } = await import("../../simulation/resources");
    expect(money(125, "USD")).toEqual({ minorUnits: 125, currency: "USD" });
  });
});
