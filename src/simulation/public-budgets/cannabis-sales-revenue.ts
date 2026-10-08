import type { LawInForce } from "../governing/law-in-force";
import { recordById } from "../history-index";
import { currentMeasureProvisions } from "../legislative-politics";
import { effectiveTaxPolicy, taxLevyText } from "../tax-policy";
import type { TaxTerms } from "../tax-types";

import {
  finalTermEnactment,
  finalTermProvisions,
  readFinalEnactedLawTerm,
} from "../governing/final-law-term-query";
import market from "../../../data/research/money/cannabis-retail-market.json";
import { makeIsoDate } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import type { EntityId, IsoDate, World } from "../types";
import { CANNABIS_TAX_EFFECT, TAX_QUESTION_EFFECTS } from "./rules";
import type { PublicBudgetGovernment } from "./store";
import { propositionIdFor } from "./fiscal";

export interface CannabisSalesRevenueReading {
  readonly reason:
    | "not-state-budget"
    | "question-not-present"
    | "starting-law-not-established"
    | "current-law-not-established"
    | "same-answer"
    | "waiting-for-retail"
    | "tax-terms-not-operative"
    | "sales-legalized"
    | "sales-ended";
  /** Annual change against the opening budget, not an actual sale or remittance. */
  readonly annualRevenueDelta: number;
  /** Exact governing measure for the caller's shared effect provenance stamp. */
  readonly sourceMeasureId: EntityId | null;
}

/**
 * One monthly-budget path for legal retail. The adopted rate controls revenue,
 * while the opening accounts remain the comparison baseline. This estimates
 * aggregate receipts; it does not invent a purchase or payment by a person.
 */
export function cannabisSalesRevenueChange(
  world: World,
  government: Pick<
    PublicBudgetGovernment,
    "level" | "lawJurisdictionId" | "population"
  >,
  date: IsoDate,
): CannabisSalesRevenueReading {
  const unchanged = (
    reason: CannabisSalesRevenueReading["reason"],
  ): CannabisSalesRevenueReading => ({
    reason,
    annualRevenueDelta: 0,
    sourceMeasureId: null,
  });
  const effect = TAX_QUESTION_EFFECTS.find(
    (row) => row.questionKey === CANNABIS_TAX_EFFECT.questionKey,
  );
  if (!effect || !(effect.levels ?? ["state"]).includes(government.level))
    return unchanged("not-state-budget");
  const propositionId = propositionIdFor(
    world,
    CANNABIS_TAX_EFFECT.questionKey,
  );
  if (!propositionId) return unchanged("question-not-present");
  const began = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  if (began === null) return unchanged("starting-law-not-established");
  const current = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  if (!current) return unchanged("current-law-not-established");
  if (
    current.origin === "in-force-at-start" ||
    (current.answer === "no" && began === "no")
  )
    return unchanged("same-answer");
  // Opening accounts already contain this estimate; subtract it only when
  // replacing or ending the opening legal market.
  const openingRevenue =
    began === "yes"
      ? CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount *
        government.population
      : 0;
  if (current.answer === "no") {
    return {
      reason: "sales-ended",
      annualRevenueDelta: -openingRevenue,
      sourceMeasureId: current.measureId,
    };
  }
  const priorMonth =
    Number(date.slice(0, 4)) * 12 +
    Number(date.slice(5, 7)) -
    1 -
    CANNABIS_TAX_EFFECT.perResidentRevenue.firstSaleLagMonths;
  const retailDate = makeIsoDate(
    `${Math.floor(priorMonth / 12)}-${String((priorMonth % 12) + 1).padStart(2, "0")}-${date.slice(8, 10) > "28" ? "28" : date.slice(8, 10)}`,
  );
  const prior = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    retailDate,
  );
  if (prior?.answer !== "yes") return unchanged("waiting-for-retail");
  const annualRevenue = enactedCannabisRevenue(
    world,
    government,
    current,
    date,
  );
  if (annualRevenue === null) return unchanged("tax-terms-not-operative");
  return {
    reason: "sales-legalized",
    annualRevenueDelta: annualRevenue - openingRevenue,
    sourceMeasureId: current.measureId,
  };
}

/** Registered by the eventual cannabis filing/data producer, never guessed here. */
export interface CannabisTaxSeriesBinding {
  readonly seriesKey: string;
  readonly baseKey: string;
}

export type CannabisTaxTermReading =
  | {
      readonly status: "operative";
      readonly terms: TaxTerms;
      readonly rateNumerator: number;
      readonly rateDenominator: number;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status:
        | "unknown-authorization"
        | "sales-not-authorized"
        | "starting-terms-not-established"
        | "series-not-bound"
        | "tax-policy-not-operative"
        | "measure-binding-mismatch"
        | "adopted-levy-mismatch"
        | "unsupported-aggregate-base";
      readonly terms: null;
    };

