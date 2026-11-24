/**
 * A body's leadership posts and committees come out the same when each
 * pair's rating is worked out once for the organizing, not again for every
 * post. Two worlds built the same way at Vilas, South Dakota (place 4667340)
 * and Odessa, Washington (place 5350745) are organized, one with the reuse and
 * one with every post rating the pair again (the switch beside the rating
 * code), over the same chambers; their digests must match.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID } from "./modules/offices";
import {
  LEADERSHIP_MODULE_ID,
  organize,
  setRatingReuse,
  type CommitteeRow,
  type PostRow,
} from "./modules/leadership";

const CASES = [
  {
    place: "4667340",
    seed: "c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716",
  },
  {
    place: "5350745",
    seed: "6446dd140ffc5ca029e4fd4b314e0f424645865663f86366745f22f2746f441b",
  },
] as const;

const digestOf = (c: (typeof CASES)[number], reuse: boolean) => {
  setRatingReuse(reuse);
  try {
    const world = buildBenchWorld(c.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: c.place,
    });
    const api = coreAPI(world.core);
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const chambers = offices
      .filter((o) => o.kind.startsWith("legislature-"))
      .map((o) => o.id)
      .sort()
      .filter((_, i) => i % 9 === 0)
      .slice(0, 6);
    expect(chambers.length).toBeGreaterThan(3);
    const lines: string[] = [];
    for (const chamber of chambers) {
      for (const post of organize(api, chamber) as readonly PostRow[])
        lines.push(
          `${post.id}|${post.holderId}|${JSON.stringify(
            Object.entries(post.votes).sort(),
          )}`,
        );
    }
    const committees = api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("committees")
      .rows() as unknown as CommitteeRow[];
    for (const row of committees)
      if (chambers.includes(row.chamber))
        lines.push(`${row.id}|${row.chairId}|${row.memberIds.join(",")}`);
    lines.sort();
    expect(lines.length).toBeGreaterThan(chambers.length);
    return createHash("sha256")
      .update(lines.join("\n"))
      .digest("hex")
      .slice(0, 16);
  } finally {
    setRatingReuse(true);
  }
};

describe("leadership organizing rates each pair once", () => {
  for (const c of CASES) {
    it(`place ${c.place}: the same holders, votes and committee seats with and without the reuse`, () => {
      const reused = digestOf(c, true);
      const again = digestOf(c, false);
      expect(reused).toBe(again);
    }, 240_000);
  }
});
