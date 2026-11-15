/**
 * A body's leadership posts and committees come out the same when each
 * pair's rating is worked out once for the organizing, not again for every
 * post. Pinned at Vilas, South Dakota (place 4667340) and Odessa,
 * Washington (place 5350745): the digest below was taken from the code
 * that rated the pair for every post, over the same chambers.
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
  type CommitteeRow,
  type PostRow,
} from "./modules/leadership";

const CASES = [
  {
    place: "4667340",
    seed: "c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716",
    digest: "fd84f73f059a5795",
  },
  {
    place: "5350745",
    seed: "6446dd140ffc5ca029e4fd4b314e0f424645865663f86366745f22f2746f441b",
    digest: "211405bec7aef8dc",
  },
] as const;

describe("leadership organizing rates each pair once", () => {
  for (const c of CASES) {
    it(`place ${c.place}: the same holders, votes and committee seats`, () => {
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
      const digest = createHash("sha256")
        .update(lines.join("\n"))
        .digest("hex")
        .slice(0, 16);
      expect(digest).toBe(c.digest);
    }, 120_000);
  }
});
