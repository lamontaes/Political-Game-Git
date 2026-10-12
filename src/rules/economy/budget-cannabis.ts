/** Full retained cannabis budget law/binding/retail mechanism. Raw records and separately owned numeric law-term receipts; no sale or remittance is invented. */
import { makeIsoDate } from "../../simulation/dates";
import { recordById } from "./raw-record-index";
import { canonicalJson } from "../../simulation/canonical-json";
import { effectiveTaxPolicy as policyOf } from "../laws/tax-preview";
import {
  lawInForce as lawOf,
  lawInForceAtStart as startOf,
  type LawInForce,
} from "../laws/dated-law";
import { measureAnswersAt as answersOf } from "../laws/bill-answers";
import { legalTermReceiptKey } from "../laws/minimum-authority";
import {
  propositionIdFor as propositionOf,
  type BudgetFiscalFacts,
} from "./budget-fiscal";
import { CANNABIS_TAX_EFFECT, TAX_QUESTION_EFFECTS } from "./budget-tax-policy";
import type { TaxTerms } from "../../simulation/tax-types";
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  World,
  LegislativeProvisionRecord,
} from "../../simulation/types";
import type { PublicBudgetGovernment } from "../../simulation/public-budgets/store";
import type { readFinalEnactedLawTerm as nativeTerm } from "../../simulation/governing/final-law-term-query";
import type marketSource from "../../../data/research/money/cannabis-retail-market.json";
export interface CannabisBudgetFacts {
  readonly onDate: IsoDate;
  readonly records: Pick<
    World["history"],
    | "taxProposals"
    | "taxPolicies"
    | "legislativeMeasures"
    | "legislativeEnactments"
    | "legislativeProvisions"
    | "itemVetoes"
    | "nextSequence"
  >;
  readonly catalog: World["policyCatalog"];
  readonly fiscal: BudgetFiscalFacts;
  readonly market: typeof marketSource;
}
function lawInForce(
  facts: CannabisBudgetFacts,
  ...args: Parameters<typeof lawOf> extends [unknown, ...infer R] ? R : never
) {
  return lawOf({ ...facts.fiscal.laws, onDate: facts.onDate }, ...args);
}
function lawInForceAtStart(
  facts: CannabisBudgetFacts,
  ...args: Parameters<typeof startOf> extends [unknown, ...infer R] ? R : never
) {
  return startOf({ ...facts.fiscal.laws, onDate: facts.onDate }, ...args);
}
function propositionIdFor(facts: CannabisBudgetFacts, key: string) {
  return propositionOf(facts.fiscal, key);
}
function effectiveTaxPolicy(
  facts: CannabisBudgetFacts,
  id: EntityId,
  series: string,
  date: IsoDate,
) {
  return policyOf(
    {
      onDate: facts.onDate,
      policies: facts.records.taxPolicies ?? [],
      proposals: facts.records.taxProposals ?? [],
    },
    id,
    series,
    date,
  );
}
function measureAnswersAt(
  facts: CannabisBudgetFacts,
  id: EntityId,
  sequence: number,
) {
  return answersOf(
    {
      nextSequence: facts.records.nextSequence,
      measures: facts.records.legislativeMeasures ?? [],
      provisions: facts.records.legislativeProvisions ?? [],
      itemVetoes: facts.records.itemVetoes ?? [],
    },
    id,
    sequence,
  );
}
function readFinalEnactedLawTerm(
  facts: CannabisBudgetFacts,
  law: LawInForce,
  query: Parameters<typeof nativeTerm>[2],
) {
  const key = legalTermReceiptKey(law, query);
  if (!facts.fiscal.finalTerms.has(key))
    throw Error("Missing cannabis numeric law receipt: " + key);
  return facts.fiscal.finalTerms.get(key) ?? null;
}
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
  readonly annualRevenueDelta: number;
  readonly sourceMeasureId: EntityId | null;
}
export function cannabisSalesRevenueChange(
  facts: CannabisBudgetFacts,
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
    facts,
    CANNABIS_TAX_EFFECT.questionKey,
  );
  if (!propositionId) return unchanged("question-not-present");
  const began = lawInForceAtStart(
    facts,
    government.lawJurisdictionId,
    propositionId,
    date,
  );
  if (began === null) return unchanged("starting-law-not-established");
  const current = lawInForce(
    facts,
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
    facts,
    government.lawJurisdictionId,
    propositionId,
    retailDate,
  );
  if (prior?.answer !== "yes") return unchanged("waiting-for-retail");
  const annualRevenue = enactedCannabisRevenue(
    facts,
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
// stopgapId: "economy.cannabis-term-validation-frontier"
export function cannabisTaxTermsForLaw(
  facts: CannabisBudgetFacts,
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
    facts,
    jurisdictionId,
    binding.seriesKey,
    asOf,
  );
  if (!policy || policy.recordedAt > asOf)
    return missing("tax-policy-not-operative");
  const proposal = recordById(
    facts.records.taxProposals ?? [],
    policy.proposalId,
  );
  const enactment = recordById(
    facts.records.legislativeEnactments ?? [],
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
    ...facts,
    history: {
      ...facts.records,
      legislativeProvisions: facts.records.legislativeProvisions?.filter(
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
export interface CannabisRetailMechanismInputs {
  readonly adultResidents: number;
  readonly buyerShare: number;
  readonly annualPretaxSpendingPerBuyer: number;
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
// stopgapId: "economy.cannabis-retail-market-projection"
function enactedCannabisRevenue(
  facts: CannabisBudgetFacts,
  government: Pick<PublicBudgetGovernment, "lawJurisdictionId" | "population">,
  law: LawInForce,
  date: IsoDate,
): number | null {
  const datedWorld = date > facts.onDate ? { ...facts, onDate: date } : facts;
  const numeric = readFinalEnactedLawTerm(datedWorld, law, {
    questionKey: CANNABIS_TAX_EFFECT.questionKey,
    termKey: "tax-rate",
    unit: "ratio",
    onDate: date,
  });
  const proposal = (facts.records.taxProposals ?? []).find(
    (row) =>
      row.measureId === law.measureId &&
      row.jurisdictionId === government.lawJurisdictionId,
  );
  const saved = cannabisTaxTermsForLaw(
    facts,
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
  if (
    (!numeric && hasExplicitRate) ||
    (!numeric && proposal && saved.status !== "operative")
  )
    return null;
  const rate =
    numeric?.value ??
    (saved.status === "operative"
      ? saved.rateNumerator / saved.rateDenominator
      : facts.market.exciseRate.value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null;
  return cannabisRetailRevenue({
    adultResidents:
      government.population * facts.market.adultPopulationShare.value,
    buyerShare: facts.market.pastMonthUseShare.value,
    annualPretaxSpendingPerBuyer:
      facts.market.monthlySpendingPerUser.value * 12,
    legalMarketShare: 1,
    exciseRate: rate,
    stateSalesTaxRate: 0,
    salesTaxIncludesExcise: false,
    sources: {
      lawTerms:
        numeric?.sourceRecordIds.join("|") ??
        (saved.status === "operative"
          ? saved.sourceRecordIds.join("|")
          : facts.market.exciseRate.estimatedFrom),
      adultBuyerBase: `${facts.market.adultPopulationShare.estimatedFrom}; ${facts.market.pastMonthUseShare.estimatedFrom}`,
      spending: facts.market.monthlySpendingPerUser.estimatedFrom,
      legalMarketShare: facts.market.legalRetailBase.estimatedFrom,
    },
  }).annualStateRevenue;
}
export function finalTermEnactment(
  facts: CannabisBudgetFacts,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate = facts.onDate,
  cutoff?: HistoricalCutoff,
) {
  if (law.origin !== "enacted" || law.operativeAt > onDate) return null;
  const enactment = (facts.records.legislativeEnactments ?? []).find(
    (row) =>
      row.measureId === law.measureId &&
      row.outcome === "enacted" &&
      row.resolvedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.resolvedAt <= cutoff.asOfDate)),
  );
  return enactment &&
    measureAnswersAt(facts, law.measureId, enactment.sequence).some(
      (answer) =>
        facts.catalog.propositions[answer.propositionId]?.stableKey ===
          questionKey && answer.answer === law.answer,
    )
    ? enactment
    : null;
}
export function finalTermProvisions(
  facts: CannabisBudgetFacts,
  measureId: EntityId,
  throughSequence = Infinity,
  onDate: IsoDate = facts.onDate,
  cutoff?: HistoricalCutoff,
) {
  const versions = (facts.records.legislativeProvisions ?? []).filter(
    (row) =>
      row.measureId === measureId &&
      row.sequence <= throughSequence &&
      row.recordedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.recordedAt <= cutoff.asOfDate)),
  );
  const replaced = new Set(
    versions.flatMap((row) =>
      row.supersedesProvisionId ? [row.supersedesProvisionId] : [],
    ),
  );
  return versions.filter((row) => !replaced.has(row.id));
}
export function measureProvisions(
  facts: CannabisBudgetFacts,
  measureId: EntityId,
): readonly LegislativeProvisionRecord[] {
  return (facts.records.legislativeProvisions ?? [])
    .filter((record) => record.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}
export function currentMeasureProvisions(
  facts: CannabisBudgetFacts,
  measureId: EntityId,
): readonly LegislativeProvisionRecord[] {
  const all = measureProvisions(facts, measureId);
  const superseded = new Set(
    all.flatMap((record) =>
      record.supersedesProvisionId ? [record.supersedesProvisionId] : [],
    ),
  );
  return all
    .filter((record) => !superseded.has(record.id))
    .slice()
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}
// stopgapId: "economy.monthly-budget-native-English"
export function taxLevyText(terms: TaxTerms): string {
  if (
    terms.baseUnit ||
    terms.instrument === "corporate-income" ||
    terms.instrument === "wage-income"
  )
    return canonicalJson(terms);
  const effectiveDelayDays = terms.effectiveDelayDays ?? 90;
  const effectiveDelay =
    effectiveDelayDays === 90 ? "ninety days" : `${effectiveDelayDays} days`;
  const legalAssumption =
    terms.legalBaselineAssumption === "carry-forward-acquired-baseline-in-game"
      ? "Game-only legal assumption: carry the acquired constitutional baseline forward until a supported canonical amendment changes it; no future real-world legal continuity is asserted."
      : "Game-only authority assumption: this fictional, versioned state profile supplies the modeled tax authority; it makes no claim about current state law or acquired source evidence.";
  const effectiveRule =
    terms.legalBaselineAssumption === "authored-state-game-profile"
      ? `This tax takes effect no earlier than ${effectiveDelay} after enactment or the law's own effective date, whichever is later.`
      : `This tax takes effect ${effectiveDelay} after enactment.`;
  const kind =
    terms.instrument === "property"
      ? "property tax"
      : terms.instrument === "sales"
        ? "sales tax"
        : terms.instrument === "payroll"
          ? "payroll tax"
          : terms.instrument === "corporate-income"
            ? "corporate income tax"
            : "selective excise";
  return `An authored ${kind} at ${terms.rateNumerator}/${terms.rateDenominator} of the declared ${terms.baseLabel} base is imposed for ${terms.publicPurpose}. Excluded base classes: ${terms.exemptBaseKeys.join(", ") || "none additional"}. Allowance: ${terms.allowanceMinorUnits} ${terms.currency} minor units per modeled occurrence. ${effectiveRule} Settlement is due ${terms.collectionLagDays} days after each taxable occurrence and receipts enter the general public account. ${TAX_MODEL_NOTE} ${legalAssumption} ${terms.assumptionNote}`;
}

export const TAX_MODEL_NOTE =
  "Authored game model: the declared taxable occurrence and allowance are assumptions. Tax settlement is compressed into one payer-to-public transfer on the declared due event; no merchant cash, real tax return, interest, penalty, behavioral response or observed forecast is inferred.";
