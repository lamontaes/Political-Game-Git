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
import { drawnFigure, faces, hairStyles } from "./figure-hair";
import heads from "./data/figure-heads.json" with { type: "json" };
import index from "../../art/people-engine/v2/index.json" with { type: "json" };

const rows = (
  index.figures as {
    file: string;
    pose: string;
    angle: string;
    sex: string;
    prop: string;
  }[]
).filter((row) => row.prop === "none");
// A random figure each run, named so a failure can be replayed.
const row =
  rows.find((r) => r.file.includes(process.env.PEOPLE_TEST_FIGURE ?? "\0")) ??
  rows[Math.floor(Math.random() * rows.length)]!;
const name = row.file
  .split("/")
  .pop()!
  .replace(/\.png$/, "");

describe(`hair on ${name} (${row.pose}, ${row.angle})`, () => {
  const bald = PNG.sync.read(drawnFigure(name, {}));

  it("lays every painted style on the head: new pixels only around the head box", () => {
    const [top, middle, width] = (heads.heads as Record<string, number[]>)[
      name
    ]!;
    for (const { style } of hairStyles(row.sex)) {
      const out = PNG.sync.read(
        drawnFigure(name, { hair: String(style), hairColor: "black" }),
      );
      let changed = 0,
        outside = 0;
      for (let y = 0; y < out.height; y++)
        for (let x = 0; x < out.width; x++) {
          const i = (y * out.width + x) * 4;
          if (
            out.data[i] === bald.data[i] &&
            out.data[i + 1] === bald.data[i + 1] &&
            out.data[i + 2] === bald.data[i + 2] &&
            out.data[i + 3] === bald.data[i + 3]
          )
            continue;
          changed++;
          // Long hair falls past the shoulders, never far off the head's column or below the waist.
          if (Math.abs(x - middle!) > width! * 1.6 || y > top! + width! * 6)
            outside++;
        }
      expect(changed, `style ${style}`).toBeGreaterThan(50);
      expect(outside / changed, `style ${style}`).toBeLessThan(0.02);
    }
  });

  it("colors the hair from the record", () => {
    const style = String(hairStyles(row.sex)[0]!.style);
    const black = drawnFigure(name, { hair: style, hairColor: "black" });
    const blonde = drawnFigure(name, { hair: style, hairColor: "blonde" });
    expect(black.equals(blonde)).toBe(false);
  });
});

describe("hair in the creator", () => {
  it("has a Hair row stepping the styles painted for the body, and a Hair color row; Randomize sets both", () => {
    for (const sex of ["female", "male"]) {
      expect(hairStyles(sex).length).toBeGreaterThan(3);
      const look = drawnAppearance(sex, "seed", 2);
      expect(look.hair).toBeDefined();
      expect(look.hairColor).toBeDefined();
      const ids = appearanceRows(look, sex).map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining(["hair", "hair-color"]));
      // Every style is reachable by the arrows, and Bald.
      const seen = new Set<string>();
      let now = look;
      for (let n = 0; n <= hairStyles(sex).length; n++) {
        now = moveAppearance(now, sex, "hair", 1);
        seen.add(now.hair ?? "");
      }
      expect(seen).toEqual(
        new Set(["", ...hairStyles(sex).map((r) => String(r.style))]),
      );
      const picked = setColor(look, "hair-color", "auburn");
      expect(readRecipe(JSON.stringify(picked))).toMatchObject({
        hair: look.hair,
        hairColor: "auburn",
      });
      expect(portraitPng(picked).equals(portraitPng(look))).toBe(
        look.hairColor === "auburn",
      );
    }
  });
});

it("reads the figure files it draws", () => {
  expect(
    readFileSync(
      new URL(`../../art/people-engine/v2/${row.file}`, import.meta.url),
    ).length,
  ).toBeGreaterThan(0);
});

describe(`a face on ${name}`, () => {
  it("changes only pixels around the head, and takes the person's skin color", () => {
    // With the painted skin, so nothing else is recolored.
    const painted = faces(row.sex);
    if (row.angle === "back" || !painted.length) return;
    const [top, middle, width] = (heads.heads as Record<string, number[]>)[
      name
    ]!;
    const plain = PNG.sync.read(drawnFigure(name, {}));
    for (const { face } of painted) {
      const out = PNG.sync.read(drawnFigure(name, { face: String(face) }));
      let changed = 0,
        outside = 0;
      for (let y = 0; y < out.height; y++)
        for (let x = 0; x < out.width; x++) {
          const i = (y * out.width + x) * 4;
          if (
            out.data[i] === plain.data[i] &&
            out.data[i + 1] === plain.data[i + 1] &&
            out.data[i + 2] === plain.data[i + 2]
          )
            continue;
          changed++;
          if (Math.abs(x - middle!) > width! || y > top! + width! * 2.2)
            outside++;
        }
      expect(changed, `face ${face}`).toBeGreaterThan(20);
      expect(outside / changed, `face ${face}`).toBeLessThan(0.02);
      // A darker skin reaches the face too.
      const dark = drawnFigure(name, { face: String(face), skin: "deep" });
      expect(dark.equals(drawnFigure(name, { face: String(face) }))).toBe(
        false,
      );
    }
  });
});

it("draws every person seen from behind, with their hair from behind", async () => {
  const { default: backs } = await import(
    "../../art/people-engine/v2/figures-back.json",
    { with: { type: "json" } }
  );
  for (const row of backs.figures) {
    const name = row.id;
    const bald = drawnFigure(name, {});
    const style = String(hairStyles(row.sex)[0]!.style);
    const haired = drawnFigure(name, { hair: style, hairColor: "black" });
    expect(haired.equals(bald), name).toBe(false);
  }
});
