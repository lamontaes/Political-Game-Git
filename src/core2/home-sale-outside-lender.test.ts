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
import type { ModuleRow } from "./module-data";

// A buyer from outside the town (the outside market) takes a listed home and
// pays the household, which pays its lender from that money. When the same
// outside market holds the mortgage, or another account outside the books
// does, the payoff still settles the loan without throwing (it once stopped a
// played year with "A transfer needs two different accounts", Boiling Spring
// Lakes, North Carolina, and with "Money cannot move between two outside
// accounts", South Fork, Missouri), and the mortgage ends.
//
// Pinned (tests-housing-sale-tests-draw-from-the-clock): each case is a named
// place, world seed and mortgaged household. The old tests drew up to eight
// places from randomBytes and took the first mortgaged household (and the
// first other outside account by id), on the premise that any draw has one;
// the records below are each one, 40 days in.
const BUTTE = {
  key: "0209710",
  seed: "8250ac48f569e0e80327bf3f0ea85c3b21739da3c1ab1bc217149d813ce3270d",
  householdId: "household_0e78b6e0755552d9",
};
const LA_CUEVA = {
  key: "3536930",
  seed: "eba9bb33912a60c335307fc2876f25908f56062b19a48b0c4cf650fa2402b5a0",
  householdId: "household_e464eafdeb06259e",
  lenderId: "opening-retirement-contributor:42ea519c7efc58c6",
};

it("sells a home whose mortgage the outside market holds: the loan ends and no cash moves to itself", () => {
  {
    const place = BUTTE;
    const where = `Butte, Alaska (${place.key}), world seed ${place.seed}, ${place.householdId}`;
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
    const loan = loans.find((row) => row.householdId === place.householdId);
    expect(loan, `${where}: the named mortgaged household`).toBeTruthy();
    if (!loan) return;
    const household = core.households.get(loan.householdId)!;
    // The town's outside market, found the way housing finds the holder of an
    // outside loan and the sale finds its buyer. The first outside account by
    // id was not it where a place also has an out-of-town employer (Plainview,
    // Arkansas): the loan went to the employer, and the payoff tried to move
    // cash between two outside accounts.
    const buyer = townOutsideOf(core.organizations.values(), household.placeId);
    expect(buyer, `${where}: the town's outside market`).toBeTruthy();
    if (!buyer) return;
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
    const listed = sellHome(api, loan.householdId, "test.departure");
    expect(listed, where).toBeTruthy();
    const sale = buyListedHome(api, listed!.id, buyer.id);
    expect(sale.status, where).toBe("sold");
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
  }
  // About 64 s measured: building Butte and its 40 days.
}, 130_000);

// A lender outside the books that is not the buyer: a household that moved
// within the county keeps its lender while its new place has its own outside
// market. It stopped a twenty-year game in its thirteenth year (South Fork,
// Missouri, Nov 10, 2026: an estate's home sale threw "Money cannot move
// between two outside accounts").
it("sells a home whose mortgage another outside account holds: the loan ends and nothing throws", () => {
  {
    const place = LA_CUEVA;
    const where = `La Cueva, New Mexico (${place.key}), world seed ${place.seed}, ${place.householdId}`;
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
        row.householdId === place.householdId &&
        row.balanceMinor > 0 &&
        core.finance.contracts.has(row.id) &&
        core.households.has(row.householdId),
    );
    expect(loan, `${where}: the named mortgaged household`).toBeTruthy();
    if (!loan) return;
    const household = core.households.get(loan.householdId)!;
    const buyer = townOutsideOf(core.organizations.values(), household.placeId);
    // Another owner whose cash is outside the books.
    const other = core.organizations.get(place.lenderId);
    const otherAccount = core.cashJournal.residualAccountByOwner.get(
      place.lenderId,
    );
    expect(
      buyer !== undefined &&
        other !== undefined &&
        other.id !== buyer.id &&
        otherAccount !== undefined &&
        core.cashJournal.accounts.get(otherAccount)?.outsideFlow === true,
      `${where}: ${place.lenderId} is a second outside account`,
    ).toBe(true);
    if (!buyer || !other) return;
    housing
      .table("mortgages")
      .put({ ...loan, holderId: other.id } as unknown as ModuleRow);
    const first = household.memberIds.find((id) => core.people.get(id)?.alive);
    const before = core.people.get(first!)?.liquidMinor ?? 0;
    let sale: ReturnType<typeof buyListedHome>;
    expect(() => {
      const listed = sellHome(api, loan.householdId, "test.departure")!;
      sale = buyListedHome(api, listed.id, buyer.id);
    }, where).not.toThrow();
    expect(sale!.status, where).toBe("sold");
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
  }
  // About 34 s measured: building La Cueva and its 40 days.
}, 70_000);
