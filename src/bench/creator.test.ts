import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ageAtStart,
  birthYears,
  creatorStates,
  creatorTowns,
  drawBirthday,
  drawName,
  readChosenPerson,
} from "./creator";
import {
  appearanceRows,
  drawnAppearance,
  moveAppearance,
  portraitPng,
  readRecipe,
} from "./appearance";
import { lookFigures } from "./whole-figures";

describe("the New game creator", () => {
  it("draws a name before any gender is chosen, and again after", () => {
    const any = drawName("seed", 1);
    expect(any.givenName).not.toBe("");
    expect(any.familyName).not.toBe("");
    expect(drawName("seed", 2, "female").givenName).not.toBe("");
  });

  it("draws an adult birthday whose year is one of the labeled choices", () => {
    const b = drawBirthday("seed", 1);
    expect(ageAtStart(b.year, b.month, b.day)).toBeGreaterThanOrEqual(18);
    const years = birthYears(b.month, b.day);
    expect(years.map((row) => row.year)).toContain(b.year);
    expect(years[0]!.label).toMatch(/^\d{4} \(age \d+\)$/);
  });

  it("lists every state with places, and a state's towns with populations", () => {
    const states = creatorStates();
    expect(states.length).toBeGreaterThan(50);
    const state = states[Math.floor(states.length / 2)]!;
    const towns = creatorTowns(state.key, "");
    expect(towns.length).toBeGreaterThan(0);
    expect(towns.some((town) => (town.population ?? 0) > 0)).toBe(true);
  });

  it("refuses a person with no gender", () => {
    expect(() =>
      readChosenPerson(
        JSON.stringify({
          givenName: "A",
          familyName: "B",
          birthYear: 1980,
          birthMonth: 1,
          birthDay: 1,
        }),
      ),
    ).toThrow();
  });

  it("offers the figures the game draws, steps them and draws the portrait", () => {
    const recipe = drawnAppearance("female", "seed", 0);
    expect(recipe.sex).toBe("female");
    const labels = appearanceRows(recipe, "female").map((row) => row.label);
    expect(labels).toEqual(["Build", "Clothes"]);
    expect(appearanceRows(recipe, "nonbinary")[0]!.label).toBe("Body");
    const next = moveAppearance(recipe, "female", "outfit", 1);
    expect(next.outfit).not.toBe(recipe.outfit);
    expect(readRecipe(JSON.stringify(next))).toEqual(next);
    expect(() =>
      readRecipe(JSON.stringify({ ...next, outfit: "hair" })),
    ).toThrow();
    // The portrait is the standing v2 figure itself, as rooms draw it.
    const png = portraitPng(next);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    const file = lookFigures().find(
      (row) =>
        row.sex === next.sex &&
        row.build === next.build &&
        row.outfit === next.outfit,
    )!.file;
    expect(
      png.equals(
        readFileSync(
          new URL(`../../art/people-engine/v2/${file}`, import.meta.url),
        ),
      ),
    ).toBe(true);
  });
});
