/**
 * Selling an owned home when its owners leave town or the last of them dies
 * (the replacement for SG-P15-moves-owners-stay). The home goes on the market
 * (`sellHome`) and stays the seller's until a buyer takes it: a household that
 * left still owns it, and an estate stays open with the house in it. Its
 * mortgage stops being paid each month and runs on at its rate until the
 * sale. When a buyer takes it (housing-listings.ts `takeHomes`), the buyer
 * pays the seller and `closeSale` pays the lender from that money first, the
 * months of interest since it was listed included; the rest is the seller's,
 * and a price under the payoff leaves the lender the loss, as at a
 * foreclosure sale. The sale is a record the housing ledger keeps.
 */
import { townOutsideOf } from "./opening-outside-market";
import { daysBetweenText } from "./kernel/dates";
import { transferCash } from "./world-transfer";
import type { ModuleRow } from "./module-data";
import { formerHome } from "./housing-former-home";
import type { MortgageRow } from "./housing-foreclosure";
import { type HomePart, listHome, markSold } from "./housing-listings";
import type { CoreAPI, CoreState } from "./types";

const HOUSING = "housing";
/** The outcome web's factor on what homes are worth here (a severe disaster's lower prices): the housing engine values each home, and prices each purchase and sale, at it. */
export const HOME_VALUE_MEASURE = "housing.home-value";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);

export interface HomeSale {
  readonly id: string;
  readonly householdId: string;
  readonly placeId: string;
  /** The day it went on the market, and the day the last of its homes was bought. */
  readonly date: string;
  readonly status: "listed" | "sold";
  readonly soldAt?: string;
  /** Homes for sale: a counted household's record stands for several; those still unsold. */
  readonly homes: number;
  readonly homesLeft: number;
  /** Who the buyer pays: the household (its first member) or the estate (the decedent); for a counted household, the town's outside market, which passes the money on that day. */
  readonly payeeId: string;
  /** A counted household's surplus goes to its group's account (the counted dead's heirs); none, it leaves town with the household. */
  readonly surplusAccountId?: string;
  /** The home's value when last valued and the place's price level then: its value today by the one value rule (housing-price-level.ts `homeValueToday`). */
  readonly homeValueMinor: number;
  readonly homePriceLevel?: number;
  /** The purchases that bought its homes. */
  readonly boughtBy?: readonly string[];
  readonly mortgageIds: readonly string[];
  readonly priceMinor: number;
  readonly owedMinor: number;
  readonly toLenderMinor: number;
  readonly surplusMinor: number;
  readonly lossMinor: number;
  readonly reasonKey: string;
  /** The dead owner whose estate the sale belongs to, and the death that opened it. */
  readonly decedentId?: string;
  readonly deathEventId?: string;
  /** For an estate's sale: probate's record and who the estate paid, once it closed. */
  readonly settledEventId?: string;
  readonly paid?: readonly {
    readonly toId: string;
    readonly amountMinor: number;
  }[];
}

/** An estate's home sale records probate's close and whom the estate paid. */
export function recordEstatePaid(
  api: CoreAPI,
  sale: HomeSale,
  settledEventId: string,
  paid: readonly { readonly toId: string; readonly amountMinor: number }[],
): void {
  table(api, "sales").put({
    ...sale,
    settledEventId,
    paid: paid.map((row) => ({ ...row })),
  } as unknown as ModuleRow);
}

/** Whether an owner's cash is outside the game's books (an outside market, a lender elsewhere). */
function outsideOwner(core: CoreState, ownerId: string): boolean {
  const account = core.cashJournal.residualAccountByOwner.get(ownerId);
  return (
    account !== undefined &&
    core.cashJournal.accounts.get(account)?.outsideFlow === true
  );
}

