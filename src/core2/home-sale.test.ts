import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { sellHome } from "./housing-sale";
import type { MortgageRow } from "./housing-foreclosure";
import { drawPlace } from "../../scripts/core2-year/place";

// A mortgaged owner household that leaves sells its home (replaces
// SG-P15-moves-owners-stay): in the played world, in a place drawn from all
// 56, the outside buyer pays the lender off first, the surplus reaches the
// household, the mortgage ends, and every dollar stays on someone's books.
const seed = process.env.HOME_SALE_SEED ?? randomBytes(8).toString("hex");

it("sells a mortgaged home: payoff first, surplus to the household, mortgage ended", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(attempt ? `${seed}:${attempt}` : seed, "home-sale");
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The housing engine records each home at its first monthly review.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const owners = (core.households.size ? [...core.households.keys()] : [])
      .sort()
      .filter(
        (id) =>
          (
            housing.table("dwellings").get(`dwelling:${id}`) as
              { tenure?: string } | undefined
          )?.tenure === "own",
      );
    const owed = (id: string) =>
      (housing.table("mortgages").rows() as unknown as MortgageRow[]).filter(
        (row) =>
          row.householdId === id &&
          row.balanceMinor > 0 &&
          core.finance.contracts.has(row.id),
      );
    // A mortgaged owner when the world has one, else an owner with a free home.
    const householdId = owners.find((id) => owed(id).length) ?? owners[0];
    if (!householdId) {
      tried.push(`${where}: no full-tier owner household`);
      continue;
    }
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
    const sale = sellHome(api, householdId, "test.departure");
    expect(sale, where).toBeTruthy();
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
    return;
  }
  throw new Error(
    `no drawn place had a full-tier owner household: ${tried.join("; ")}`,
  );
}, 900_000);
