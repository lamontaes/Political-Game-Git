import { daysBetween, makeIsoDate } from "./kernel/dates";
import dataJson from "./data/business-books.json" with { type: "json" };
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import type { Source } from "./types";

/** Pure estimates and funding plans. No transfer, opening receipt, or job mutation. */
export interface BusinessKind {
  id: string;
  industry: string;
  marginParameter: string;
  payrollShareParameter: string;
  salesCostShareParameter: string;
  salesCostEstimated: boolean;
  creditLineDaysParameter: string | null;
  ownPriceElasticityParameter: string;
  stopgapIds: readonly string[];
}

export interface BusinessBooksData {
  version: string;
  source: {
    citation: string;
    vintage: string;
    availableBy: string;
    limit: string;
  };
  kinds: readonly BusinessKind[];
  classifications: readonly {
    classification: string;
    kindId: string | null;
    fundingRoute: string;
    citation: string;
    stopgapId: string;
  }[];
  policy: {
    incomeElasticityParameter: string;
    incomeHalfLifeDaysParameter: string;
    crowdingResponseParameter: string;
    priceStepMaximumParameter: string;
    rivalPriceElasticityParameter: string;
    repaymentShareParameter: string;
    lineReferenceDaysParameter: string;
  };
  stopgapIds: readonly string[];
  reasons: {
    unknownClassification: string;
    outsideBusinessScope: string;
    missingIncomeAnchor: string;
    missingCapacity: string;
  };
}

export const DEFAULT_BUSINESS_BOOKS_DATA: BusinessBooksData = dataJson;

export interface BusinessBooksOptions {
  data?: BusinessBooksData;
  parameters?: Readonly<Record<string, Parameter>>;
}

function settings(options: BusinessBooksOptions) {
  const data = options.data ?? DEFAULT_BUSINESS_BOOKS_DATA;
  const registry = options.parameters ?? PARAMETERS;
  return { data, p: (key: string) => parameter(key, registry) };
}

function nonnegative(value: number, field: string, zero: number): void {
  if (!Number.isFinite(value) || value < zero)
    throw new Error(`Invalid nonnegative business value: ${field}`);
}

function positive(value: number, field: string, zero: number): void {
  if (!Number.isFinite(value) || value <= zero)
    throw new Error(`Invalid positive business value: ${field}`);
}

function minor(value: number, field: string, zero: number): void {
  nonnegative(value, field, zero);
  if (!Number.isSafeInteger(value))
    throw new Error(
      `Business cash requires safe integer minor units: ${field}`,
    );
}

function currentSource(source: Source, at: string): void {
  if (makeIsoDate(source.asOf) > makeIsoDate(at))
    throw new Error("Business input cannot use a future current-state source.");
}

function kindById(data: BusinessBooksData, id: string): BusinessKind {
  const kind = data.kinds.find((row) => row.id === id);
  if (!kind) throw new Error(`Unregistered business kind: ${id}`);
  return kind;
}

export function classifyBusiness(
  classification: string,
  options: BusinessBooksOptions = {},
): { kind?: BusinessKind; gap?: string; stopgapIds: readonly string[] } {
  const { data } = settings(options);
  const row = data.classifications.find(
    (candidate) => candidate.classification === classification,
  );
  if (!row)
    return {
      gap: data.reasons.unknownClassification,
      stopgapIds: data.stopgapIds,
    };
  const stopgapIds = [...data.stopgapIds, row.stopgapId];
  return row.kindId === null
    ? { gap: data.reasons.outsideBusinessScope, stopgapIds }
    : { kind: kindById(data, row.kindId), stopgapIds };
}

export interface OpeningBusinessInput {
  organizationId: string;
  classification: string;
  at: string;
  /** Recorded schedule/SOC-based annual plan; never future wages claimed as paid. */
  annualPlannedPayMinor: number;
  existingCashMinor: number;
  source: Source;
}

