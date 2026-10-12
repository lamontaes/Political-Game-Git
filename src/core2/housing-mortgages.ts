/**
 * Owners' mortgages at the opening. Which owners still owe, and how much,
 * follows national records: the share of owners with a mortgage by the
 * householder's age (ACS B25027), when owners moved in (ACS B25038, older
 * owners earlier), the median down payment (NAR 2025), the 30-year rate in
 * the month they bought (FHFA MIRS and H.15) and prices then (CPI-U, until a
 * house price index is in the data). A loan bought more than 30 years ago is
 * paid off. Each mortgage is a monthly payment to the town bank: a standing
 * bill for a full household, a residents flow for a counted one.
 */
import housingData from "./data/housing/housing.json" with { type: "json" };
import history from "./data/macro/history.json" with { type: "json" };
import type { FinanceContractInput } from "./finance-types";
import { historicalMortgageRate, type MacroParameter } from "./macro-model";
import type { ResidentFlowInput } from "./residents";
import { stopgap } from "./stopgaps";
import type { IsoDate, Source } from "./types";

const DATA = housingData.mortgage;
const CPI = new Map(
  (history.annualCpi as { year: number; index: number }[]).map((row) => [
    row.year,
    row.index,
  ]),
);
export const MORTGAGE_PREFIX = "mortgage:";
export const MORTGAGE_TERMS_KEY = "housingMortgages";
export const countedMortgageFlowId = (placeId: string) =>
  `${MORTGAGE_PREFIX}residents:${placeId}`;

export interface MortgageOwner {
  id: string;
  counted: boolean;
  memberIds: readonly string[];
  payerIds: readonly string[];
  /** Oldest member's birth year. */
  oldest: number;
  /** Household cash at the opening. */
  liquidMinor: number;
  /** Today's value of the home. */
  valueMinor: number;
}

export interface MortgageTerms {
  householdId: string;
  boughtYear: number;
  rate: number;
  originalMinor: number;
  balanceMinor: number;
  paymentMinor: number;
  monthsLeft: number;
}

function cpi(year: number): number {
  const years = [...CPI.keys()];
  const at = Math.min(Math.max(year, years[0]!), years.at(-1)!);
  return CPI.get(at)!;
}

/** What is left of a loan after `paid` monthly payments. */
function balanceAfter(
  principal: number,
  monthlyRate: number,
  months: number,
  paid: number,
): number {
  if (monthlyRate <= 0) return principal * (1 - paid / months);
  const g = (1 + monthlyRate) ** paid,
    n = (1 + monthlyRate) ** months;
  return (principal * (n - g)) / (n - 1);
}

