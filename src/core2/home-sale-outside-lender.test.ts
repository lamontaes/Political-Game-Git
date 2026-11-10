import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { sellHome } from "./housing-sale";
import { townOutsideOf } from "./opening-outside-market";
import type { MortgageRow } from "./housing-foreclosure";
import type { ModuleRow } from "./module-data";
import { drawPlace } from "../../scripts/core2-year/place";

// The outside market stands for a home's buyer. When the same outside market
// also holds the home's mortgage, the sale pays the lender off without moving
// cash from the market to itself (it once stopped a played year with "A
// transfer needs two different accounts", Boiling Spring Lakes, North
// Carolina), and the mortgage still ends.
const seed = process.env.HOME_SALE_SEED ?? randomBytes(8).toString("hex");

it("sells a home whose mortgage the outside market holds: the loan ends and no cash moves to itself", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "home-sale-outside-lender");
    const where = `seed ${seed}, ${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const loans = (
      housing.table("mortgages").rows() as unknown as MortgageRow[]
    ).filter(
      (row) =>
        row.balanceMinor > 0 &&
        core.finance.contracts.has(row.id) &&
        core.households.has(row.householdId),
    );
    const loan = loans[0];
    if (!loan) {
      tried.push(`${where}: no mortgaged household`);
      continue;
    }
    const household = core.households.get(loan.householdId)!;
    // The town's outside market, found the way housing finds the holder of an
    // outside loan and the sale finds its buyer. The first outside account by
    // id was not it where a place also has an out-of-town employer (Plainview,
    // Arkansas): the loan went to the employer, and the payoff tried to move
    // cash between two outside accounts.
    const buyer = townOutsideOf(core.organizations.values(), household.placeId);
    if (!buyer) {
      tried.push(`${where}: no outside market`);
      continue;
    }
    // The outside market holds this home's loan.
    housing
      .table("mortgages")
      .put({ ...loan, holderId: buyer.id } as unknown as ModuleRow);
    const payee = (
      housing.table("mortgages").get(loan.id) as unknown as MortgageRow
    ).holderId;
    expect(payee, where).toBe(buyer.id);
    const payerAccount = api.accounts().main(buyer.id);
    const payeeAccount = api.accounts().main(payee);
    expect(payeeAccount, where).toBe(payerAccount);
    const first = household.memberIds.find((id) => core.people.get(id)?.alive);
    const before = core.people.get(first!)?.liquidMinor ?? 0;
    const sale = sellHome(api, loan.householdId, "test.departure");
    expect(sale, where).toBeTruthy();
    expect(sale!.owedMinor, where).toBeGreaterThanOrEqual(loan.balanceMinor);
    expect(core.finance.contracts.get(loan.id)!.endedAt, where).toBeTruthy();
    expect(
      (housing.table("mortgages").get(loan.id) as unknown as MortgageRow)
        .balanceMinor,
      where,
    ).toBe(0);
    // The surplus reached the household's first living member.
    expect(core.people.get(first!)!.liquidMinor - before, where).toBe(
      sale!.surplusMinor,
    );
    expect(sale!.priceMinor, where).toBe(
      sale!.toLenderMinor + sale!.surplusMinor,
    );
    process.stdout.write(
      `HOME-SALE ${where}: ${sale!.id}; mortgage ${loan.id}; payer ${buyer.id} (account ${payerAccount}); payee ${payee} (account ${payeeAccount}); borrower ${first}; price ${sale!.priceMinor}, to lender ${sale!.toLenderMinor}, surplus ${sale!.surplusMinor}, loan balance 0\n`,
    );
    return;
  }
  throw new Error(`no mortgaged household in 8 places: ${tried.join("; ")}`);
}, 900_000);

// A lender outside the books that is not the buyer: a household that moved
// within the county keeps its lender while its new place has its own outside
// market. It stopped a twenty-year game in its thirteenth year (South Fork,
// Missouri, Nov 10, 2026: an estate's home sale threw "Money cannot move
// between two outside accounts").
it("sells a home whose mortgage another outside account holds: the loan ends and nothing throws", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "home-sale-other-outside");
    const where = `seed ${seed}, ${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const housing = api.moduleState("housing");
    const loan = (
      housing.table("mortgages").rows() as unknown as MortgageRow[]
    ).find(
      (row) =>
        row.balanceMinor > 0 &&
        core.finance.contracts.has(row.id) &&
        core.households.has(row.householdId),
    );
    if (!loan) {
      tried.push(`${where}: no mortgaged household`);
      continue;
    }
    const household = core.households.get(loan.householdId)!;
    const buyer = townOutsideOf(core.organizations.values(), household.placeId);
    // Another owner whose cash is outside the books.
    const other = [...core.organizations.values()]
      .filter((org) => {
        if (!buyer || org.id === buyer.id) return false;
        const account = core.cashJournal.residualAccountByOwner.get(org.id);
        return (
          account !== undefined &&
          core.cashJournal.accounts.get(account)?.outsideFlow === true
        );
      })
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!buyer || !other) {
      tried.push(`${where}: no second outside account`);
      continue;
    }
    housing
      .table("mortgages")
      .put({ ...loan, holderId: other.id } as unknown as ModuleRow);
    const first = household.memberIds.find((id) => core.people.get(id)?.alive);
    const before = core.people.get(first!)?.liquidMinor ?? 0;
    let sale: ReturnType<typeof sellHome>;
    expect(
      () => (sale = sellHome(api, loan.householdId, "test.departure")),
      where,
    ).not.toThrow();
    expect(sale!, where).toBeTruthy();
    expect(core.finance.contracts.get(loan.id)!.endedAt, where).toBeTruthy();
    expect(
      (housing.table("mortgages").get(loan.id) as unknown as MortgageRow)
        .balanceMinor,
      where,
    ).toBe(0);
    // The lender is paid off the books; the surplus still reaches the seller.
    expect(sale!.priceMinor, where).toBe(
      sale!.toLenderMinor + sale!.surplusMinor,
    );
    expect(core.people.get(first!)!.liquidMinor - before, where).toBe(
      sale!.surplusMinor,
    );
    process.stdout.write(
      `HOME-SALE-OTHER ${where}: ${sale!.id}; buyer ${buyer.id}; lender ${other.id}; to lender ${sale!.toLenderMinor}; surplus ${sale!.surplusMinor}\n`,
    );
    return;
  }
  throw new Error(
    `no mortgaged household with a second outside account in 8 places: ${tried.join("; ")}`,
  );
}, 900_000);
