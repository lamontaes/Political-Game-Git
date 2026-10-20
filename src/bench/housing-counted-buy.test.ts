import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  countedHousingInArrears,
  countedPayment,
} from "../core2/counted-money";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { residentsRuntime } from "../core2/modules/residents";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { buildBenchWorld } from "./world";

// A counted renter household buys a home through its group's accounts: its
// rent flow ends and its mortgage becomes a part of the place's counted
// mortgage flow. In a year of the bench world nobody counted can afford a
// down payment (their group holds a few thousand dollars against tens of
// thousands), the same as full renters, so the buyer here is a working
// renter household whose group is paid the down payment by the town bank
// (money moves, none is made).
const seed = process.env.COUNTED_BUY_SEED ?? randomBytes(8).toString("hex");

describe(`counted renters buy homes (seed ${seed})`, () => {
  it("ends a bought household's rent, starts its mortgage part and records the sale", () => {
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core as CoreState;
    // The housing review runs on the sixth; a group does not keep a large balance, so fund it the day before.
    const day = Number(core.date.slice(8));
    const month = Number(core.date.slice(5, 7)) + (day >= 5 ? 1 : 0);
    const year = Number(core.date.slice(0, 4)) + (month > 12 ? 1 : 0);
    advanceCore(
      core,
      makeIsoDate(
        `${year}-${String(((month - 1) % 12) + 1).padStart(2, "0")}-05`,
      ),
    );
    const api = coreAPI(core);
    // At the calibrated weights nobody, full or counted, picks buying in a
    // year (the payment on the home its income buys exceeds its rent), so the
    // test moves the baseline above renting to read what a buy does.
    const parameters = core.data.parameters as Record<
      string,
      { value: number }
    >;
    parameters.housingBuyBaseline = {
      ...parameters.housingBuyBaseline!,
      value: 30,
    };
    const rt = residentsRuntime(core)!;
    const weighted = (group: number) => {
      let n = 0;
      for (const i of rt.store.groups[group]!.households)
        n += rt.store.weightOf(rt.store.households[i]!);
      return n;
    };
    // Working counted renters whose rent flow is live, from the smallest
    // groups (the money given reaches each of their households most), one per group.
    const seen = new Set<number>();
    const renters = [...rt.store.liveHouseholds()]
      .filter(
        (h) =>
          h.tenure === "rent" &&
          rt.flows.get(`rent:${h.id}`) &&
          !countedHousingInArrears(core, h.id) &&
          h.jobs.some((job) => rt.jobs.get(job.id)?.endsAt === undefined),
      )
      .sort(
        (a, b) =>
          weighted(a.group) - weighted(b.group) || a.id.localeCompare(b.id),
      )
      .filter((h) => !seen.has(h.group) && seen.add(h.group))
      .slice(0, 6);
    // A town with no working counted renter has nothing to buy a home.
    if (!renters.length) return;
    const payers = [...core.organizations.values()]
      .filter(
        (row) => row.placeId === renters[0]!.placeId && row.kind === "employer",
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor);
    // Each group is paid enough that every household it stands for can put
    // down 10 percent, by employers in town with cash to give: the money
    // moves, none is made.
    let gift = 0;
    for (const renter of renters) {
      const wanted = weighted(renter.group) * 100_000_000;
      let given = 0;
      for (const payer of payers) {
        if (given >= wanted) break;
        given += countedPayment(api, {
          id: `test-gift:${renter.id}:${payer.id}`,
          placeId: renter.placeId,
          householdId: renter.id,
          otherOwnerId: payer.id,
          amountMinor: -Math.min(payer.liquidMinor, wanted - given),
          reasonKey: "test.down-payment",
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation: "A test fixture, not a model value.",
            estimatedFrom:
              "The test funds the group so the buy rule can be read.",
          },
        });
      }
      gift += given;
    }
    // A town whose employers hold too little cash to fund a down payment
    // has no buyer to read.
    if (gift < renters.length * 100_000_000) return;
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const bought = (
      api
        .moduleState(HOUSING_MODULE_ID)
        .table("purchases")
        .rows() as unknown as {
        householdId: string;
        households?: number;
        loanMinor: number;
      }[]
    ).filter((row) => row.households !== undefined);
    expect(
      bought.length,
      `at least one counted household bought (${renters.length} funded renters, ${gift} given)`,
    ).toBeGreaterThan(0);
    for (const row of bought.filter((r) => r.loanMinor > 10_000)) {
      expect(rt.flows.get(`rent:${row.householdId}`)?.endedAt).toBeDefined();
      const part = [...rt.flows.values()].find(
        (flow) => flow.amountByContract?.[`mortgage:${row.householdId}`],
      );
      expect(part, row.householdId).toBeDefined();
    }
  }, 300_000);
});
