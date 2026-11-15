import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { sellHome } from "./housing-sale";
import { buyListedHome } from "./housing-sale-buyer-fixture";
import { townOutsideOf } from "./opening-outside-market";
import type { MortgageRow } from "./housing-foreclosure";

// A mortgaged owner household that leaves sells its home (replaces
// SG-P15-moves-owners-stay): in the played world, in a place drawn from all
// 56, the home goes on the market and stays the household's; when a buyer
// takes it and pays the household, the lender is paid off first from that
// money, the surplus stays with the household, the mortgage ends, and every
// dollar stays on someone's books.
//
// Pinned (tests-housing-sale-tests-draw-from-the-clock): Eatonville,
// Washington, a named world seed and a mortgaged household in the played
// town. The old test drew up to eight places from randomBytes and took the
// first mortgaged owner by id, on the premise that any draw has one; this
// household is one, 40 days in.
const EATONVILLE = {
  key: "5320260",
  seed: "c5c7e8f40065cbdf2ed208fe2fee572fdead7337ab75f60a289b7195204b080e",
  householdId: "household_1bf3b277851bf8b8",
};

it("sells a mortgaged home: payoff first, surplus to the household, mortgage ended", () => {
  {
    const place = EATONVILLE;
    const where = `Eatonville, Washington (${place.key}), world seed ${place.seed}, ${place.householdId}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The housing engine records each home at its first monthly review.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const owed = (id: string) =>
      (housing.table("mortgages").rows() as unknown as MortgageRow[]).filter(
        (row) =>
          row.householdId === id &&
          row.balanceMinor > 0 &&
          core.finance.contracts.has(row.id),
      );
    const householdId = place.householdId;
    expect(
      (
        housing.table("dwellings").get(`dwelling:${householdId}`) as
          { tenure?: string } | undefined
      )?.tenure,
      `${where}: an owner`,
    ).toBe("own");
    expect(owed(householdId).length, `${where}: a mortgage`).toBeGreaterThan(0);
    const loans = owed(householdId);
    const mortgage = loans[0];
    const books = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (sum, row) => sum + row.liquidMinor,
        0,
      );
    const lender = mortgage
      ? core.organizations.get(mortgage.holderId)
      : undefined;
    const before = { books: books(), lender: lender?.liquidMinor ?? 0 };
    const listed = sellHome(api, householdId, "test.departure");
    expect(listed, where).toBeTruthy();
    // On the market, still the household's: nothing is paid until a buyer takes it.
    expect(listed!.status, where).toBe("listed");
    expect(books(), where).toBe(before.books);
    expect(
      (
        housing.table("dwellings").get(`dwelling:${householdId}`) as {
          tenure: string;
        }
      ).tenure,
      where,
    ).toBe("listed");
    // A buyer from outside the town takes it and pays the household.
    const buyer = townOutsideOf(
      core.organizations.values(),
      core.households.get(householdId)!.placeId,
    )!.id;
    const sale = buyListedHome(api, listed!.id, buyer);
    expect(sale.status, where).toBe("sold");
    const payoff = loans.reduce((n, row) => n + row.balanceMinor, 0);
    expect(sale!.owedMinor, where).toBe(payoff);
    // The lender is paid off from the price first, up to what it was owed.
    expect(sale!.toLenderMinor, where).toBe(Math.min(sale!.priceMinor, payoff));
    if (lender)
      expect(lender.liquidMinor - before.lender, where).toBe(
        sale!.toLenderMinor,
      );
    expect(sale!.surplusMinor, where).toBe(
      Math.max(0, sale!.priceMinor - payoff),
    );
    for (const loan of loans) {
      expect(core.finance.contracts.get(loan.id)!.endedAt, where).toBeTruthy();
      expect(
        (housing.table("mortgages").get(loan.id) as unknown as MortgageRow)
          .balanceMinor,
        where,
      ).toBe(0);
    }
    expect(
      (
        housing.table("dwellings").get(`dwelling:${householdId}`) as {
          tenure: string;
        }
      ).tenure,
      where,
    ).toBe("sold");
    expect(housing.table("sales").get(sale!.id), where).toBeTruthy();
    // The outside buyer's payment is the only new money on the town's books:
    // exactly the lender's payoff and the household's surplus, the price.
    expect(books() - before.books, where).toBe(
      sale!.toLenderMinor + sale!.surplusMinor,
    );
    // Selling twice finds no home to sell.
    expect(sellHome(api, householdId, "test.departure"), where).toBe(undefined);
  }
  // About 59 s measured: building Eatonville and its 40 days.
}, 120_000);
