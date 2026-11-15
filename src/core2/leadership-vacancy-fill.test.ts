/**
 * A seat that changes hands in the middle of a term fills only what its
 * holder held: the posts they led and the committee seats they had. Every
 * other post and seat stands as it was (same holder, same day), the paper
 * gets the one post that changed hands, and a body whose majority changed
 * hands organizes in full. Pinned at Vilas, South Dakota (place 4667340),
 * the player's state's lower house, and Minnesota's Senate (34 to 33), whose
 * majority a played vacancy turns. Each leaver goes through the offices
 * engine's own vacancy writer (`vacateSeat`), as a resignation does.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { campaignParameter } from "./campaign-data";
import { partySide } from "./appointments";
import { memberKey, members } from "./modules/legislature";
import { vacateSeat } from "./modules/offices";
import {
  LEADERSHIP_MODULE_ID,
  organize,
  type CommitteeRow,
  type PostRow,
} from "./modules/leadership";
import type { CoreEventInput } from "./types";

const SEED = "c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716";
const CHAMBER = "office:US-SD:legislature-lower";

function setup() {
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: "4667340",
  });
  const api = coreAPI(world.core);
  organize(api, CHAMBER);
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 20));
  return { core: world.core, api };
}
const posts = (api: ReturnType<typeof coreAPI>, chamber = CHAMBER) =>
  [
    ...(api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .query("byChamber", [chamber]) as unknown as PostRow[]),
  ].sort((a, b) => a.post.localeCompare(b.post));
const committees = (api: ReturnType<typeof coreAPI>, chamber = CHAMBER) =>
  [
    ...(api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("committees")
      .query("byChamber", [chamber]) as unknown as CommitteeRow[]),
  ].sort((a, b) => a.committee.localeCompare(b.committee));

const ratioHolds = (api: ReturnType<typeof coreAPI>, chamber: string) => {
  const all = members(api, chamber);
  const count = (side: number) =>
    all.filter((t) => partySide(t.party) === side).length;
  const sides = [...new Set(all.map((t) => partySide(t.party)))]
    .map((s) => [s, count(s)] as const)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const minority = sides[1]?.[1] ?? 0;
  const size = Math.min(
    all.length,
    Math.max(
      campaignParameter("committeeSizeMinimum"),
      Math.min(
        campaignParameter("committeeSizeMaximum"),
        campaignParameter("committeeSize"),
      ),
    ),
  );
  const target = Math.min(
    minority,
    Math.round((size * minority) / all.length),
    size - (Math.floor(size / 2) + 1),
  );
  const majorityKeys = new Set(
    all.filter((t) => partySide(t.party) === sides[0]![0]).map(memberKey),
  );
  for (const row of committees(api, chamber)) {
    const minorityHere = row.memberIds.filter(
      (id) => !majorityKeys.has(id),
    ).length;
    expect(minorityHere, row.committee).toBeLessThanOrEqual(target);
    expect(
      row.memberIds.length - minorityHere,
      row.committee,
    ).toBeLessThanOrEqual(size - target);
  }
};

describe("a vacancy fills what its holder held", () => {
  it("the leaver's post and seats are filled; everything else stands, and the paper hears of the one post", () => {
    const { api } = setup();
    organize(api, CHAMBER);
    const before = posts(api);
    const seatsBefore = committees(api);
    expect(before.length).toBeGreaterThan(2);
    expect(seatsBefore.length).toBeGreaterThan(3);
    const presiding = before.find((p) => p.post === "speaker") ?? before[0]!;
    const leaver = members(api, CHAMBER).find(
      (t) => memberKey(t) === presiding.holderId,
    )!;
    const sat = new Set(members(api, CHAMBER).map(memberKey));
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (event.kind === "chamber-organized") seen.push(event);
      return emit(event);
    };
    vacateSeat(api, leaver.seatId, "resigned");
    organize(api, CHAMBER);
    const after = posts(api);
    const sitting = new Set(members(api, CHAMBER).map(memberKey));
    // The post the leaver led changed hands, to someone sitting.
    const now = after.find((p) => p.post === presiding.post)!;
    expect(now.holderId).not.toBe(presiding.holderId);
    expect(sitting.has(now.holderId!)).toBe(true);
    // Every other post stands as it was: same holder, same day.
    for (const post of before.filter((p) => p.post !== presiding.post)) {
      const same = after.find((p) => p.post === post.post);
      expect(same, post.post).toEqual(post);
    }
    // A seat whose members all still sit is the same row; one the leaver
    // sat on is refilled to the same size and names no one who left.
    for (const row of seatsBefore) {
      const next = committees(api).find((c) => c.committee === row.committee)!;
      if (!row.memberIds.includes(leaver.personId ?? memberKey(leaver)))
        expect(next, row.committee).toEqual(row);
      else {
        expect(next.memberIds, row.committee).toHaveLength(
          row.memberIds.length,
        );
        expect(next.memberIds.every((id) => sitting.has(id))).toBe(true);
        expect(sitting.has(next.chairId)).toBe(true);
      }
    }
    // A member who arrived sits where the leaver sat.
    const arrivals = [...sitting].filter((k) => !sat.has(k));
    expect(arrivals.length).toBeGreaterThan(0);
    const leaverSeats = seatsBefore.filter((c) =>
      c.memberIds.includes(memberKey(leaver)),
    );
    expect(leaverSeats.length).toBeGreaterThan(0);
    for (const arrival of arrivals)
      expect(
        leaverSeats.some((c) =>
          committees(api)
            .find((n) => n.committee === c.committee)!
            .memberIds.includes(arrival),
        ),
      ).toBe(true);
    // The paper hears of the one post that changed hands, and no other.
    expect(seen).toHaveLength(1);
    expect(Object.keys(seen[0]!.facts ?? {}).sort()).toEqual(
      ["level", presiding.post].sort(),
    );
  }, 180_000);

  it("a vacancy of a member who held no post prints nothing and changes no post", () => {
    const { api } = setup();
    organize(api, CHAMBER);
    const before = posts(api);
    const seatsBefore = committees(api);
    const held = new Set(before.map((p) => p.holderId));
    const leaver = members(api, CHAMBER).find((t) => !held.has(memberKey(t)))!;
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (event.kind === "chamber-organized") seen.push(event);
      return emit(event);
    };
    vacateSeat(api, leaver.seatId, "resigned");
    organize(api, CHAMBER);
    expect(seen).toHaveLength(0);
    expect(posts(api)).toEqual(before);
    for (const row of seatsBefore)
      if (!row.memberIds.includes(memberKey(leaver)))
        expect(
          committees(api).find((c) => c.committee === row.committee),
        ).toEqual(row);
  }, 180_000);

  it("a majority that changes hands through a played vacancy organizes in full, and every committee keeps its party ratio", () => {
    // Minnesota's Senate sits 34 to 33 in this world; the game's own vacancy
    // writer ends a majority member's term and the seat awaits its special
    // election, so the sides stand level and the other side leads.
    const { core, api } = setup();
    const chamber = "office:US-MN:legislature-upper";
    organize(api, chamber);
    advanceCore(core, addDays(makeIsoDate(core.date), 20));
    const side = () =>
      (
        api
          .moduleState(LEADERSHIP_MODULE_ID)
          .table("organized")
          .get(chamber) as unknown as { side: number }
      ).side;
    const before = side();
    ratioHolds(api, chamber);
    const leaver = members(api, chamber).find(
      (t) => partySide(t.party) === before,
    )!;
    vacateSeat(api, leaver.seatId, "resigned");
    organize(api, chamber);
    expect(side()).not.toBe(before);
    for (const post of posts(api, chamber))
      expect(post.since, post.post).toBe(core.date);
    ratioHolds(api, chamber);
    // The special election seats a member (of either party); the body fills
    // what is open and the ratio still holds the assigner's rule.
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    organize(api, chamber);
    ratioHolds(api, chamber);
  }, 240_000);

  it("when the sides' sizes move, a committee that no longer fits its party ratio is seated again by the assigner's rule", () => {
    // Eleven members of Minnesota's Senate minority resign through the
    // vacancy writer and their seats await special elections: the minority
    // is smaller, so its share of each committee is too.
    const { core, api } = setup();
    const chamber = "office:US-MN:legislature-upper";
    organize(api, chamber);
    advanceCore(core, addDays(makeIsoDate(core.date), 20));
    const sideBefore = (
      api
        .moduleState(LEADERSHIP_MODULE_ID)
        .table("organized")
        .get(chamber) as unknown as { side: number }
    ).side;
    const minority = members(api, chamber)
      .filter((t) => partySide(t.party) !== sideBefore)
      .slice(0, 11);
    for (const t of minority) vacateSeat(api, t.seatId, "resigned");
    organize(api, chamber);
    const after = (
      api
        .moduleState(LEADERSHIP_MODULE_ID)
        .table("organized")
        .get(chamber) as unknown as { side: number }
    ).side;
    expect(after).toBe(sideBefore);
    ratioHolds(api, chamber);
  }, 240_000);
});