/** A household's home sale on a date, if it sold. */
export function homeSaleOf(
  api: CoreAPI,
  householdId: string,
): HomeSale | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  // Only a household whose home went on the market has a sale.
  const home = table(api, "dwellings").get(`dwelling:${householdId}`) as
    { tenure?: string; basis?: string } | undefined;
  if (home?.basis !== "sale") return undefined;
  return (table(api, "sales").rows() as unknown as HomeSale[])
    .filter((row) => row.householdId === householdId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

/**
 * Puts the household's home on the market, for what a buyer will pay. It
 * stays the household's (or its estate's) until a buyer takes it; its
 * mortgage stops being billed and is paid off, with interest for the months
 * it waited, from the sale. Returns the sale, or undefined when the household
 * owns no recorded home (or already has it on the market).
 */
export function sellHome(
  api: CoreAPI,
  householdId: string,
  reasonKey: string,
  estate?: { decedentId: string; deathEventId: string },
  /**
   * A counted household's home: the households its record stands for, the
   * place it is in, and the account its surplus goes to (its group's, for the
   * counted dead); none, the surplus leaves town with it.
   */
  counted?: {
    readonly placeId: string;
    readonly weight: number;
    readonly surplusAccountId?: string;
  },
): HomeSale | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  const c = api.state as CoreState;
  const dwelling = table(api, "dwellings").get(`dwelling:${householdId}`) as
    | {
        tenure?: string;
        kind?: string;
        valueMinor?: number;
        priceLevel?: number;
      }
    | undefined;
  if (dwelling?.tenure !== "own") return undefined;
  const household = c.households.get(householdId);
  const placeId = counted?.placeId ?? household?.placeId;
  if (!placeId) return undefined;
  const times = counted?.weight ?? 1;
  const market = townOutsideOf(c.organizations.values(), placeId);
  // The estate, or the household's first living member, is paid; a counted record has no account of its own, so the outside market takes the buyer's money for it and passes it on the same day.
  const payeeId = counted
    ? market?.id
    : (estate?.decedentId ??
      household?.memberIds.find((id) => c.people.get(id)?.alive) ??
      household?.memberIds[0]);
  if (!payeeId) return undefined;
  const mortgages = (
    table(api, "mortgages").rows() as unknown as MortgageRow[]
  ).filter((row) => row.householdId === householdId && row.balanceMinor > 0);
  for (const mortgage of mortgages) {
    table(api, "mortgages").put({
      ...mortgage,
      listedAt: c.date,
    } as unknown as ModuleRow);
    // The household stops paying it month by month: it is paid off from the sale.
    if (
      c.finance.contracts.has(mortgage.id) &&
      !c.finance.contracts.get(mortgage.id)!.endedAt
    )
      api.endStandingContract(mortgage.id);
  }
  const stamp = `${householdId}:${c.date}`;
  table(api, "dwellings").put(
    formerHome(dwelling, {
      householdId,
      tenure: "listed",
      basis: "sale",
      date: c.date,
    }) as unknown as ModuleRow,
  );
  const sale: HomeSale = {
    id: `home-sale:${stamp}`,
    householdId,
    placeId,
    date: c.date,
    status: "listed",
    homes: times,
    homesLeft: times,
    payeeId,
    ...(counted?.surplusAccountId
      ? { surplusAccountId: counted.surplusAccountId }
      : {}),
    homeValueMinor: dwelling.valueMinor ?? 0,
    ...(dwelling.priceLevel !== undefined
      ? { homePriceLevel: dwelling.priceLevel }
      : {}),
    mortgageIds: mortgages.map((row) => row.id),
    priceMinor: 0,
    owedMinor: Math.round(
      mortgages.reduce((sum, row) => sum + row.balanceMinor, 0) * times,
    ),
    toLenderMinor: 0,
    surplusMinor: 0,
    lossMinor: 0,
    reasonKey,
    ...(estate
      ? { decedentId: estate.decedentId, deathEventId: estate.deathEventId }
      : {}),
  };
  table(api, "sales").put(sale as unknown as ModuleRow);
  // A home offered this month, for sale until a buyer takes it: the place's price level weighs it against the month's buyers.
  listHome(api, placeId, times, sale.id, payeeId, {
    valueMinor: sale.homeValueMinor,
    ...(sale.homePriceLevel !== undefined
      ? { priceLevel: sale.homePriceLevel }
      : {}),
  });
  return sale;
}

/**
 * A buyer took `homes` of the sale's homes and paid its payee
 * `receivedMinor` for them: the lender is paid first from that money (the
 * balance on those homes and the interest since the home was listed), and the
 * rest is the seller's. The last homes bought close the sale.
 */
