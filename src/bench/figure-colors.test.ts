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
  SKIN_SWATCHES,
  recolorFigure,
} from "./figure-colors";

const file = (name: string) =>
  readFileSync(
    new URL(`../../art/people-engine/v2/figures/${name}`, import.meta.url),
  );

describe("figure colors", () => {
  const source = file("v2-01-m-medium.png");
  const base = PNG.sync.read(source);
  const changed = (skin: string, clothes: string) => {
    const out = PNG.sync.read(recolorFigure(source, skin, clothes));
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

  it("a skin swatch changes only skin pixels and a clothes swatch only clothing", () => {
    const skin = changed("dark", "gray");
    const clothes = changed("tan", "navy");
    expect(skin.pixels.length).toBeGreaterThan(5000);
    expect(clothes.pixels.length).toBeGreaterThan(5000);
    const skinSet = new Set(skin.pixels);
    expect(clothes.pixels.some((i) => skinSet.has(i))).toBe(false);
    // Outlines, eyes and the clear background stay as painted.
    for (let i = 0; i < base.data.length; i += 4) {
      if (skinSet.has(i)) continue;
      expect(skin.out.data[i + 3]).toBe(base.data[i + 3]);
    }
  });

  it("no two swatches in a row give the same figure, and tones run light to dark", () => {
    const meanOf = (skin: string) => {
      const { out, pixels } = changed(skin, "gray");
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

  it("the creator rows carry both colors, Randomize sets both, and the portrait wears them", () => {
    const look = drawnAppearance("male", "seed", 1);
    expect(look.skin).toBeDefined();
    expect(look.clothes).toBeDefined();
    const ids = appearanceRows(look, "male").map((row) => row.id);
    expect(ids).toEqual(expect.arrayContaining(["skin", "clothes-color"]));
    const picked = setColor(
      setColor(look, "skin", "ebony"),
      "clothes-color",
      "red",
    );
    expect(readRecipe(JSON.stringify(picked))).toMatchObject({
      skin: "ebony",
      clothes: "red",
    });
    expect(moveAppearance(picked, "male", "skin", 1).skin).not.toBe("ebony");
    expect(portraitPng(picked).equals(portraitPng(look))).toBe(false);
  });
});
