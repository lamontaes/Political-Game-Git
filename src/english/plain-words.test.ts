import { expect, it } from "vitest";
import {
  capitalFirst,
  fullNameOf,
  listWords,
  possessive,
} from "./plain-words.mjs";

it("writes a list with no serial comma, whatever the conjunction", () => {
  expect(listWords([])).toBe("");
  expect(listWords(["Ann"])).toBe("Ann");
  expect(listWords(["Ann", "Bo"])).toBe("Ann and Bo");
  expect(listWords(["Ann", "Bo", "Cy"])).toBe("Ann, Bo and Cy");
  expect(listWords(["Ann", "Bo", "Cy", "Di"], "or")).toBe("Ann, Bo, Cy or Di");
});

it("makes a possessive: a name ending in s takes only the apostrophe", () => {
  expect(possessive("Chen")).toBe("Chen's");
  expect(possessive("Chandler Builders")).toBe("Chandler Builders'");
});

it("raises a first letter and leaves the rest", () => {
  expect(capitalFirst("the mayor")).toBe("The mayor");
  expect(capitalFirst("")).toBe("");
});

it("joins a name given then family", () => {
  expect(fullNameOf({ givenName: "Ana", familyName: "Ruiz" })).toBe("Ana Ruiz");
});
