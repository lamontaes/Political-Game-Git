/**
 * Committee markup trades in the world the owner plays: a committee's members
 * trade support for sections of their own before the bill reports, and the
 * trade is the bill's record with both sides' reasons. A later floor vote
 * reads the trade as the member's deal. A place and seed nobody chose; two
 * years of the played world, because a markup trade needs a sponsor short of
 * a committee majority and not every town has one in a year.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  votesOn,
} from "./modules/legislature";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
type Deal = BillRow["deals"][number];

/** Play two years in a drawn place; return the first world with a committee trade. */
function playUntilMarkupTrade() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "committee-markup");
    // Named before the build, written straight to stdout so a world that
    // fails to build (or a worker that dies building it) still names its place.
    process.stdout.write(
      `legislature-committees: ${place.name} (${place.key}), GOLDEN_PATH_SEED=${base} attempt ${attempt}\n`,
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 730));
    const api = coreAPI(world.core);
    const bills = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[];
    const trades = bills.flatMap((bill) =>
      bill.deals
        .filter((d) => d.stage === "committee" && d.kind === "trade-amendment")
        .map((deal) => ({ bill, deal })),
    );
    tried.push(`${place.name} (${place.key}), seed ${seed}`);
    if (trades.length) return { api, trades, bills, where: tried.join("; ") };
  }
  return { api: null, trades: [], bills: [], where: tried.join("; ") };
}

describe("committee markup trades", () => {
  const played = playUntilMarkupTrade();

  it("makes a trade in committee, with both sides' reasons and the section on the bill", () => {
    expect(played.trades.length, played.where).toBeGreaterThan(0);
    for (const { bill, deal } of played.trades) {
      const why = `${played.where}: ${bill.id} with ${deal.memberId}`;
      // The member was a holdout and the section won them over.
      expect(deal.reasons!.member.before, why).toBeLessThanOrEqual(0);
      expect(deal.reasons!.member.after, why).toBeGreaterThan(0);
      // The sponsor gave it only while still backing the bill with it.
      expect(deal.reasons!.sponsor.after, why).toBeGreaterThan(0);
      expect(deal.reasons!.support.after, why).toBeGreaterThan(
        deal.reasons!.support.before,
      );
      // The section is the bill's for good, and the deal names it.
      const question = deal.terms.split(" ")[1]!;
      expect(
        bill.provisions.some((p) => p.question === question),
        why,
      ).toBe(true);
    }
  });

  it("refuses a trade that would leave the sponsor against their own bill", () => {
    // Every accepted deal on every bill kept the sponsor for it; a deal that
    // would not have is never in the record as accepted.
    for (const bill of played.bills)
      for (const deal of bill.deals as readonly Deal[])
        if (deal.kind === "trade-amendment" && deal.reasons)
          expect(
            deal.reasons.sponsor.after,
            `${played.where}: ${bill.id}`,
          ).toBeGreaterThan(0);
  });

  it("is cited by the floor vote, which the member casts yes", () => {
    expect(played.api, played.where).not.toBeNull();
    let honored = 0;
    for (const { bill, deal } of played.trades) {
      const vote = votesOn(played.api!, bill.id).find(
        (row) => row.memberId === deal.memberId,
      );
      if (!vote) continue;
      // The vote cites the trade, and the member votes for the bill that has
      // their section, unless a poison pill adopted after the trade broke it
      // (as world-legislating.test.ts allows).
      const why = `${played.where}: ${bill.id} with ${deal.memberId}`;
      expect(
        vote.traded?.map((t) => t.terms),
        why,
      ).toContain(deal.terms);
      const pilled = bill.deals.some((d) => d.kind === "poison-pill");
      expect(pilled ? ["yes", "no"] : ["yes"], why).toContain(vote.vote);
      if (vote.vote === "yes") honored += 1;
    }
    expect(honored, played.where).toBeGreaterThan(0);
  });
}, 3_600_000);
