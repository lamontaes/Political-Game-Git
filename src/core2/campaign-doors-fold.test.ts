/**
 * A closed race's door rows go once its election day has passed (governing
 * lead, Oct 30), in a played world (a random place and seed each run, named so
 * a failure can be replayed): the campaign rows keep their door counts, and
 * an open race's rows stay.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.DOORS_FOLD_SEED ?? randomBytes(8).toString("hex");

describe(`campaign doors fold (seed ${seed})`, () => {
  it("a closed race's door rows go, and its campaigns keep their door counts", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core,
      api = coreAPI(core);
    const contests = new Map(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as { id: string; electionDate: string }[]
      ).map((c) => [c.id, c.electionDate]),
    );
    const first = [...contests.values()]
      .filter((d) => d > core.date)
      .sort()[0]!;
    advanceCore(core, addDays(makeIsoDate(first), -1));
    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const contestOf = (campaignId: string) =>
      (filings.get(campaignId) as unknown as { contestId: string } | undefined)
        ?.contestId ?? "";
    const doors = api.moduleState(CAMPAIGNS_MODULE_ID).table("doors");
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID).table("campaigns");
    const knocked = (campaignId: string) =>
      (
        campaigns.get(campaignId) as unknown as
          { doorsKnockedCount?: number } | undefined
      )?.doorsKnockedCount;
    const closing = (
      doors.rows() as unknown as { id: string; campaignId: string }[]
    ).filter((row) => contests.get(contestOf(row.campaignId)) === first);
    const counts = new Map(
      closing.map((row) => [row.campaignId, knocked(row.campaignId)]),
    );
    console.log(
      `${world.place.displayName}: ${closing.length} door rows in races on ${first}`,
    );
    expect(closing.length).toBeGreaterThan(0);

    advanceCore(core, addDays(makeIsoDate(first), 7));

    const contestRows = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
    const electionOf = (campaignId: string) =>
      (
        contestRows.get(contestOf(campaignId)) as unknown as
          { electionDate: string } | undefined
      )?.electionDate;
    const left = doors.rows() as unknown as {
      id: string;
      campaignId: string;
    }[];
    expect(
      left.filter((row) => {
        const day = electionOf(row.campaignId);
        return day !== undefined && day < core.date;
      }),
    ).toEqual([]);
    expect(left.some((row) => closing.some((c) => c.id === row.id))).toBe(
      false,
    );
    for (const [campaignId, count] of counts)
      expect(knocked(campaignId)).toBe(count);
  });
});