export function closeSale(
  api: CoreAPI,
  saleId: string,
  homes: number,
  receivedMinor: number,
  purchaseId: string,
): void {
  const sale = table(api, "sales").get(saleId) as unknown as
    HomeSale | undefined;
  if (!sale || sale.status !== "listed" || homes <= 0) return;
  const c = api.state as CoreState;
  const share = Math.min(1, homes / sale.homes);
  const months = (days: number) =>
    days /
    (api.parameter("daysPerMeanYear") / api.parameter("macroMonthsPerYear"));
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation:
      "Housing engine: the price a buyer paid for a home on the market, the lender paid from it first.",
    estimatedFrom: `${purchaseId} bought ${homes} of ${sale.householdId}'s home sale ${saleId} (${sale.reasonKey}).`,
  };
  let remaining = receivedMinor,
    toLender = 0,
    owedNow = 0;
  for (const id of sale.mortgageIds) {
    const mortgage = table(api, "mortgages").get(id) as unknown as
      (MortgageRow & { rate?: number; listedAt?: string }) | undefined;
    if (!mortgage || mortgage.balanceMinor <= 0) continue;
    // The balance on the homes bought, and its interest for the months it waited on the market.
    const waited = mortgage.listedAt
      ? months(daysBetweenText(mortgage.listedAt, c.date))
      : 0;
    const each =
      mortgage.balanceMinor *
      (1 +
        ((mortgage.rate ?? 0) / api.parameter("macroMonthsPerYear")) * waited);
    const owed = Math.round(each * sale.homes * share);
    owedNow += owed;
    const due = Math.min(remaining, owed);
    // Money between two parties outside the game's books (the outside market and a lender elsewhere) moves no cash; the loan is settled all the same.
    const paid =
      due <= 0
        ? 0
        : mortgage.holderId === sale.payeeId ||
            (outsideOwner(c, sale.payeeId) &&
              outsideOwner(c, mortgage.holderId))
          ? due
          : transferCash(
              api,
              `home-sale:${saleId}:${purchaseId}:${mortgage.id}`,
              sale.payeeId,
              mortgage.holderId,
              due,
              source,
            );
    toLender += paid;
    remaining -= paid;
    const last = sale.homesLeft - homes <= 1e-9;
    table(api, "mortgages").put({
      ...mortgage,
      balanceMinor: last
        ? 0
        : Math.max(0, mortgage.balanceMinor * (1 - homes / sale.homesLeft)),
      ...(last ? { monthsLeft: 0, soldAt: c.date } : {}),
    } as unknown as ModuleRow);
  }
  // The rest is the seller's: it stays with the household or the estate; a counted household's goes to its group, or leaves town with it.
  const surplus =
    remaining > 0 && sale.surplusAccountId
      ? api.accounts().transfer({
          id: `home-sale-surplus:${saleId}:${purchaseId}`,
          from: api.accounts().main(sale.payeeId),
          to: sale.surplusAccountId,
          amountMinor: remaining,
          reasonKey: "residents.counted-estate.home-surplus",
          source,
        }).paidMinor
      : Math.max(0, remaining);
  const homesLeft = Math.max(0, sale.homesLeft - homes);
  const sold = homesLeft <= 1e-9;
  const next: HomeSale = {
    ...sale,
    homesLeft: sold ? 0 : homesLeft,
    status: sold ? "sold" : "listed",
    ...(sold ? { soldAt: c.date } : {}),
    priceMinor: sale.priceMinor + receivedMinor,
    toLenderMinor: sale.toLenderMinor + toLender,
    surplusMinor: sale.surplusMinor + surplus,
    lossMinor: sale.lossMinor + Math.max(0, owedNow - toLender),
    boughtBy: [...(sale.boughtBy ?? []), purchaseId],
  };
  table(api, "sales").put(next as unknown as ModuleRow);
  if (sold) {
    const dwelling = table(api, "dwellings").get(
      `dwelling:${sale.householdId}`,
    ) as { tenure?: string; kind?: string; valueMinor?: number } | undefined;
    table(api, "dwellings").put(
      formerHome(dwelling, {
        householdId: sale.householdId,
        tenure: "sold",
        basis: "sale",
        date: c.date,
        soldForMinor: Math.round(next.priceMinor / sale.homes),
      }) as unknown as ModuleRow,
    );
  }
  // The counted dead's estate: what its home brought went to its group, the counted heirs.
  if (sold && sale.surplusAccountId && sale.deathEventId)
    recordEstatePaid(api, next, sale.deathEventId, [
      { toId: sale.surplusAccountId, amountMinor: next.surplusMinor },
    ]);
}

/**
 * A purchase paid each part's seller `paidMinor`: each household's sale it
 * came from pays its lender and closes; a foreclosed home's case names it.
 */
export function closeSales(
  api: CoreAPI,
  parts: readonly (HomePart & { readonly paidMinor: number })[],
  purchaseId: string,
): void {
  for (const part of parts) {
    if (!part.saleId) continue;
    if (table(api, "sales").get(part.saleId))
      closeSale(api, part.saleId, part.homes, part.paidMinor, purchaseId);
    else markSold(api, [part.saleId], purchaseId);
  }
}
