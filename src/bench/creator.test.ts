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

  it("steps the appearance and draws the portrait", () => {
    const recipe = drawnAppearance("female", "seed", 0);
    const labels = appearanceRows(recipe, "female").map((row) => row.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Build",
        "Skin tone",
        "Face",
        "Hair",
        "Hair color",
        "Outfit",
      ]),
    );
    expect(labels).not.toContain("Body");
    const next = moveAppearance(recipe, "female", "hair", 1);
    expect(next.hair).not.toBe(recipe.hair);
    expect(readRecipe(JSON.stringify(next))).toEqual(next);
    expect(portraitPng(next).subarray(1, 4).toString()).toBe("PNG");
  });
});
