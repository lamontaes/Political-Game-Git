/**
 * Chamber leadership and committee assignments, in a random place: the
 * state's chambers elect their presiding officers and party leaders by each
 * member's own vote, the assigning authority seats committees by the party
 * ratio, a committee's chair comes from the majority, and the legislature's
 * committee stage uses those seats. The player can stand for a post and casts
 * their own vote.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  FEDERAL_HOUSE,
  memberKey,
  members,
  openLegislature,
} from "./modules/legislature";
import {
  committeeRoster,
  COMMITTEES,
  leaderOf,
  openLeadership,
  organize,
  presidingOfficer,
  standForPost,
  voteForPost,
} from "./modules/leadership";
import { partySide } from "./appointments";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`leadership:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();

function world(attempt = 0) {
  const state = pick(states, attempt ? `state:${attempt}` : "state");
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const key = pick(places, attempt ? `place:${attempt}` : "place").key;
  const where = `seed ${seed}, ${state} place ${key}`;
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 200,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openRecord(core);
  openLegislature(core);
  openLeadership(core);
  const api = coreAPI(core);
  return { state, where, core, api };
}

/** The post is the largest caucus's, or a coalition's holding a majority of the body. */
function expectHeldByMajority(
  api: ReturnType<typeof coreAPI>,
  chamber: string,
  where: string,
): void {
  const all = members(api, chamber);
  const sideCount = new Map<number, number>();
  for (const t of all)
    sideCount.set(
      partySide(t.party),
      (sideCount.get(partySide(t.party)) ?? 0) + 1,
    );
  const majoritySide = [...sideCount.entries()].sort(
    (a, b) => b[1] - a[1] || a[0] - b[0],
  )[0]![0];
  const byKey = new Map(all.map((t) => [memberKey(t), t]));
  const presiding = presidingOfficer(api, chamber);
  expect(presiding, `${where} ${chamber}`).not.toBeNull();
  const post = organize(api, chamber).find((p) => p.holderId === presiding)!;
  if (post.heldBy === "coalition")
    expect(
      (post.votes[presiding!] ?? 0) * 2,
      `${where} ${chamber}`,
    ).toBeGreaterThan(all.length);
  else
    expect(partySide(byKey.get(presiding!)!.party), `${where} ${chamber}`).toBe(
      majoritySide,
    );
}

