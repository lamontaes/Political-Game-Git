import { expect, it } from "vitest";
import figures from "../bench/data/whole-figures.json" with { type: "json" };
import { SITUATION_LIBRARY } from "./scheduling";

// A scene's occasion (address, signing, visit, debate, ceremony) tells the
// people pack whether an office holder sits, stands or takes a podium
// (src/bench/scene.ts stagePeople, agreed with Words Oct 29). An occasion the
// pack does not know falls back to seated without a word, so every one a
// situation type names must be one of the pack's postures.
it("names only occasions the people pack places", () => {
  const known = new Set(Object.keys(figures.occasions.postures));
  const named = SITUATION_LIBRARY.types.flatMap((type) =>
    type.occasion ? [`${type.key}: ${type.occasion}`] : [],
  );
  expect(named.length).toBeGreaterThan(1);
  expect(
    named.filter((row) => !known.has(row.slice(row.indexOf(": ") + 2))),
  ).toEqual([]);
});

// The occasions of the scenes that stage an office holder at work: the
// address at the desk, a signing or a veto at the desk, a visit standing,
// a debate at the podium, the oath standing.
it("gives each office scene the occasion its staging needs", () => {
  const occasionOf = new Map(
    SITUATION_LIBRARY.types.map((type) => [type.key, type.occasion]),
  );
  expect(
    Object.fromEntries(
      [
        "address",
        "bill-signed",
        "veto",
        "visit",
        "debate-sitting",
        "swearing-in",
      ].map((key) => [key, occasionOf.get(key)]),
    ),
  ).toEqual({
    address: "address",
    "bill-signed": "signing",
    veto: "signing",
    visit: "visit",
    "debate-sitting": "debate",
    "swearing-in": "ceremony",
  });
});
