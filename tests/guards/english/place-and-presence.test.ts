import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The English ban (owner, Oct 27, 4 PM Eastern: "When it says you're in place
 * or person is with you, I hate those. Remove every instance of that from the
 * English engine. Block that."). The screen shows where the player is and who
 * is there; narration never restates it (scene-standard). No bank piece, no
 * corpus shape that would mine one back, and no string in the director, the
 * English engine or the bench says only "You're in {place}" or "{person} is
 * with you".
 */

const ROOT = path.resolve(__dirname, "../../..");

/** A sentence that only says where the player is. */
const PLACE =
  /^(?:You(?:'re| are)(?: now| out| over| back| standing| inside)? (?:in|at|inside) (?:\{[a-z]+\}|\$\{[^}]+\}|your (?:home|house|workplace)|the (?:house|office|plant)|(?:work|school|class|town|downtown))(?: (?:home|house|place|today))?|You(?:'re| are) (?:outside|home|back home|here|downtown|in town|out and about|at home)|Welcome to \{(?:place|town)\})\.?$/i;
/** A sentence that only says who is there. */
const PRESENT =
  /(?:\{[a-z]+\}|\$\{[^}]+\}|Your [a-z]+)(?:,[^.]*,)? (?:is|are) (?:with you|here|there|waiting(?: for you)?)(?: too| (?:when you [a-z ]+|for it))?\.$|, and (?:\{[a-z]+\}|\$\{[^}]+\}) is there(?: [a-z ]+)?\.$|is among the people who have come/;

const banned = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .some((sentence) => PLACE.test(sentence) || PRESENT.test(sentence));

/** Every string value in a JSON document. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) strings(item, out);
  return out;
}

function files(dir: string, keep: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full, keep);
    return keep(full) ? [full] : [];
  });
}

/** The string literals in a source file: quoted, single-quoted and template text. */
function literals(source: string): string[] {
  return [...source.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map(
    (match) => match[1] ?? match[2] ?? "",
  );
}

describe("the English ban: no line restates the place or who is there", () => {
  it("catches the shapes it bans and leaves story lines alone", () => {
    for (const text of [
      "You're in {place}.",
      "You are at {employer}.",
      "You're over at {host} place.",
      "You're outside.",
      "You're home.",
      "Liam Melendez is with you.".replace("Liam Melendez", "{name}"),
      "Your mother is with you.",
      "A child has been born, and {other} is there.",
      "You're in ${town}.",
      "You are at home",
    ])
      expect(banned(text), text).toBe(true);
    for (const text of [
      "You're in the cereal aisle when {name} parks a cart across from you.",
      "You're in {outlet}, and not in a good way.",
      "{name} is here tonight.",
      "I'm with you on {bill}.",
      "{other} falls in step with you in the hallway.",
      "The phone rings.",
    ])
      expect(banned(text), text).toBe(false);
  });

  it("no English bank or corpus shape holds a banned sentence", () => {
    const sources = [
      ...files(path.join(ROOT, "data/english"), (file) =>
        file.endsWith(".json"),
      ).filter(
        // Past grading batches are the record of what the engine once said.
        (file) => !file.includes(`${path.sep}batches${path.sep}`),
      ),
      ...files(path.join(ROOT, "scripts/english-corpus/shapes"), (file) =>
        file.endsWith(".json"),
      ),
    ];
    const found = sources.flatMap((file) =>
      strings(JSON.parse(readFileSync(file, "utf8")))
        .filter(banned)
        .map((text) => `${path.relative(ROOT, file)}: ${text}`),
    );
    expect(found).toEqual([]);
  });

  it("no string in the director, the English engine or the bench says one", () => {
    const sources = ["src/director", "src/english", "src/bench"].flatMap(
      (dir) =>
        files(
          path.join(ROOT, dir),
          (file) =>
            /\.(ts|mjs|js|json)$/.test(file) &&
            !/\.test\.|\.browser\./.test(file),
        ),
    );
    const found = sources.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      const values = file.endsWith(".json")
        ? strings(JSON.parse(text))
        : literals(text);
      return values
        .filter(banned)
        .map((value) => `${path.relative(ROOT, file)}: ${value}`);
    });
    expect(found).toEqual([]);
  });
});
