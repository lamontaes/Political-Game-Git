/**
 * The director stages only the scene kinds on the written list (owner, Nov 17,
 * 2026, after playing v0.113.0: "STOP TRYING TO MAKE SHIT SHINE JUST DELETE
 * EVERYTHING THAT IT HASNT WRITTEN EBCAUSE THIS ISNT HELPING."; the CTO's
 * order on issue #9750). A situation type in the director's list that is not
 * on src/director/data/kept-scene-kinds.json fails here; a kind is added to
 * the written list only when the English engine composes its lines from the
 * world's own records.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const types = read<{ types: { key: string }[] }>(
  "src/director/data/situation-types.json",
).types.map((type) => type.key);
const kept = read<{ kinds: { key: string }[] }>(
  "src/director/data/kept-scene-kinds.json",
).kinds.map((kind) => kind.key);

describe("the director's scene kinds", () => {
  it("holds no situation type that is not on the written list", () => {
    expect(
      types.filter((key) => !kept.includes(key)),
      "a scene kind not on src/director/data/kept-scene-kinds.json: delete it, or put it on the list once its lines are composed from records",
    ).toEqual([]);
  });

  it("names each kept kind once", () => {
    expect(new Set(kept).size).toBe(kept.length);
  });
});
