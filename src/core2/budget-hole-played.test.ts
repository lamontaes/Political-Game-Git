// @vitest-environment node
/**
 * A member weighs the hole a bill leaves in their own government's budget
 * (pool item laws-congress-repeals-federal-income-tax-year-one). A drawn
 * played world; the bills are drafted and voted by the game's own calls, and
 * no vote is cast for anyone.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { revenueGivenUp } from "./budget-stakes";
import { campaignParameter } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { budgetsOf, governmentOfJurisdiction } from "./modules/budgets";
import {
  billEnding,
  chambersOf,
  draftBill,
  FEDERAL_HOUSE,
  holdEveryChamber,
  memberKey,
  memberPosition,
  members,
} from "./modules/legislature";
import { lawChain, lawInForce } from "./modules/laws";
import { lawStanding } from "./modules/world-legislating";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "budget-hole-played");
const question = "us-policy-positions:fiscal.adopt-income-tax";

it(`a tax repeal's hole in the budget weighs on every member: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const weight = campaignParameter("budgetHoleWeight");
    const tomorrow = addDays(makeIsoDate(api.state.date), 1);
    /** The share of a government's planned revenue its income tax line carries, from its budget in force. */
    const lineShare = (jurisdiction: string) => {
      const government = governmentOfJurisdiction(api, jurisdiction)!;
      const budget = budgetsOf(api, government.id)
        .filter((b) => b.startsOn <= api.state.date)
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .at(-1)!;
      const planned = Object.values(budget.revenueMinor).reduce(
        (a, v) => a + v,
        0,
      );
      return {
        budgetId: budget.id,
        share: (budget.revenueMinor.individualIncomeTax ?? 0) / planned,
      };
    };

    // The nation: the income tax carries a large share of federal receipts.
    const federal = lineShare("US");
    expect(federal.share).toBeGreaterThan(0.2);
    expect(revenueGivenUp(api, "US", { question, direction: -1 })).toBeCloseTo(
      federal.share,
      12,
    );
    // Adopting a tax gives up nothing.
    expect(revenueGivenUp(api, "US", { question, direction: 1 })).toBe(0);
    // The agenda reads the same hole when a member weighs filing the repeal.
    expect(lawStanding(api, question, -1, "US").hole).toBeCloseTo(
      federal.share,
      12,
    );
    expect(lawStanding(api, question, 1, "US").hole).toBe(0);

    const sponsor = memberKey(members(api, FEDERAL_HOUSE)[0]!);
    const draft = (
      body: string,
      sponsorId: string,
      policyId: string,
      operation: "repeal" | "lower" | "raise",
      amount?: number,
    ) => {
      const bill = draftBill(api, {
        bodyOfficeId: body,
        sponsorId,
        provisions: [
          provisionFor({
            policyId,
            operation,
            ...(amount === undefined ? {} : { amount }),
            effectiveDate: tomorrow,
          }),
        ],
      });
      expect(bill.authority.every((a) => a.allowed)).toBe(true);
      return bill;
    };
    /** Every member of every chamber that votes on the bill, with their recorded position. */
    const positions = (bill: ReturnType<typeof draftBill>) =>
      chambersOf(api, bill).flatMap((chamber) =>
        members(api, chamber).map((m) =>
          memberPosition(api, bill.id, memberKey(m)),
        ),
      );

    const repeal = draft(
      FEDERAL_HOUSE,
      sponsor,
      `question:${question}`,
      "repeal",
    );
    const federalPositions = positions(repeal);
    expect(federalPositions.length).toBeGreaterThan(400);
    for (const p of federalPositions)
      expect(p.budget).toBeCloseTo(-weight * federal.share, 9);
    // The hole is part of what decides the vote, not a note beside it.
    const one = federalPositions[0]!;
    const without =
      one.views +
      one.constituents +
      one.sponsor +
      one.deal +
      one.lobby +
      one.consistency +
      one.bribe +
      (one.party ?? 0) +
      (one.wing ?? 0) +
      (one.ambition ?? 0) +
      (one.press ?? 0) +
      (one.reply ?? 0) +
      one.trait;
    expect(one.total).toBeCloseTo(without + one.budget!, 9);
    const wouldBackWithoutIt = federalPositions.filter(
      (p) => p.total - p.budget! > 0,
    ).length;
    const back = federalPositions.filter((p) => p.total > 0).length;

    // The rate route to the same end: to zero is the whole line, half is half of it.
    const rate = lawInForce(api, "income-tax").levels.find(
      (l) => l.level === "federal",
    )!.row!.value;
    expect(rate).toBeGreaterThan(0);
    const zero = draft(FEDERAL_HOUSE, sponsor, "law:income-tax", "lower", 0);
    expect(memberPosition(api, zero.id, sponsor).budget).toBeCloseTo(
      -weight * federal.share,
      9,
    );
    const half = draft(
      FEDERAL_HOUSE,
      sponsor,
      "law:income-tax",
      "lower",
      rate / 2,
    );
    expect(memberPosition(api, half.id, sponsor).budget).toBeCloseTo(
      (-weight * federal.share) / 2,
      9,
    );
    // A raise gives up nothing, and the record carries no such reason.
    const raise = draft(
      FEDERAL_HOUSE,
      sponsor,
      "law:income-tax",
      "raise",
      rate + 1,
    );
    expect(memberPosition(api, raise.id, sponsor).budget).toBeUndefined();

    // Congress votes on the repeal by its members' own reasons: it fails, and
    // the tax stands.
    const held = holdEveryChamber(api, repeal.id);
    expect(held.status).toBe("failed");
    expect(
      lawInForce(api, "income-tax", tomorrow).levels.find(
        (l) => l.level === "federal",
      )!.row!.value,
    ).toBe(rate);

    // The town's own state, by the same rule: a state whose budget carries an
    // income tax line weighs its share; one with none weighs nothing.
    const stateKey = lawChain(api).stateKey;
    const state = lineShare(stateKey);
    expect(
      revenueGivenUp(api, stateKey, { question, direction: -1 }),
    ).toBeCloseTo(state.share, 12);
    expect(lawStanding(api, question, -1, stateKey).hole).toBeCloseTo(
      state.share,
      12,
    );
    const seat = townSeats(api).find(
      (r) =>
        r.office.level === "state" &&
        r.office.kind.startsWith("legislature-") &&
        r.holder?.personId,
    );
    let statePositions = 0;
    if (seat && state.share > 0) {
      const stateRepeal = draft(
        seat.office.id,
        seat.holder!.personId!,
        `question:${question}`,
        "repeal",
      );
      const all = positions(stateRepeal);
      statePositions = all.length;
      expect(statePositions).toBeGreaterThan(0);
      for (const p of all)
        expect(p.budget).toBeCloseTo(-weight * state.share, 9);
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        federalBudget: federal.budgetId,
        federalShare: federal.share,
        hole: -weight * federal.share,
        repealBill: repeal.id,
        ending: billEnding(api, repeal.id),
        membersBacking: back,
        membersBackingWithoutTheHole: wouldBackWithoutIt,
        members: federalPositions.length,
        state: stateKey,
        stateBudget: state.budgetId,
        stateShare: state.share,
        statePositions,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 240_000);
