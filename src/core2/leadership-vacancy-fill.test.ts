/**
 * A seat that changes hands in the middle of a term fills only what its
 * holder held: the posts they led and the committee seats they had. Every
 * other post and seat stands as it was (same holder, same day), the paper
 * gets the one post that changed hands, and a body whose majority changed
 * hands organizes in full. Every test runs in the one world drawn at Vilas,
 * South Dakota (place 4667340, seed c200623d…): the player's state's House,
 * the chamber whose presiding officer dies first in the played years and the
 * state chamber with the narrowest majority (found by looking, since party
 * control and deaths come from the world's own history). Tests marked "(vacancy writer)" end a term with the
 * offices engine's own `vacateSeat`, not a played event. Each test's limit is
 * near twice its slower measured time (alone and beside the file's other
 * tests, Nov 15): about 14 and 19 s, 11 and 15 s, 32 and 36 s, 15 and 18 s, 35
 * and 38 s.
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
import { OFFICES_MODULE_ID, vacateSeat } from "./modules/offices";
import {
  LEADERSHIP_MODULE_ID,
  organize,
  type CommitteeRow,
  type PostRow,
} from "./modules/leadership";
import { wordPrintedStory } from "../bench/archive-words";
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
  // Tests named "(vacancy writer)" end a term with the offices engine's own
  // writer, `vacateSeat`, which the game calls for a death, a move away, an
  // incompatible office, a recall, a conviction; nobody here chose to resign.

  it("(vacancy writer) the leaver's post and seats are filled; everything else stands, and the paper hears of the one post", () => {
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
      ["level", "mid-term", presiding.post].sort(),
    );
  }, 40_000);

  it("(vacancy writer) a vacancy of a member who held no post prints nothing and changes no post", () => {
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
  }, 30_000);

  it("(vacancy writer) a majority that changes hands organizes in full, and every committee keeps its party ratio", () => {
    // The world's own closest chamber (party control comes from the century
    // the world simulated, so no count is pinned): the game's own vacancy
    // writer ends majority members' terms one at a time, their seats await
    // special elections, and when the sides stand level the other side leads.
    const { core, api } = setup();
    const kinds = new Set(["legislature-upper", "legislature-lower"]);
    const margins = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    )
      .filter((o) => kinds.has(o.kind))
      .map((o) => {
        const all = members(api, o.id);
        const sides = new Map<number, number>();
        for (const t of all) {
          const side = partySide(t.party);
          sides.set(side, (sides.get(side) ?? 0) + 1);
        }
        const counts = [...sides.values()].sort((x, y) => y - x);
        return {
          id: o.id,
          margin: (counts[0] ?? 0) - (counts[1] ?? 0),
          n: counts.length,
        };
      })
      .filter((c) => c.n >= 2 && c.margin > 0)
      .sort((x, y) => x.margin - y.margin || x.id.localeCompare(y.id));
    expect(margins.length, "chambers with two sides").toBeGreaterThan(0);
    const { id: chamber, margin } = margins[0]!;
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
    const leavers = members(api, chamber).filter(
      (t) => partySide(t.party) === before,
    );
    let vacated = 0;
    while (side() === before && vacated < leavers.length) {
      vacateSeat(api, leavers[vacated]!.seatId, "resigned");
      vacated += 1;
      organize(api, chamber);
    }
    // Level sides give the other side the lead: no more resignations than
    // the majority's margin, and one more at most if a tie keeps the order.
    expect(side(), `${chamber}: margin ${margin}, ${vacated} vacated`).not.toBe(
      before,
    );
    expect(vacated, chamber).toBeLessThanOrEqual(margin + 1);
    for (const post of posts(api, chamber))
      expect(post.since, post.post).toBe(core.date);
    ratioHolds(api, chamber);
    // The special election seats a member (of either party); the body fills
    // what is open and the ratio still holds the assigner's rule.
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    organize(api, chamber);
    ratioHolds(api, chamber);
    process.stdout.write(
      `majority change: ${chamber}, margin ${margin}, ${vacated} seats vacated\n`,
    );
  }, 180_000);

  it("(unit check of the ratio rule, eleven resignations at once) a committee that no longer fits its party ratio is seated again by the assigner's rule", () => {
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
  }, 40_000);

  it("(played) a chamber loses its presiding officer to a death in the played years and fills the post, nothing else", () => {
    // No one chose the death: the health engine brings it and the offices
    // engine's own death rule vacates the seat. The world's party counts and
    // deaths come from its own simulated history, so the test organizes every
    // state chamber, plays on (up to four years, a fortnight at a time) until
    // some chamber's speaker or presiding officer has died, and names the
    // chamber it found.
    const { core, api } = setup();
    const kinds = new Set(["legislature-upper", "legislature-lower"]);
    const chambers = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    )
      .filter((o) => kinds.has(o.kind))
      .map((o) => o.id)
      .sort();
    const startPosts = new Map<string, PostRow[]>();
    const startSeats = new Map<string, CommitteeRow[]>();
    for (const chamber of chambers) {
      organize(api, chamber);
      startPosts.set(chamber, posts(api, chamber));
      startSeats.set(chamber, committees(api, chamber));
    }
    const presiding = (chamber: string) => {
      const all = startPosts.get(chamber)!;
      return all.find((p) => p.post === "speaker") ?? all[0];
    };
    const died = (chamber: string) => {
      const holder = presiding(chamber)?.holderId;
      return (
        !!holder && !members(api, chamber).some((t) => memberKey(t) === holder)
      );
    };
    let lost: string | undefined;
    const end = addDays(makeIsoDate(core.date), 4 * 365);
    while (!lost && core.date < end) {
      advanceCore(core, addDays(makeIsoDate(core.date), 14));
      lost = chambers.find(died);
    }
    expect(
      lost,
      `a presiding officer died within four years among ${chambers.length} chambers (${core.date})`,
    ).toBeDefined();
    process.stdout.write(`played death: ${lost} by ${core.date}\n`);
    const before = startPosts.get(lost!)!;
    const seatsBefore = startSeats.get(lost!)!;
    const speaker = presiding(lost!)!;
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (event.kind === "chamber-organized") seen.push(event);
      return emit(event);
    };
    organize(api, lost!);
    const sitting = new Set(members(api, lost!).map(memberKey));
    expect(sitting.has(speaker.holderId!), "the speaker died").toBe(false);
    const after = posts(api, lost!);
    const now = after.find((p) => p.post === "speaker")!;
    expect(sitting.has(now.holderId!)).toBe(true);
    // The posts whose holders live stand as they were.
    for (const post of before.filter(
      (p) => p.post !== "speaker" && sitting.has(p.holderId!),
    ))
      expect(
        after.find((p) => p.post === post.post),
        post.post,
      ).toEqual(post);
    // The paper hears of the posts that changed hands only.
    const changed = after.filter(
      (p) =>
        !before.some((b) => b.post === p.post && b.holderId === p.holderId),
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(Object.keys(seen.at(-1)!.facts ?? {}).sort()).toEqual(
      ["level", "mid-term", ...changed.map((p) => p.post)].sort(),
    );
    for (const row of seatsBefore)
      if (row.memberIds.every((id) => sitting.has(id)))
        expect(
          committees(api, lost!).find((c) => c.committee === row.committee),
        ).toEqual(row);
    // The paper words a refill as a post filled, never as a body that
    // organized (Words lead, Nov 15): across sixty outlets' draws, none.
    const event = seen.at(-1)!;
    let printed = 0;
    for (let i = 0; i < 60; i++) {
      const worded = wordPrintedStory(core, {
        id: `printed:outlet:probe:${i}:${event.id}`,
        kind: "press.printed",
        date: event.date,
        facts: { sourceRecordId: event.id },
      } as never);
      if (!worded) continue;
      printed++;
      expect(`${worded.headline} ${worded.lede}`).not.toMatch(
        /organized and chose/,
      );
    }
    expect(printed).toBeGreaterThan(0);
  }, 900_000);
});