export interface OpeningBusinessProjection {
  organizationId: string;
  kindId: string;
  at: string;
  annualPlannedPayMinor: number;
  annualDemandMinor: number;
  capacityMinor: number;
  annualOtherCostsMinor: number;
  /** Read-only copy of established cash, never a new opening credit. */
  existingCashMinor: number;
  salesCostEstimated: boolean;
  parameterRefs: readonly string[];
  stopgapIds: readonly string[];
  source: Source;
}

export function projectOpeningBusiness(
  input: OpeningBusinessInput,
  options: BusinessBooksOptions = {},
): { books?: OpeningBusinessProjection; gap?: string } {
  const { data, p } = settings(options),
    zero = p("zero"),
    one = p("one");
  makeIsoDate(input.at);
  currentSource(input.source, input.at);
  minor(input.annualPlannedPayMinor, "annual planned pay", zero);
  minor(input.existingCashMinor, "existing cash", zero);
  const classification = classifyBusiness(input.classification, options);
  if (!classification.kind) return { gap: classification.gap };
  const kind = classification.kind;
  const payrollShare = p(kind.payrollShareParameter),
    margin = p(kind.marginParameter);
  positive(payrollShare, "industry payroll share", zero);
  if (!Number.isFinite(margin) || margin >= one)
    throw new Error("Industry margin must be finite and below unity.");
  const annualDemandMinor = input.annualPlannedPayMinor / payrollShare;
  const annualOtherCostsMinor = Math.max(
    zero,
    annualDemandMinor * (one - margin) - input.annualPlannedPayMinor,
  );
  nonnegative(annualDemandMinor, "opening demand projection", zero);
  nonnegative(annualOtherCostsMinor, "opening other-cost projection", zero);
  return {
    books: {
      organizationId: input.organizationId,
      kindId: kind.id,
      at: input.at,
      annualPlannedPayMinor: input.annualPlannedPayMinor,
      annualDemandMinor,
      capacityMinor: annualDemandMinor,
      annualOtherCostsMinor,
      existingCashMinor: input.existingCashMinor,
      salesCostEstimated: kind.salesCostEstimated,
      parameterRefs: [
        kind.marginParameter,
        kind.payrollShareParameter,
        kind.salesCostShareParameter,
      ],
      stopgapIds: [...classification.stopgapIds, ...kind.stopgapIds],
      source: {
        tag: "ESTIMATED",
        asOf: input.at,
        generationPriorVintage: data.source.vintage,
        citation: `${input.source.citation} ${data.source.citation}`,
        estimatedFrom: `Recorded planned payroll and ${kind.industry} aggregate ratios; ${data.source.vintage}. ${data.source.limit} Demand/cost projections are not cash receipts or observed firm books.`,
      },
    },
  };
}

export interface MarketProjectionInput {
  from: string;
  to: string;
  priorReachedIncomeMinor: number;
  currentTownIncomeMinor: number;
  anchorTownIncomeMinor: number;
  anchorAnnualDemandMinor: number;
  relativePriceToAnchor: number;
  /**
   * The place's general price level against the opening's. Spending in
   * dollars moves with it, and income counts at its buying power: inflation
   * alone (prices and incomes up alike) leaves what households buy unchanged.
   * Absent, 1.
   */
  generalPriceFactor?: number;
  /** Supplied dated macro factor; absent macro conditions are not fabricated here. */
  macroDemandFactor: number;
  kindId: string;
  source: Source;
}

