import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import baseline from "./scene-pattern-baseline.json";

/**
 * Every scene is built from a real-lives pattern (owner, Nov 18: "look at all
 * the lines that are written... check the same format, and also do the same
 * kind of research for other previous scenes... make it a skill or a rule or a
 * guard"; CTO, #9747). A situation type names its pattern in a `pattern` field,
 * and the pattern is a row of docs/story/scene-patterns.json (role and setting
 * slots, gates, weights, branches, unlocks, sources). A scene kind with no
 * pattern is researched first, before any line is written for it.
 *
 *  - a type that names a pattern names one the bank holds;
 *  - a type without a pattern is on the baseline list, which only shrinks:
 *    a new type must carry its pattern from the start;
 *  - a baseline key that no longer names a type, or whose type now has a
 *    valid pattern, comes off the list in the same change.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) =>
  JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));

type Situation = { key: string; pattern?: string | string[] };
const types = read("src/director/data/situation-types.json")
  .types as Situation[];
const patternIds = new Set<string>(
  (read("docs/story/scene-patterns.json").patterns as { id: string }[]).map(
    (p) => p.id,
  ),
);
const listed = new Set<string>(baseline.untilPattern);

const patternsOf = (type: Situation): string[] =>
  type.pattern === undefined
    ? []
    : Array.isArray(type.pattern)
      ? type.pattern
      : [type.pattern];

describe("every scene is built from a real-lives pattern", () => {
  it("a type that names a pattern names one in docs/story/scene-patterns.json", () => {
    const dead = types.flatMap((type) =>
      patternsOf(type)
        .filter((id) => !patternIds.has(id))
        .map((id) => `${type.key}: pattern "${id}" is not in the bank`),
    );
    expect(dead, dead.join("\n")).toEqual([]);
  });

  it("a type with no pattern is on the baseline list, so a new type carries its pattern from the start", () => {
    const fresh = types
      .filter((type) => patternsOf(type).length === 0)
      .map((type) => type.key)
      .filter((key) => !listed.has(key));
    expect(
      fresh,
      `Give each new type a \`pattern\` from docs/story/scene-patterns.json (research one first if none fits): ${fresh.join(", ")}`,
    ).toEqual([]);
  });

  it("the baseline only shrinks: a key comes off once its type has a pattern or is gone", () => {
    const byKey = new Map(types.map((type) => [type.key, type]));
    const stale = [...listed].filter((key) => {
      const type = byKey.get(key);
      return !type || patternsOf(type).length > 0;
    });
    expect(
      stale,
      `Take these off tests/guards/scene-pattern-baseline.json: ${stale.join(", ")}`,
    ).toEqual([]);
  });
});
