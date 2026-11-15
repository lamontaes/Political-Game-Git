/**
 * A seat that changes hands in the middle of a term fills only what its
 * holder held: the posts they led and the committee seats they had. Every
 * other post and seat stands as it was (same holder, same day), the paper
 * gets the one post that changed hands, and a body whose majority changed
 * hands organizes in full. Pinned at Vilas, South Dakota (place 4667340),
 * the player's state's lower house.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
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
const posts = (api: ReturnType<typeof coreAPI>) =>
  [
    ...(api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .query("byChamber", [CHAMBER]) as unknown as PostRow[]),
  ].sort((a, b) => a.post.localeCompare(b.post));
const committees = (api: ReturnType<typeof coreAPI>) =>
  [
    ...(api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("committees")
      .query("byChamber", [CHAMBER]) as unknown as CommitteeRow[]),
  ].sort((a, b) => a.committee.localeCompare(b.committee));

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

  it("a body whose majority changed hands organizes in full", () => {
    const { api } = setup();
    organize(api, CHAMBER);
    const before = posts(api);
    // The last organizing remembered the other side in the majority.
    const table = api.moduleState(LEADERSHIP_MODULE_ID).table("organized");
    const row = table.get(CHAMBER) as unknown as {
      id: string;
      signature: string;
      side: number;
    };
    table.put({ ...row, side: -row.side || 1, signature: "" } as never);
    organize(api, CHAMBER);
    const after = posts(api);
    expect(after.map((p) => p.holderId)).toEqual(before.map((p) => p.holderId));
    expect(after.every((p) => p.since !== before[0]!.since)).toBe(true);
  }, 180_000);
});
