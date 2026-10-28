import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import {
  appearanceRows,
  drawnAppearance,
  moveAppearance,
  portraitPng,
  readRecipe,
  setColor,
} from "./appearance";
import {
  CLOTHES_SWATCHES,
  GARMENTS,
  SKIN_SWATCHES,
  recolorFigure,
  type FigureColors,
} from "./figure-colors";

const file = (name: string) =>
  readFileSync(
    new URL(`../../art/people-engine/v2/figures/${name}`, import.meta.url),
  );

// A figure the art session has painted a garment map for (art/people-engine/v2/garments).
const NAME = "v2-37-m-medium";
const garments = PNG.sync.read(
  readFileSync(
    new URL(
      `../../art/people-engine/v2/garments/${NAME}-garments.png`,
      import.meta.url,
    ),
  ),
);
const pieceAt = (i: number) => {
  const [r, g, b] = [
    garments.data[i]!,
    garments.data[i + 1]!,
    garments.data[i + 2]!,
  ];
  return r > 200 && g < 60 && b < 60
    ? "jacket"
    : r > 200 && g > 200 && b < 60
      ? "shirt"
      : r < 60 && g < 60 && b > 200
        ? "pants"
        : r < 60 && g > 200 && b < 60
          ? "shoes"
          : null;
};

describe("figure colors", () => {
  const source = file(`${NAME}.png`);
  const base = PNG.sync.read(source);
  const changed = (colors: FigureColors) => {
    const out = PNG.sync.read(recolorFigure(source, NAME, colors));
    const pixels: number[] = [];
    for (let i = 0; i < out.data.length; i += 4)
      if (
        out.data[i] !== base.data[i] ||
        out.data[i + 1] !== base.data[i + 1] ||
        out.data[i + 2] !== base.data[i + 2]
      )
        pixels.push(i);
    return { out, pixels };
  };

  it("colors each piece of clothing on its own, and nothing the garment map leaves out (eyes, hair, skin)", () => {
    for (const garment of GARMENTS) {
      const { pixels } = changed({ [garment]: "red" });
      if (!pixels.length) continue;
      // Every changed pixel is that piece on the map.
      expect(pixels.every((i) => pieceAt(i) === garment)).toBe(true);
    }
    const all = changed({
      jacket: "red",
      shirt: "white",
      pants: "navy",
      shoes: "black",
    });
    expect(all.pixels.length).toBeGreaterThan(5000);
    expect(all.pixels.every((i) => pieceAt(i) !== null)).toBe(true);
  });

  it("a skin swatch changes only skin, never clothing", () => {
    const skin = changed({ skin: "dark" });
    expect(skin.pixels.length).toBeGreaterThan(2000);
    expect(skin.pixels.some((i) => pieceAt(i) !== null)).toBe(false);
  });

  it("no two swatches in a row give the same figure, and tones run light to dark", () => {
    const meanOf = (skin: string) => {
      const { out, pixels } = changed({ skin });
      return (
        pixels.reduce((n, i) => n + out.data[i]! + out.data[i + 1]!, 0) /
        pixels.length
      );
    };
    const skins = SKIN_SWATCHES.filter((s) => s.id !== "tan").map((s) =>
      meanOf(s.id),
    );
    expect(new Set(SKIN_SWATCHES.map((s) => s.color)).size).toBe(
      SKIN_SWATCHES.length,
    );
    expect(new Set(CLOTHES_SWATCHES.map((s) => s.color)).size).toBe(
      CLOTHES_SWATCHES.length,
    );
    expect([...skins].sort((a, b) => b - a)).toEqual(skins);
  });

  it("the creator has a color row per piece the outfit has, Randomize sets them, and the portrait wears them", () => {
    const look = { ...drawnAppearance("male", "seed", 1), outfit: "blazer" };
    expect(look.skin).toBeDefined();
    for (const garment of GARMENTS) expect(look[garment]).toBeDefined();
    const ids = appearanceRows(look, "male").map((row) => row.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "skin",
        "jacket-color",
        "shirt-color",
        "pants-color",
        "shoes-color",
      ]),
    );
    expect(
      appearanceRows({ ...look, outfit: "base" }, "male").map((row) => row.id),
    ).not.toContain("jacket-color");
    const picked = setColor(
      setColor(setColor(look, "skin", "ebony"), "pants-color", "navy"),
      "shirt-color",
      "white",
    );
    expect(readRecipe(JSON.stringify(picked))).toMatchObject({
      skin: "ebony",
      pants: "navy",
      shirt: "white",
    });
    expect(moveAppearance(picked, "male", "pants-color", 1).pants).not.toBe(
      "red",
    );
    expect(portraitPng(picked).equals(portraitPng(look))).toBe(false);
  });
});
