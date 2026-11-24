import { expect, it } from "vitest";
import { fitMoves, moveVariantKey, pronounFor } from "./move-fit";

const relations = new Set(["father", "mother"]);
const base = { relationWord: undefined, relationWords: relations, facts: {} };

it("fits a pronoun to the person spoken of, a relative to that relative, and a fact to the moment that has it", () => {
  const moves = [
    { key: "a", text: "She moved away.", pronoun: "she" as const },
    { key: "b", text: "He moved away.", pronoun: "he" as const },
    { key: "c", text: "My father moved away." },
    { key: "d", text: "It came up.", requiresFacts: ["job"] },
    { key: "e", text: "Nothing special." },
  ];
  const keys = (rows?: readonly { key: string }[]) => rows?.map((r) => r.key);
  expect(
    keys(fitMoves(moves, { ...base, about: { gender: "female" } })),
  ).toEqual(["a", "e"]);
  expect(keys(fitMoves(moves, { ...base, about: undefined }))).toEqual(["e"]);
  expect(
    keys(
      fitMoves(moves, {
        ...base,
        about: { gender: "male" },
        relationWord: "father",
        facts: { job: { text: "x" } },
      }),
    ),
  ).toEqual(["b", "c", "d", "e"]);
  expect(fitMoves(undefined, { ...base, about: undefined })).toBeUndefined();
});

it("names a variant by its choice and part, and a person without a recorded gender is they", () => {
  expect(moveVariantKey({ key: "ask.job", part: "job", text: "" })).toBe(
    "ask.job",
  );
  expect(moveVariantKey({ key: "ask", part: "job", text: "" })).toBe("ask.job");
  expect(moveVariantKey({ key: "ask", text: "" })).toBe("ask");
  expect(pronounFor(undefined)).toBe("they");
});