/**
 * Reads exact saved tax terms for the canonical law supplied by lawInForce.
 * Does not read catalog declarations, parse arbitrary prose, invent a rate,
 * or reconstruct numeric starting law from a yes/no starting-law observation.
 * The monthly budget caller discovers the binding on this law's saved proposal.
 */
export function cannabisTaxTermsForLaw(
  world: World,
  law: LawInForce | null,
  jurisdictionId: EntityId,
  binding: CannabisTaxSeriesBinding | null,
  asOf: IsoDate,
): CannabisTaxTermReading {
  const missing = (
    status: Exclude<CannabisTaxTermReading["status"], "operative">,
  ): CannabisTaxTermReading => ({ status, terms: null });
  if (!law || law.operativeAt > asOf) return missing("unknown-authorization");
  if (law.answer !== "yes") return missing("sales-not-authorized");
  if (law.origin !== "enacted")
    return missing("starting-terms-not-established");
  if (!binding?.seriesKey.trim() || !binding.baseKey.trim())
    return missing("series-not-bound");
  const policy = effectiveTaxPolicy(
    world,
    jurisdictionId,
    binding.seriesKey,
    asOf,
  );
  if (!policy || policy.recordedAt > asOf)
    return missing("tax-policy-not-operative");
  const proposal = recordById(
    world.history.taxProposals ?? [],
    policy.proposalId,
  );
  const enactment = recordById(
    world.history.legislativeEnactments ?? [],
    policy.enactmentId,
  );
  if (
    !proposal ||
    !enactment ||
    proposal.measureId !== law.measureId ||
    proposal.jurisdictionId !== jurisdictionId ||
    proposal.recordedAt > asOf ||
    enactment.measureId !== law.measureId ||
    enactment.outcome !== "enacted" ||
    enactment.resolvedAt > asOf ||
    proposal.terms.seriesKey !== binding.seriesKey ||
    proposal.terms.baseKey !== binding.baseKey
  )
    return missing("measure-binding-mismatch");
  const datedWorld = {
    ...world,
    history: {
      ...world.history,
      legislativeProvisions: world.history.legislativeProvisions?.filter(
        (row) => row.recordedAt <= asOf,
      ),
    },
  };
  const levy = currentMeasureProvisions(datedWorld, law.measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  if (
    !levy ||
    levy.id !== proposal.levyProvisionId ||
    levy.operativeEffect?.kind !== "tax-policy" ||
    levy.text !== taxLevyText(proposal.terms)
  )
    return missing("adopted-levy-mismatch");
  const terms = proposal.terms;
  // The current aggregate accounting helper does not represent per-sale
  // allowances, excluded classes or non-USD amounts. Do not silently drop them.
  if (
    terms.currency !== "USD" ||
    terms.allowanceMinorUnits !== 0 ||
    terms.exemptBaseKeys.length > 0 ||
    !Number.isSafeInteger(terms.rateNumerator) ||
    !Number.isSafeInteger(terms.rateDenominator) ||
    terms.rateDenominator <= 0 ||
    terms.rateNumerator < 0 ||
    terms.rateNumerator > terms.rateDenominator
  )
    return missing("unsupported-aggregate-base");
  return {
    status: "operative",
    terms,
    rateNumerator: terms.rateNumerator,
    rateDenominator: terms.rateDenominator,
    sourceRecordIds: [
      law.measureId,
      enactment.id,
      proposal.id,
      levy.id,
      policy.id,
    ],
  };
}

/** Every value must come from operative law terms or the actual world base. */
export interface CannabisRetailMechanismInputs {
  readonly adultResidents: number;
  /** Buyers on the same adult denominator, not merely respondents reporting use. */
  readonly buyerShare: number;
  /** Annual pretax spending using the same buyer definition and price-year. */
  readonly annualPretaxSpendingPerBuyer: number;
  /** From actual buyer/retail records or a researched market mechanism, never a pick. */
  readonly legalMarketShare: number;
  readonly exciseRate: number;
  readonly stateSalesTaxRate: number;
  readonly salesTaxIncludesExcise: boolean;
  readonly sources: {
    readonly lawTerms: string;
    readonly adultBuyerBase: string;
    readonly spending: string;
    readonly legalMarketShare: string;
  };
}

export interface CannabisRetailMechanismReading {
  readonly annualPotentialPretaxSpending: number;
  readonly annualLegalPretaxSales: number;
  readonly annualStateExciseRevenue: number;
  readonly annualStateSalesTaxRevenue: number;
  readonly annualStateRevenue: number;
}

/**
 * Shared accounting used by the monthly budget reader.
 * Missing sources fail explicitly. No draws, invented response curves, outcome
 * bounds or calibration clamp. Sources distinguish observed and estimated inputs.
 */
export function cannabisRetailRevenue(
  input: CannabisRetailMechanismInputs,
): CannabisRetailMechanismReading {
  for (const [name, value] of Object.entries(input.sources)) {
    if (!value.trim()) throw new Error(`Missing cannabis source: ${name}`);
  }
  for (const name of [
    "adultResidents",
    "annualPretaxSpendingPerBuyer",
  ] as const) {
    if (!Number.isFinite(input[name]) || input[name] < 0)
      throw new Error(`Invalid cannabis input: ${name}`);
  }
  for (const name of [
    "buyerShare",
    "legalMarketShare",
    "exciseRate",
    "stateSalesTaxRate",
  ] as const) {
    if (!Number.isFinite(input[name]) || input[name] < 0 || input[name] > 1)
      throw new Error(`Invalid cannabis input: ${name}`);
  }
  const annualPotentialPretaxSpending =
    input.adultResidents *
    input.buyerShare *
    input.annualPretaxSpendingPerBuyer;
  const annualLegalPretaxSales =
    annualPotentialPretaxSpending * input.legalMarketShare;
  const annualStateExciseRevenue = annualLegalPretaxSales * input.exciseRate;
  const salesTaxBase = input.salesTaxIncludesExcise
    ? annualLegalPretaxSales + annualStateExciseRevenue
    : annualLegalPretaxSales;
  const annualStateSalesTaxRevenue = salesTaxBase * input.stateSalesTaxRate;
  return {
    annualPotentialPretaxSpending,
    annualLegalPretaxSales,
    annualStateExciseRevenue,
    annualStateSalesTaxRevenue,
    annualStateRevenue: annualStateExciseRevenue + annualStateSalesTaxRevenue,
  };
}

function enactedCannabisRevenue(
  world: World,
  government: Pick<PublicBudgetGovernment, "lawJurisdictionId" | "population">,
  law: LawInForce,
  date: IsoDate,
): number | null {
  // Budget projections may ask about a later month. The final-term query still
  // filters every provision/enactment to that month's saved effective date.
  const datedWorld =
    date > world.currentDate ? { ...world, currentDate: date } : world;
  const numeric = readFinalEnactedLawTerm(datedWorld, law, {
    questionKey: CANNABIS_TAX_EFFECT.questionKey,
    termKey: "tax-rate",
    unit: "ratio",
    onDate: date,
  });
  const proposal = (world.history.taxProposals ?? []).find(
    (row) =>
      row.measureId === law.measureId &&
      row.jurisdictionId === government.lawJurisdictionId,
  );
  const saved = cannabisTaxTermsForLaw(
    world,
    law,
    government.lawJurisdictionId,
    proposal?.terms ?? null,
    date,
  );
  const enactment = finalTermEnactment(
    datedWorld,
    law,
    CANNABIS_TAX_EFFECT.questionKey,
    date,
  );
  const hasExplicitRate =
    enactment &&
    finalTermProvisions(
      datedWorld,
      law.measureId,
      enactment.sequence,
      date,
    ).some((provision) =>
      (provision.lawTerms ?? []).some(
        (term) =>
          term.questionKey === CANNABIS_TAX_EFFECT.questionKey &&
          term.key === "tax-rate",
      ),
    );
  // Estimates fill absent data only; an invalid or conflicting adopted levy
  // must never silently become the median tax rate.
  if (
    (!numeric && hasExplicitRate) ||
    (!numeric && proposal && saved.status !== "operative")
  )
    return null;
  const rate =
    numeric?.value ??
    (saved.status === "operative"
      ? saved.rateNumerator / saved.rateDenominator
      : market.exciseRate.value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null;
  return cannabisRetailRevenue({
    adultResidents: government.population * market.adultPopulationShare.value,
    buyerShare: market.pastMonthUseShare.value,
    annualPretaxSpendingPerBuyer: market.monthlySpendingPerUser.value * 12,
    legalMarketShare: 1,
    exciseRate: rate,
    // Ordinary sales tax has its own budget path; this is the adopted retail levy.
    stateSalesTaxRate: 0,
    salesTaxIncludesExcise: false,
    sources: {
      lawTerms:
        numeric?.sourceRecordIds.join("|") ??
        (saved.status === "operative"
          ? saved.sourceRecordIds.join("|")
          : market.exciseRate.estimatedFrom),
      adultBuyerBase: `${market.adultPopulationShare.estimatedFrom}; ${market.pastMonthUseShare.estimatedFrom}`,
      spending: market.monthlySpendingPerUser.estimatedFrom,
      legalMarketShare: market.legalRetailBase.estimatedFrom,
    },
  }).annualStateRevenue;
}