export function openingMortgages(input: {
  owners: readonly MortgageOwner[];
  startedAt: IsoDate;
  dueAt: IsoDate;
  bankId: string;
  account?: { accountId: string; placeId: string };
  placeId: string;
  p: MacroParameter;
  source: Source;
}): {
  contracts: FinanceContractInput[];
  flows: ResidentFlowInput[];
  terms: MortgageTerms[];
} {
  const { owners, p } = input;
  const year = Number(input.startedAt.slice(0, "YYYY".length));
  const months = p("macroMonthsPerYear"),
    termMonths = p("housingMortgageTermYears") * months,
    firstTimeAge = p("housingFirstTimeBuyerMedianAge");
  // Older owners moved in earlier: assign the ACS periods by age, oldest first.
  const byAge = [...owners].sort(
    (a, b) => a.oldest - b.oldest || a.id.localeCompare(b.id),
  );
  const periods = [...DATA.movedIn].sort((a, b) => a.fromYear - b.fromYear);
  const bought = new Map<string, number>();
  let cumulative = 0,
    k = 0;
  byAge.forEach((owner, i) => {
    const quantile = (i + 0.5) / byAge.length;
    while (k < periods.length - 1 && quantile > cumulative + periods[k]!.share)
      cumulative += periods[k++]!.share;
    const period = periods[k]!;
    // Within its period, the place in the period's share sets the year.
    const within = Math.min(
      1,
      Math.max(0, (quantile - cumulative) / (period.share || 1)),
    );
    const last = Math.min(period.toYear, year - 1);
    const at = Math.round(period.fromYear + within * (last - period.fromYear));
    // Never before the householder turned 18.
    bought.set(
      owner.id,
      Math.max(at, owner.oldest + p("housingOwnerMinimumAge")),
    );
  });
  // In each age band, the band's share still owes: the most recent buyers, then the least cash.
  const owes = new Set<string>();
  for (const band of DATA.ageBands) {
    const inBand = owners.filter((owner) => {
      const age = year - owner.oldest;
      return (
        age >= band.minAge &&
        (band.maxAgeExclusive === null || age < band.maxAgeExclusive)
      );
    });
    const count = Math.round(inBand.length * band.mortgagedShare);
    for (const owner of [...inBand]
      .sort(
        (a, b) =>
          bought.get(b.id)! - bought.get(a.id)! ||
          a.liquidMinor - b.liquidMinor ||
          a.id.localeCompare(b.id),
      )
      .slice(0, count))
      owes.add(owner.id);
  }
  stopgap("SG-WORLD-housing-mortgage-history");
  const contracts: FinanceContractInput[] = [],
    flows: ResidentFlowInput[] = [],
    terms: MortgageTerms[] = [],
    counted: Record<string, number> = {};
  for (const owner of owners) {
    if (!owes.has(owner.id) || owner.valueMinor <= 0) continue;
    const boughtYear = bought.get(owner.id)!;
    const paid = (year - boughtYear) * months;
    if (paid >= termMonths) continue;
    const ageThen = boughtYear - owner.oldest;
    const down =
      ageThen < firstTimeAge
        ? DATA.downPayment.firstTime
        : DATA.downPayment.repeat;
    const price = owner.valueMinor * (cpi(boughtYear) / cpi(year - 1));
    const original = price * (1 - down);
    const rate =
      historicalMortgageRate(`${boughtYear}-06`, p) / p("macroHundred");
    const r = rate / months;
    const payment = Math.round(
      r > 0
        ? (original * r) / (1 - (1 + r) ** -termMonths)
        : original / termMonths,
    );
    const balance = Math.round(balanceAfter(original, r, termMonths, paid));
    if (payment <= 0 || balance <= 0) continue;
    const id = `${MORTGAGE_PREFIX}${owner.id}`;
    terms.push({
      householdId: owner.id,
      boughtYear,
      rate,
      originalMinor: Math.round(original),
      balanceMinor: balance,
      paymentMinor: payment,
      monthsLeft: termMonths - paid,
    });
    const source: Source = {
      ...input.source,
      estimatedFrom: `Bought in ${boughtYear} at ${(rate * 100).toFixed(2)}% for 30 years with ${(down * 100).toFixed(0)}% down; ${termMonths - paid} payments left.`,
    };
    if (!owner.counted)
      contracts.push({
        id,
        householdId: owner.id,
        payerIds: [...owner.payerIds],
        payeeId: input.bankId,
        kind: "household-purchase",
        amountMinor: payment,
        dueAt: input.dueAt,
        periodMonths: 1,
        accruesArrears: true,
        source,
      });
    else if (input.account) counted[id] = payment;
  }
  // The wider population's mortgages are one monthly flow per place, by household (as its purchases are).
  const total = Object.values(counted).reduce((n, value) => n + value, 0);
  if (input.account && total > 0)
    flows.push({
      id: countedMortgageFlowId(input.placeId),
      kind: "purchase",
      financeKind: "household.mortgage",
      payerId: input.account.accountId,
      payeeId: input.bankId,
      residentsId: input.account.accountId,
      placeId: input.placeId,
      amountMinor: total,
      firstAt: input.dueAt,
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: false,
      marketAdjusted: false,
      amountByContract: counted,
      source: input.source,
    });
  return { contracts, flows, terms };
}
