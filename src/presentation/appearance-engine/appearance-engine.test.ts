import { describe, expect, it } from "vitest";
import { measureBodyAnchors, neckOffset } from "./anchors";
import { assemblePerson, composite, placeLayers } from "./assemble";
import { neckJoin, skinInGarment } from "./checks";
import { createRaster, luminance, type Raster } from "./raster";
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
