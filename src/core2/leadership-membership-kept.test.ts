/**
 * A chamber's leadership is read many times a day (each member's committees,
 * the presiding officer, a hearing's chair), and its member list is rebuilt
 * only when something it reads has changed: the date, or the offices,
 * officials or voting records. In play (bookkeeping off) fifty look-ups on one
 * day read the list at most once per chamber; the next day reads it once
 * again; and the posts read the same either way. Under bookkeeping the list is
 * rebuilt every time and checked against the kept one.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { bookkeeping, setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID } from "./modules/offices";
import {
  committeeRoster,
  leaderOf,
  membershipRebuilds,
  organize,
  presidingOfficer,
  type PostRow,
} from "./modules/leadership";

const LOOKUPS = 50;

describe("leadership keeps a chamber's membership until it can change", () => {
  it("reads each member list once a day in play, and the posts agree", () => {
    const seed = randomBytes(8).toString("hex");
    const draw = drawPlace(seed, "leadership-membership-kept");
    const where = `${draw.key}, seed ${seed}`;
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(world.core);
    const chambers = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    )
      .filter((office) => office.kind.startsWith("legislature-"))
      .map((office) => office.id)
      .sort();
    expect(chambers.length, where).toBeGreaterThan(0);
    const postsOf = (chamber: string) =>
      (organize(api, chamber) as readonly PostRow[])
        .map((post) => `${post.id}|${post.holderId}`)
        .sort();
    // Under bookkeeping (as tests run) every read rebuilds and checks the list.
    const checked = new Map(chambers.map((c) => [c, postsOf(c)] as const));
    const was = bookkeeping();
    setBookkeeping(false);
    try {
      for (const chamber of chambers) organize(api, chamber);
      const before = membershipRebuilds(world.core);
      for (let i = 0; i < LOOKUPS; i += 1)
        for (const chamber of chambers) {
          presidingOfficer(api, chamber);
          leaderOf(api, chamber, "majority-leader");
          committeeRoster(api, chamber, "finance");
          expect(postsOf(chamber), `${where}, ${chamber}`).toEqual(
            checked.get(chamber),
          );
        }
      expect(membershipRebuilds(world.core) - before, where).toBe(0);
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
      const nextDay = membershipRebuilds(world.core);
      for (let i = 0; i < LOOKUPS; i += 1)
        for (const chamber of chambers) presidingOfficer(api, chamber);
      expect(
        membershipRebuilds(world.core) - nextDay,
        where,
      ).toBeLessThanOrEqual(chambers.length);
    } finally {
      setBookkeeping(was);
    }
    expect(bookkeeping()).toBe(was);
    process.stdout.write(
      `leadership-membership-kept: ${where}, ${chambers.length} chambers\n`,
    );
  }, 240_000);
});
