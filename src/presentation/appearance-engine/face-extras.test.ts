import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import type { Person } from "../../simulation/types";
import {
  FACIAL_HAIR_SHARE,
  GLASSES_SHARE,
  facialHairFor,
  glassesFor,
} from "./face-extras";
import { LAYER_ORDER } from "./assemble";
import {
  FACIAL_HAIR_STYLES,
  engineRecipeKey,
  glassesOn,
  posedPieces,
  recipeFiles,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import { choiceFromRecipe, engineRecipeFor } from "./recipe";

const today = manifestJson as unknown as PeoplePackManifest;

/** The pack with every facial hair style and two frames painted. */
function withExtras(pack: PackPresentation, sex: string): PackPresentation {
  return {
    ...pack,
    ...(sex === "masculine"
      ? {
          facialHair: FACIAL_HAIR_STYLES.map((style) => ({
            id: style,
            file: `facial-hair-${sex}-${style}.png`,
          })),
        }
      : {}),
    glasses: ["round", "square"].map((frame) => ({
      id: frame,
      file: `glasses-${sex}-${frame}.png`,
    })),
  };
}
const EXTRAS: PeoplePackManifest = {
  ...today,
  presentations: {
    feminine: withExtras(today.presentations.feminine, "feminine"),
    masculine: withExtras(today.presentations.masculine, "masculine"),
  },
};

const seeds = Array.from({ length: 4000 }, (_, n) => `crowd-${n}`);

function adult(age: number, gender: "male" | "female", n: number): Person {
  return {
    id: `person:extras-${gender}-${age}-${n}`,
    birthDate: `${2026 - age}-01-01`,
    identity: { gender },
    appearance: {
      seed: `extras-${gender}-${age}-${n}`,
      recipeVersion: "appearance-recipe-v1",
    },
  } as unknown as Person;
}

describe("who wears facial hair", () => {
  it("gives men their age's share, within sampling error, and women none", () => {
    for (const { fromAge, share } of FACIAL_HAIR_SHARE) {
      const age = fromAge + 2;
      const bearded = seeds.filter(
        (seed) => facialHairFor(seed, age, "masculine", undefined) !== null,
      ).length;
      expect(Math.abs(bearded / seeds.length - share)).toBeLessThan(0.03);
    }
    expect(
      seeds.some((seed) => facialHairFor(seed, 40, "feminine", undefined)),
    ).toBe(false);
  });

  it("varies the style, and keeps each man's own", () => {
    const styles = new Set(
      // At 18-24 every style has a share (at 25-34 the survey found no
      // mustache worn alone).
      seeds.map((seed) => facialHairFor(seed, 20, "masculine", undefined)),
    );
    for (const style of FACIAL_HAIR_STYLES)
      expect(styles.has(style)).toBe(true);
    expect(facialHairFor("same", 30, "masculine", undefined)).toBe(
      facialHairFor("same", 30, "masculine", undefined),
    );
  });

  it("honors a saved choice, including a choice of none", () => {
    const choice = { version: "people-engine-v1" as const };
    expect(
      facialHairFor("s", 30, "masculine", { ...choice, facialHair: "goatee" }),
    ).toBe("goatee");
    const shaven = seeds.filter(
      (seed) =>
        facialHairFor(seed, 30, "masculine", {
          ...choice,
          facialHair: "none",
        }) !== null,
    );
    expect(shaven).toEqual([]);
  });
});

describe("who wears glasses", () => {
  const pack = EXTRAS.presentations.feminine;

  it("gives adults their age's share, within sampling error", () => {
    for (const { fromAge, share } of GLASSES_SHARE) {
      const age = fromAge + 2;
      const wearing = seeds.filter(
        (seed) => glassesFor(seed, age, pack, undefined) !== null,
      ).length;
      expect(Math.abs(wearing / seeds.length - share)).toBeLessThan(0.03);
    }
  });

  it("has some over 45 wear them only to read, and nobody younger", () => {
    const reading = (age: number) =>
      seeds.filter(
        (seed) => glassesFor(seed, age, pack, undefined)?.wear === "reading",
      ).length;
    expect(reading(30)).toBe(0);
    expect(reading(55)).toBeGreaterThan(0);
  });

  it("gives nobody glasses before any frame is painted", () => {
    expect(
      seeds.some((seed) =>
        glassesFor(seed, 70, today.presentations.feminine, undefined),
      ),
    ).toBe(false);
  });
});

describe("drawing them", () => {
  it("puts facial hair and glasses over the face and under the front hair", () => {
    const at = (slot: (typeof LAYER_ORDER)[number]) =>
      LAYER_ORDER.indexOf(slot);
    expect(at("head")).toBeLessThan(at("facial-hair"));
    expect(at("facial-hair")).toBeLessThan(at("glasses"));
    expect(at("glasses")).toBeLessThan(at("front-hair"));
  });

  it("draws reading glasses only while reading, and no layer without its painting", () => {
    const pack = EXTRAS.presentations.masculine;
    const base = {
      presentation: "masculine" as const,
      build: "average" as const,
      shade: 3,
      face: pack.faces[0]!.id,
      hair: pack.hair[0]!.id,
      hairColor: "natural",
      outfit: pack.outfits[0]!.id,
      facialHair: "full-beard",
      glasses: "round",
    };
    const reader = { ...base, glassesWear: "reading" as const };
    expect(glassesOn(reader)).toBe(false);
    expect(glassesOn({ ...reader, reading: true })).toBe(true);
    expect(recipeFiles(EXTRAS, base)).toEqual(
      expect.arrayContaining([
        "facial-hair-masculine-full-beard.png",
        "glasses-masculine-round.png",
      ]),
    );
    expect(recipeFiles(EXTRAS, reader)).not.toContain(
      "glasses-masculine-round.png",
    );
    // A frame or a style the pack has not painted: no layer, never a broken one.
    const pieces = posedPieces(today.presentations.masculine, base);
    expect(pieces.facialHair).toBeUndefined();
    expect(pieces.glasses).toBeUndefined();
    expect(
      posedPieces(pack, base, (file) => !file.startsWith("glasses-")).glasses,
    ).toBeUndefined();
  });
});

describe("the recipe and the saved appearance", () => {
  it("leaves today's recipes and keys unchanged until the art lands", () => {
    for (let n = 0; n < 50; n += 1) {
      const person = adult(50, "male", n);
      const recipe = engineRecipeFor(person, "2026-09-28", today)!;
      expect(recipe.facialHair).toBeUndefined();
      expect(recipe.glasses).toBeUndefined();
      expect(engineRecipeKey(recipe)).not.toMatch(/beard:|glasses:/);
    }
  });

  it("dresses a crowd in the art once it lands, and remembers each choice", () => {
    let bearded = 0;
    let glasses = 0;
    for (let n = 0; n < 300; n += 1) {
      const recipe = engineRecipeFor(
        adult(35, "male", n),
        "2026-09-28",
        EXTRAS,
      )!;
      if (recipe.facialHair) bearded += 1;
      if (recipe.glasses) glasses += 1;
    }
    expect(bearded).toBeGreaterThan(150);
    expect(glasses).toBeGreaterThan(100);

    const person = adult(55, "male", 7);
    const recipe = engineRecipeFor(person, "2026-09-28", EXTRAS)!;
    const saved = choiceFromRecipe(recipe, EXTRAS);
    expect(saved.facialHair).toBe(recipe.facialHair ?? "none");
    expect(saved.glasses).toBe(recipe.glasses ?? "none");
    // Loaded again, the same person looks the same.
    const again = engineRecipeFor(
      {
        ...person,
        appearance: { ...person.appearance!, engine: saved },
      } as Person,
      "2026-09-28",
      EXTRAS,
    )!;
    expect(again.facialHair).toBe(recipe.facialHair);
    expect(again.glasses).toBe(recipe.glasses);
  });
});
