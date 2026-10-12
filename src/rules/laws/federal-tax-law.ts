import type { EntityId, IsoDate } from "../../simulation/types";
import type {
  FilingStatus,
  IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import type { readFinalEnactedLawTerm as NativeTerm } from "../../simulation/governing/final-law-term-query";
import { lawInForce, type LawFacts, type LawInForce } from "./dated-law";
import {
  federalIncomeTaxScheduleFromFacts,
  type FederalIncomeTaxScheduleRecord,
} from "./federal-income-tax-schedule";
import { scheduleWithTopRate } from "./income-tax-schedule";
import { finalTermReceiptKey } from "./tax-law-schedules";
export interface FederalTaxFacts extends LawFacts {
  readonly federalSchedules: {
    readonly records: readonly FederalIncomeTaxScheduleRecord<FilingStatus>[];
    readonly estimate: { readonly estimatedFrom: string };
  };
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof NativeTerm>>;
}
function readFinalEnactedLawTerm(
  facts: FederalTaxFacts,
  law: LawInForce,
  query: Parameters<typeof NativeTerm>[2],
) {
  return (
    facts.finalTerms.get(finalTermReceiptKey(law.measureId, query)) ?? null
  );
}
export const RAISE_TOP_FEDERAL_RATE_QUESTION =
  "us-federal-positions:tax.raise-top-income-tax-rate";

export interface FederalIncomeTaxUnderLaw {
  readonly schedule: IncomeTaxSchedule | null;
  readonly governingLaw: LawInForce | null;
  readonly lawMeasureIds: readonly EntityId[];
}

export function federalIncomeTaxUnderLaw(
  facts: FederalTaxFacts,
  status: FilingStatus,
  paidAt: IsoDate,
): FederalIncomeTaxUnderLaw {
  const begun = federalIncomeTaxScheduleFromFacts(
    status,
    paidAt,
    facts.federalSchedules.records,
    facts.federalSchedules.estimate.estimatedFrom,
  ) as IncomeTaxSchedule;
  const proposition = Object.values(
    facts.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === RAISE_TOP_FEDERAL_RATE_QUESTION,
  );
  if (!begun || !proposition)
    return { schedule: begun, governingLaw: null, lawMeasureIds: [] };
  const law = lawInForce(
    facts,
    facts.federalId,
    proposition.id,
    `${paidAt.slice(0, 4)}-01-01` as IsoDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted")
    return { schedule: begun, governingLaw: null, lawMeasureIds: [] };
  const rate =
    law.answer === "yes"
      ? readFinalEnactedLawTerm(facts, law, {
          questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
          termKey: "rate",
          unit: "ratio",
          onDate: `${paidAt.slice(0, 4)}-01-01` as IsoDate,
        })
      : null;
  const supported =
    rate &&
    rate.value >= 0 &&
    rate.value <= 1 &&
    Number.isSafeInteger(Math.round(rate.value * 10000)) &&
    Math.round(rate.value * 10000) / 10000 === rate.value;
  return {
    schedule:
      law.answer === "yes"
        ? supported
          ? scheduleWithTopRate(begun, Math.round(rate.value * 10000))
          : null
        : begun,
    lawMeasureIds: [law.measureId],
    governingLaw: law,
  };
}