export function projectMarket(
  input: MarketProjectionInput,
  options: BusinessBooksOptions = {},
): {
  reachedIncomeMinor: number;
  annualDemandMinor?: number;
  gap?: string;
  stopgapIds: readonly string[];
} {
  const { data, p } = settings(options),
    zero = p("zero"),
    one = p("one");
  const elapsed = daysBetween(makeIsoDate(input.from), makeIsoDate(input.to));
  nonnegative(elapsed, "elapsed market days", zero);
  currentSource(input.source, input.to);
  for (const [field, value] of Object.entries({
    priorReachedIncomeMinor: input.priorReachedIncomeMinor,
    currentTownIncomeMinor: input.currentTownIncomeMinor,
    anchorTownIncomeMinor: input.anchorTownIncomeMinor,
    anchorAnnualDemandMinor: input.anchorAnnualDemandMinor,
    macroDemandFactor: input.macroDemandFactor,
  }))
    nonnegative(value, field, zero);
  positive(input.relativePriceToAnchor, "relative market price", zero);
  const halfLife = p(data.policy.incomeHalfLifeDaysParameter);
  positive(halfLife, "income response half-life", zero);
  const elasticity = p(data.policy.incomeElasticityParameter);
  nonnegative(elasticity, "income elasticity", zero);
  const ownPriceElasticity = p(
    kindById(data, input.kindId).ownPriceElasticityParameter,
  );
  nonnegative(ownPriceElasticity, "own-price elasticity", zero);
  // Analytic linear relaxation admits actual zero income without a fabricated floor.
  const left = Math.exp((-Math.log(p("two")) * elapsed) / halfLife);
  const reachedIncomeMinor =
    input.currentTownIncomeMinor +
    (input.priorReachedIncomeMinor - input.currentTownIncomeMinor) * left;
  nonnegative(reachedIncomeMinor, "reached income", zero);
  if (input.anchorTownIncomeMinor === zero)
    return {
      reachedIncomeMinor,
      gap: data.reasons.missingIncomeAnchor,
      stopgapIds: data.stopgapIds,
    };
  const prices = input.generalPriceFactor ?? one;
  positive(prices, "general price level", zero);
  const annualDemandMinor =
    input.anchorAnnualDemandMinor *
    prices *
    (reachedIncomeMinor / input.anchorTownIncomeMinor / prices) ** elasticity *
    input.relativePriceToAnchor ** (one - ownPriceElasticity) *
    input.macroDemandFactor;
  nonnegative(annualDemandMinor, "market annual demand projection", zero);
  return { reachedIncomeMinor, annualDemandMinor, stopgapIds: data.stopgapIds };
}

export function projectBusinessPrice(
  input: {
    priorPrice: number;
    annualPlannedPayMinor: number;
    annualOtherCostsMinor: number;
    wagePriceFactor: number;
    generalPriceFactor: number;
    annualDemandMinor: number;
    capacityMinor: number;
    /** The prior price against the opening's, so nominal demand is read against capacity in the same dollars. */
    priceLevel?: number;
  },
  options: BusinessBooksOptions = {},
): number {
  const { data, p } = settings(options),
    zero = p("zero"),
    one = p("one");
  positive(input.priorPrice, "prior business price", zero);
  positive(input.wagePriceFactor, "wage price factor", zero);
  positive(input.generalPriceFactor, "general price factor", zero);
  for (const [field, value] of Object.entries({
    annualPlannedPayMinor: input.annualPlannedPayMinor,
    annualOtherCostsMinor: input.annualOtherCostsMinor,
    annualDemandMinor: input.annualDemandMinor,
    capacityMinor: input.capacityMinor,
  }))
    nonnegative(value, field, zero);
  const totalCosts = input.annualPlannedPayMinor + input.annualOtherCostsMinor;
  if (input.capacityMinor === zero && input.annualDemandMinor > zero)
    throw new Error("Positive firm demand requires a positive capacity basis.");
  const payShare =
    totalCosts > zero ? input.annualPlannedPayMinor / totalCosts : zero;
  const costFactor =
    payShare * input.wagePriceFactor +
    (one - payShare) * input.generalPriceFactor;
  const crowding =
    input.capacityMinor > zero
      ? input.annualDemandMinor /
          (input.capacityMinor * (input.priceLevel ?? one)) -
        one
      : zero;
  const maximum = p(data.policy.priceStepMaximumParameter),
    response = p(data.policy.crowdingResponseParameter);
  nonnegative(maximum, "price-step maximum", zero);
  nonnegative(response, "crowding response", zero);
  const step = Math.max(-maximum, Math.min(maximum, response * crowding));
  const price = input.priorPrice * costFactor * Math.exp(step);
  positive(price, "projected business price", zero);
  return price;
}

