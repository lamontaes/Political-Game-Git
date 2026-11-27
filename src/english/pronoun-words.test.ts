import { expect, it } from "vitest";
import { possessiveOf, pronounKeyOf } from "./pronoun-words";

it("speaks of a person by their own recorded set, then by gender, else as they", () => {
  expect(possessiveOf({ pronouns: "she-her", gender: "male" })).toBe("her");
  expect(possessiveOf({ gender: "male" })).toBe("his");
  expect(possessiveOf({ gender: "female" })).toBe("her");
  expect(possessiveOf({ pronouns: "they-them", gender: "male" })).toBe("their");
  expect(possessiveOf({})).toBe("their");
  expect(pronounKeyOf({ pronouns: "he-him", gender: "female" })).toBe("he");
  expect(pronounKeyOf({ gender: "other" })).toBe("they");
});