describe("chamber leadership and committees", () => {
  it("chambers elect their leaders by members' own votes and seat committees by the party ratio", () => {
    const { state, where, core, api } = world();
    const chambers = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .query("byJurisdiction", [state]) as unknown as {
        id: string;
        kind: string;
      }[]
    )
      .filter((o) => o.kind.startsWith("legislature-"))
      .map((o) => o.id)
      .sort();
    expect(chambers.length, where).toBeGreaterThan(0);
    const report: Record<string, unknown> = {};
    for (const chamber of [...chambers, FEDERAL_HOUSE]) {
      const all = members(api, chamber);
      const posts = organize(api, chamber);
      expect(posts.length, `${where} ${chamber}`).toBeGreaterThan(0);
      const sideCount = new Map<number, number>();
      for (const t of all)
        sideCount.set(
          partySide(t.party),
          (sideCount.get(partySide(t.party)) ?? 0) + 1,
        );
      const majoritySide = [...sideCount.entries()].sort(
        (a, b) => b[1] - a[1] || a[0] - b[0],
      )[0]![0];
      const byKey = new Map(all.map((t) => [memberKey(t), t]));
      // The presiding officer is a member, from the majority (party votes hold).
      expectHeldByMajority(api, chamber, where);
      // Leaders come from their own caucus.
      const majorityLeader = leaderOf(api, chamber, "majority-leader");
      if (majorityLeader)
        expect(partySide(byKey.get(majorityLeader)!.party)).toBe(majoritySide);
      const minorityLeader = leaderOf(api, chamber, "minority-leader");
      if (minorityLeader)
        expect(partySide(byKey.get(minorityLeader)!.party)).not.toBe(
          majoritySide,
        );
      // Each post has its own holder.
      const held = posts.map((p) => p.holderId).filter((id) => id !== null);
      expect(new Set(held).size, `${where} ${chamber}`).toBe(held.length);
      // Committees: the majority holds a majority of seats, the chair is theirs.
      for (const committee of COMMITTEES) {
        const roster = committeeRoster(api, chamber, committee);
        if (!roster) continue;
        const sides = roster.memberIds.map((id) =>
          partySide(byKey.get(id)!.party),
        );
        expect(
          sides.filter((s) => s === majoritySide).length * 2,
          `${where} ${chamber} ${committee}`,
        ).toBeGreaterThan(roster.memberIds.length);
        expect(roster.memberIds).toContain(roster.chairId);
        expect(partySide(byKey.get(roster.chairId)!.party)).toBe(majoritySide);
      }
      report[chamber] = {
        members: all.length,
        posts: posts.map(
          (p) =>
            `${p.post}: ${p.holderId} (${Object.values(p.votes).reduce((a, b) => a + b, 0)} votes)`,
        ),
        committees: COMMITTEES.map(
          (c) => committeeRoster(api, chamber, c)?.memberIds.length ?? 0,
        ),
      };
    }
    // The player, a member of the town's own chamber, stands for its top post
    // and votes for themselves; their own vote is counted, never imputed.
    const own = chambers.find((c) =>
      members(api, c).some((t) => t.personId === null),
    );
    if (own) {
      const term = members(api, own)[0]!;
      const id = memberKey(term);
      core.playerId = id;
      const post = organize(api, own)[0]!.post;
      standForPost(api, { chamber: own, post, personId: id });
      voteForPost(api, { chamber: own, post, voterId: id, candidateId: id });
      const after = organize(api, own).find((p) => p.post === post)!;
      expect((after.votes[id] ?? 0) >= 1, where).toBe(true);
    }
    govReport("leadership", JSON.stringify({ where, report }));
  }, 300_000);

  it("a chamber split one seat apart, with a member outside both caucuses, keeps the larger caucus's presiding officer", () => {
    // The shape that put a minority speaker in the chair: one caucus a seat
    // larger, a seat held outside both (a vacancy the roster left without a
    // party), and the smaller caucus longer serving, so a tie broken by
    // service went its way. A tie is not a majority; the larger caucus keeps
    // the chair unless a coalition holds a majority of the whole body.
    // A nonpartisan chamber elects its chair without caucuses, so places are
    // drawn until one has a chamber with partisan members.
    const tried: string[] = [];
    let found: { world: ReturnType<typeof world>; chamber: string } | undefined;
    for (let attempt = 0; attempt < 6 && !found; attempt += 1) {
      const drawn = world(attempt);
      const chamber = (
        drawn.api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .query("byJurisdiction", [drawn.state]) as unknown as {
          id: string;
          kind: string;
        }[]
      )
        .filter((o) => o.kind.startsWith("legislature-"))
        .map((o) => o.id)
        .sort()
        .find((c) =>
          members(drawn.api, c).some((t) => partySide(t.party) !== 0),
        );
      if (chamber) found = { world: drawn, chamber };
      else tried.push(drawn.where);
    }
    if (!found)
      throw new Error(
        `no drawn place had a partisan chamber: ${tried.join("; ")}`,
      );
    const { api, where } = found.world;
    const { chamber } = found;
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const all = members(api, chamber);
    const half = Math.floor((all.length - 2) / 2);
    all.forEach((t, i) =>
      terms.put({
        ...t,
        party: i <= half ? "Democratic" : i <= 2 * half ? "Republican" : null,
        serviceStart: i <= half ? t.startDate : "2000-01-07",
      } as never),
    );
    expectHeldByMajority(api, chamber, `${where} (split)`);
  }, 300_000);
});