export function splitMarketDemand(
  annualDemandMinor: number,
  members: readonly {
    organizationId: string;
    capacityMinor: number;
    relativePrice: number;
  }[],
  options: BusinessBooksOptions = {},
): {
  allocations: readonly { organizationId: string; annualDemandMinor: number }[];
  unallocatedAnnualDemandMinor: number;
  gap?: string;
} {
  const { data, p } = settings(options),
    zero = p("zero");
  nonnegative(annualDemandMinor, "market demand", zero);
  const elasticity = p(data.policy.rivalPriceElasticityParameter);
  nonnegative(elasticity, "rival-price elasticity", zero);
  const ids = new Set<string>();
  const weights = members.map((row) => {
    if (!row.organizationId || ids.has(row.organizationId))
      throw new Error("Market members require unique organization identities.");
    ids.add(row.organizationId);
    nonnegative(row.capacityMinor, "member capacity", zero);
    positive(row.relativePrice, "member relative price", zero);
    const weight = row.capacityMinor * row.relativePrice ** -elasticity;
    nonnegative(weight, "member demand weight", zero);
    return { organizationId: row.organizationId, weight };
  });
  const totalWeight = weights.reduce((sum, row) => sum + row.weight, zero);
  nonnegative(totalWeight, "total demand weight", zero);
  return {
    allocations: weights.map((row) => {
      const amount =
        totalWeight > zero
          ? annualDemandMinor * (row.weight / totalWeight)
          : zero;
      nonnegative(amount, "member annual demand projection", zero);
      return { organizationId: row.organizationId, annualDemandMinor: amount };
    }),
    unallocatedAnnualDemandMinor: totalWeight > zero ? zero : annualDemandMinor,
    gap: totalWeight > zero ? undefined : data.reasons.missingCapacity,
  };
}

export function projectOtherCosts(
  input: {
    kindId: string;
    openingAnnualOtherCostsMinor: number;
    annualDemandMinor: number;
    capacityMinor: number;
    generalPriceFactor: number;
  },
  options: BusinessBooksOptions = {},
): {
  annualOtherCostsMinor: number;
  salesCostEstimated: boolean;
  parameterRef: string;
} {
  const { data, p } = settings(options),
    zero = p("zero"),
    one = p("one");
  for (const [field, value] of Object.entries({
    openingAnnualOtherCostsMinor: input.openingAnnualOtherCostsMinor,
    annualDemandMinor: input.annualDemandMinor,
    capacityMinor: input.capacityMinor,
  }))
    nonnegative(value, field, zero);
  positive(input.generalPriceFactor, "other-cost price factor", zero);
  if (input.capacityMinor === zero && input.annualDemandMinor > zero)
    throw new Error("Positive firm demand requires a positive capacity basis.");
  const kind = kindById(data, input.kindId),
    share = p(kind.salesCostShareParameter);
  nonnegative(share, "sales-sensitive cost share", zero);
  if (share > one) throw new Error("Sales-sensitive cost share exceeds unity.");
  const scale =
    input.capacityMinor > zero
      ? input.annualDemandMinor / input.capacityMinor
      : zero;
  const annualOtherCostsMinor =
    input.openingAnnualOtherCostsMinor *
    (one - share + share * scale) *
    input.generalPriceFactor;
  nonnegative(annualOtherCostsMinor, "other-cost projection", zero);
  return {
    annualOtherCostsMinor,
    salesCostEstimated: kind.salesCostEstimated,
    parameterRef: kind.salesCostShareParameter,
  };
}

/** A conditional size estimate is neither approval nor a source of lender cash. */
export function estimateCreditLimit(
  annualDemandMinor: number,
  kindId: string,
  options: BusinessBooksOptions = {},
): number | undefined {
  const { data, p } = settings(options),
    zero = p("zero");
  nonnegative(annualDemandMinor, "line-size demand basis", zero);
  const ref = kindById(data, kindId).creditLineDaysParameter;
  if (ref === null) return undefined;
  const days = p(ref),
    year = p(data.policy.lineReferenceDaysParameter);
  nonnegative(days, "conditional line-size days", zero);
  positive(year, "annual day conversion", zero);
  const limit = Math.floor(annualDemandMinor * (days / year));
  minor(limit, "estimated line limit", zero);
  return limit;
}
