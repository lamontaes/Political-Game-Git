import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * A person card's headings never show a slot (play-person-card-heading-shows-object-slot;
 * player-screen-text): `personCardNode` in src/bench/play.mjs words each heading with
 * `heading(key, theyKey)`, which fills the label's slots from the card's pronouns and,
 * for someone the card says "they" of (no pronoun words), shows `labels[theyKey ?? key]`
 * as written. That label must have no slot left in it, or the screen prints
 * "How I see {object}".
 */
const ROOT = path.resolve(__dirname, "../..");
const play = readFileSync(path.join(ROOT, "src/bench/play.mjs"), "utf8");
const labels = (
  JSON.parse(
    readFileSync(path.join(ROOT, "src/bench/data/controls.json"), "utf8"),
  ) as { person: Record<string, unknown> }
).person;

describe("the person card's headings", () => {
  const start = play.indexOf("async function personCardNode(");
  const body = play.slice(start, play.indexOf("\n}\n", start));
  const calls = [
    ...body.matchAll(/\bheading\(\s*"(\w+)"\s*(?:,\s*"(\w+)"\s*)?\)/g),
  ].map(([, key, theyKey]) => ({ key: key!, they: theyKey ?? key! }));

  it("are found in personCardNode", () => {
    expect(start).toBeGreaterThan(-1);
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  it("read with no slot for someone said as they", () => {
    const raw = calls
      .map(({ key, they }) => ({ key, they, text: String(labels[they]) }))
      .filter(({ text }) => /\{\w+\}/.test(text));
    expect(
      raw.map(
        ({ key, they, text }) =>
          `heading("${key}") falls back to "${they}": "${text}"`,
      ),
      "give the heading a they-form label beside it in controls.json and pass its key",
    ).toEqual([]);
  });
});
