import { describe, expect, it } from "vitest";

import {
  GIVEN_NAME_GENERATION_POOLS_V1,
  givenNamePoolForStatedGender,
} from "../simulation";
import {
  creatorBirthDate,
  creatorCharacterHint,
  creatorCharacterMissing,
  statedCreatorGender,
} from "./creator-character";
import {
  applyFullBirthday,
  birthYearChoices,
  creatorStartDate,
} from "./creator-full-birthday";
import { previewCreatorNames } from "./creator-name-preview";
import { DEFAULT_NEW_GAME_SETUP, type NewGameSetup } from "./new-game";
import { birthdayProblemForSetup } from "./new-game-birthday";

const FRESH: NewGameSetup = { ...DEFAULT_NEW_GAME_SETUP, seed: "r7-creator" };

function complete(): NewGameSetup {
  return applyFullBirthday(
    {
      ...FRESH,
      gender: "female",
      givenName: "Avery",
      familyName: "Cole",
    },
    { year: 1990, month: 3, day: 28 },
  )!;
}

describe("creator character step (R7)", () => {
  it("requires a gender, a whole name and a whole birthday for a new life", () => {
    expect(creatorCharacterMissing(FRESH, false)).toEqual([
      "gender",
      "name",
      "birthday",
    ]);
    expect(creatorCharacterMissing(complete(), true)).toEqual([]);
  });

  it("does not accept the stored 'unstated' value as a choice", () => {
    expect(statedCreatorGender("unstated")).toBeNull();
    expect(statedCreatorGender(undefined)).toBeNull();
    expect(statedCreatorGender("nonbinary")).toBe("nonbinary");
    expect(
      creatorCharacterMissing({ ...complete(), gender: "unstated" }, true),
    ).toEqual(["gender"]);
  });

  it("needs both names, not just one, and ignores blank space", () => {
    expect(
      creatorCharacterMissing({ ...complete(), familyName: null }, true),
    ).toEqual(["name"]);
    expect(
      creatorCharacterMissing({ ...complete(), givenName: "  " }, true),
    ).toEqual(["name"]);
  });

  it("keeps Next closed until month, day and year are all chosen", () => {
    const setup = complete();
    expect(creatorCharacterMissing(setup, false)).toEqual(["birthday"]);
    const noDay: { -readonly [K in keyof NewGameSetup]: NewGameSetup[K] } = {
      ...setup,
    };
    delete noDay.birthDay;
    expect(creatorCharacterMissing(noDay, true)).toEqual(["birthday"]);
  });

  it("accepts a leap-day birthday in a leap year only", () => {
    const years = birthYearChoices(2, 29, creatorStartDate(FRESH));
    expect(years.length).toBeGreaterThan(0);
    expect(years.every((year) => year % 4 === 0)).toBe(true);
    const leap = applyFullBirthday(
      { ...complete() },
      { year: 2000, month: 2, day: 29 },
    )!;
    expect(leap).not.toBeNull();
    expect(birthdayProblemForSetup(leap)).toBeNull();
    expect(creatorCharacterMissing(leap, true)).toEqual([]);
    expect(creatorBirthDate(leap)).toBe("2000-02-29");
    expect(
      applyFullBirthday(complete(), { year: 2001, month: 2, day: 29 }),
    ).toBeNull();
  });

  it("says what is left in plain words", () => {
    expect(creatorCharacterHint([])).toBeNull();
    expect(creatorCharacterHint(["gender", "name", "birthday"])).toBe(
      "To continue, choose a gender, a first and last name, and a full birthday (month, day and year).",
    );
  });

  it("draws a randomized first name from the chosen gender's pool", () => {
    for (let salt = 1; salt <= 20; salt += 1) {
      expect(givenNamePoolForStatedGender("male")).toContain(
        previewCreatorNames("r7", "male", salt).givenName,
      );
      expect(givenNamePoolForStatedGender("female")).toContain(
        previewCreatorNames("r7", "female", salt).givenName,
      );
      expect(GIVEN_NAME_GENERATION_POOLS_V1.neutral).toContain(
        previewCreatorNames("r7", "nonbinary", salt).givenName,
      );
    }
  });
});
