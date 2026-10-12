/** Frozen KEEP tax-year selection, final-term support guards and peer-estimation closure. Exact law and term readers are separate receipts, not invented tax levels. */
import type { EntityId, IsoDate } from "../../simulation/types";
import type {
  FilingStatus,
  IncomeTaxBracket,
  IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import type {
  readFinalEnactedLawTerm as NativeTerm,
  readFinalEnactedLawSchedule as NativeSchedule,
} from "../../simulation/governing/final-law-term-query";
import { lawInForce, type LawInForce, type LawFacts } from "./dated-law";
import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "./income-tax-estimation";
import { STATE_FILING_STATUS_NOTE } from "./withholding-facts";
import { stateIncomeTaxScheduleFromSingleFact as stateScheduleForFilingStatus } from "./state-income-tax-schedule";
import { annualTaxMinor as annualTax } from "./income-tax-calculation";
export interface TaxLawFacts extends LawFacts {
  readonly places: Readonly<Record<string, StatePlace>>;
  readonly householdIncomes: Readonly<Record<string, number>>;
  readonly regions: ReadonlyMap<string, string>;
  readonly sourceUrl: string;
  readonly governingJurisdictions: ReadonlyMap<
    string,
    { readonly id: EntityId }
  >;
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof NativeTerm>>;
  readonly finalSchedules: ReadonlyMap<
    string,
    ReturnType<typeof NativeSchedule>
  >;
}
export function finalTermReceiptKey(
  measureId: EntityId,
  query: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly onDate?: IsoDate;
    readonly unit?: string;
  },
) {
  return JSON.stringify([
    measureId,
    query.questionKey,
    query.termKey,
    query.unit,
    query.onDate,
  ]);
}
function readFinalEnactedLawTerm(
  facts: TaxLawFacts,
  law: LawInForce,
  query: Parameters<typeof NativeTerm>[2],
) {
  return (
    facts.finalTerms.get(finalTermReceiptKey(law.measureId, query)) ?? null
  );
}
function readFinalEnactedLawSchedule(
  facts: TaxLawFacts,
  law: LawInForce,
  query: Parameters<typeof NativeSchedule>[2],
) {
  return (
    facts.finalSchedules.get(finalTermReceiptKey(law.measureId, query)) ?? null
  );
}
export const ADOPT_STATE_INCOME_TAX_QUESTION =
  "us-policy-positions:fiscal.adopt-income-tax";

export const GRADUATED_STATE_INCOME_TAX_QUESTION =
  "us-policy-positions:fiscal.graduated-income-tax";

type TaxShape = "flat" | "graduated";

interface StatePlace {
  readonly wageIncomeTax: string;
  readonly brackets: readonly {
    readonly ratePercent: number;
    readonly overSingle: number;
  }[];
  readonly standardDeductionSingle: number | null;
}

export type StateIncomeTaxUnderLaw =
  | {
      readonly kind: "as-begun";
    }
  | {
      readonly kind: "repealed";
      readonly lawMeasureIds: readonly EntityId[];
    }
  | {
      readonly kind: "enacted";
      readonly shape: TaxShape;
      readonly lawMeasureIds: readonly EntityId[];
      readonly schedule: IncomeTaxSchedule;
      readonly estimatedFromAverage?: string;
    }
  | {
      readonly kind: "estimated";
      readonly shape: TaxShape;
      readonly lawMeasureIds: readonly EntityId[];
      readonly schedule: IncomeTaxSchedule;
      readonly estimatedFromAverage: string;
    };

export function stateIncomeTaxUnderLaw(
  facts: TaxLawFacts,
  stateKey: string,
  status: FilingStatus,
  paidAt: IsoDate,
): StateIncomeTaxUnderLaw {
  const place = facts.places[stateKey];
  const state = facts.governingJurisdictions.get(stateKey.slice(3));
  if (!place || !state) return { kind: "as-begun" };
  const taxYearStart = `${paidAt.slice(0, 4)}-01-01` as IsoDate;
  const adopt = governingLaw(
    facts,
    state.id,
    ADOPT_STATE_INCOME_TAX_QUESTION,
    taxYearStart,
  );
  const shapeLaw = governingLaw(
    facts,
    state.id,
    GRADUATED_STATE_INCOME_TAX_QUESTION,
    taxYearStart,
  );
  const graduated = shapeLaw?.origin === "enacted" ? shapeLaw : null;
  const begunShape: TaxShape | null =
    place.wageIncomeTax === "flat" || place.wageIncomeTax === "graduated"
      ? place.wageIncomeTax
      : null;
  if (adopt?.answer === "no")
    return begunShape
      ? { kind: "repealed", lawMeasureIds: [adopt.measureId] }
      : { kind: "as-begun" };
  const adopted = adopt?.answer === "yes" && !begunShape;
  if (!adopted && !begunShape) return { kind: "as-begun" };
  const shape: TaxShape = graduated
    ? graduated.answer === "yes"
      ? "graduated"
      : "flat"
    : (begunShape ?? "graduated");
  let tableLaw =
    graduated?.answer === "yes"
      ? graduated
      : shapeLaw?.answer === "yes" &&
          shape === "graduated" &&
          adopt?.origin !== "enacted"
        ? shapeLaw
        : adopt;
  let table =
    tableLaw && (tableLaw.origin === "enacted" || shape === begunShape)
      ? readFinalEnactedLawSchedule(facts, tableLaw, {
          questionKey:
            tableLaw === shapeLaw
              ? GRADUATED_STATE_INCOME_TAX_QUESTION
              : ADOPT_STATE_INCOME_TAX_QUESTION,
          termKey: tableLaw === shapeLaw ? "brackets" : "rate",
          onDate: taxYearStart,
        })
      : null;
  if (!table && adopt?.origin === "in-force-at-start" && shape === begunShape) {
    tableLaw = adopt;
    table = readFinalEnactedLawSchedule(facts, adopt, {
      questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
      termKey: "rate",
      onDate: taxYearStart,
    });
  }
  if (table?.term.kind === "income-tax")
    return {
      kind: "enacted",
      shape,
      lawMeasureIds: [
        ...new Set([
          tableLaw!.measureId,
          ...(adopt?.answer === "yes" ? [adopt.measureId] : []),
          ...(graduated?.answer === "yes" ? [graduated.measureId] : []),
        ]),
      ],
      schedule: stateScheduleForFilingStatus(table.term.schedule, status),
    };
  const flatRate =
    adopt?.answer === "yes"
      ? readFinalEnactedLawTerm(facts, adopt, {
          questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
          termKey: "rate",
          unit: "ratio",
          onDate: taxYearStart,
        })
      : null;
  const threshold =
    adopt?.answer === "yes"
      ? readFinalEnactedLawTerm(facts, adopt, {
          questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
          termKey: "threshold",
          unit: "minor",
          onDate: taxYearStart,
        })
      : null;
  const flatRateBasisPoints = flatRate
    ? Math.round(flatRate.value * 10000)
    : null;
  if (
    flatRate &&
    threshold &&
    flatRate.value >= 0 &&
    flatRate.value <= 1 &&
    flatRateBasisPoints !== null &&
    Number.isSafeInteger(flatRateBasisPoints) &&
    flatRateBasisPoints / 10000 === flatRate.value &&
    Number.isSafeInteger(threshold.value) &&
    threshold.value >= 0 &&
    graduated?.answer !== "yes"
  ) {
    const deduction = estimatedSchedule(
      facts,
      stateKey,
      "flat",
      place.standardDeductionSingle,
    );
    return {
      kind: "enacted",
      shape: "flat",
      lawMeasureIds: [
        adopt!.measureId,
        ...(graduated ? [graduated.measureId] : []),
      ],
      schedule: stateScheduleForFilingStatus(
        {
          ...deduction.schedule,
          brackets: [
            ...(threshold.value > 0
              ? [{ overMinor: 0, rateBasisPoints: 0 }]
              : []),
            {
              overMinor: threshold.value,
              rateBasisPoints: flatRateBasisPoints,
            },
          ],
        },
        status,
      ),
      ...(place.standardDeductionSingle === null
        ? {
            estimatedFromAverage:
              `ESTIMATED FROM AVERAGE: only the single-filer deduction of $${(deduction.schedule.standardDeductionMinor / 100).toLocaleString("en-US")} uses the existing ranked sourced peers. The rate and annual taxable-income threshold are the law's recorded terms. ${status === "single" ? "" : STATE_FILING_STATUS_NOTE[status]}`.trim(),
          }
        : {}),
    };
  }
  if (!adopted && shape === begunShape) return { kind: "as-begun" };
  const lawMeasureIds = [
    ...(adopted && adopt ? [adopt.measureId] : []),
    ...(graduated ? [graduated.measureId] : []),
  ];
  const estimate = estimatedSchedule(
    facts,
    stateKey,
    shape,
    place.standardDeductionSingle,
  );
  return {
    kind: "estimated",
    shape,
    lawMeasureIds,
    schedule: stateScheduleForFilingStatus(estimate.schedule, status),
    estimatedFromAverage:
      status === "single"
        ? estimate.note
        : `${estimate.note} ${STATE_FILING_STATUS_NOTE[status]}`,
  };
}

function governingLaw(
  facts: TaxLawFacts,
  stateJurisdictionId: EntityId,
  questionKey: string,
  onDate: IsoDate,
): LawInForce | null {
  const proposition = Object.values(
    facts.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === questionKey);
  if (!proposition) return null;
  return lawInForce(facts, stateJurisdictionId, proposition.id, onDate, "all");
}

const bracketsOf = (place: StatePlace): IncomeTaxBracket[] =>
  place.brackets.map((bracket) => ({
    overMinor: bracket.overSingle * 100,
    rateBasisPoints: Math.round(bracket.ratePercent * 100),
  }));

// stopgapId: "laws.state-tax-graduated-grid"
const GRADUATED_STEPS_DOLLARS = [
  0, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 80000, 100000, 150000,
  200000, 300000, 500000, 1000000,
];

interface ScheduleReference {
  readonly stateKey: string;
  readonly place: StatePlace;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}

function scheduleReferences(
  facts: TaxLawFacts,
  stateKey: string,
  shape: TaxShape,
): readonly ScheduleReference[] {
  const income = facts.householdIncomes[stateKey];
  const region =
    income === undefined ? null : facts.regions.get(stateKey.slice(3));
  const compare = (
    a: Omit<ScheduleReference, "rank" | "weight">,
    b: Omit<ScheduleReference, "rank" | "weight">,
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = Object.entries(facts.places).flatMap(([key, place]) =>
    place.wageIncomeTax === shape &&
    (income === undefined || facts.householdIncomes[key] !== undefined)
      ? [
          {
            stateKey: key,
            place,
            sameRegion:
              income !== undefined &&
              facts.regions.get(key.slice(3)) === region,
            incomeDistanceDollars:
              income === undefined
                ? 0
                : Math.abs(facts.householdIncomes[key]! - income),
          },
        ]
      : [],
  );
  return reciprocalRankedReferences(candidates, compare, (row) => row.stateKey);
}

function estimatedSchedule(
  facts: TaxLawFacts,
  stateKey: string,
  shape: TaxShape,
  ownDeductionDollars: number | null,
): {
  readonly schedule: IncomeTaxSchedule;
  readonly note: string;
} {
  const references = scheduleReferences(facts, stateKey, shape);
  if (references.length === 0)
    throw new Error("No sourced state income-tax schedules for this shape.");
  const deductions = references.filter(
    (reference) => reference.place.standardDeductionSingle !== null,
  );
  if (ownDeductionDollars === null && deductions.length === 0)
    throw new Error("No sourced deductions for the state income-tax estimate.");
  const deductionDollars =
    ownDeductionDollars ??
    Math.round(
      weightedReferenceMean(
        deductions,
        (reference) => reference.place.standardDeductionSingle!,
      ),
    );
  const weightedTaxMinor = (dollars: number) =>
    weightedReferenceMean(references, (reference) =>
      annualTax(dollars * 100, bracketsOf(reference.place)),
    );
  const brackets: readonly IncomeTaxBracket[] =
    shape === "flat"
      ? [
          {
            overMinor: 0,
            rateBasisPoints: Math.round(
              weightedReferenceMean(
                references,
                (reference) => reference.place.brackets[0]!.ratePercent,
              ) * 100,
            ),
          },
        ]
      : GRADUATED_STEPS_DOLLARS.map((dollars, index) => {
          const next = GRADUATED_STEPS_DOLLARS[index + 1];
          return {
            overMinor: dollars * 100,
            rateBasisPoints:
              next === undefined
                ? Math.round(
                    weightedReferenceMean(
                      references,
                      (reference) =>
                        reference.place.brackets.at(-1)!.ratePercent,
                    ) * 100,
                  )
                : Math.round(
                    ((weightedTaxMinor(next) - weightedTaxMinor(dollars)) /
                      ((next - dollars) * 100)) *
                      10000,
                  ),
          };
        });
  const deductionNote =
    ownDeductionDollars === null
      ? `a standard deduction of $${deductionDollars.toLocaleString("en-US")} from ${deductions.length} peers with read deductions`
      : `the state's own standard deduction of $${deductionDollars.toLocaleString("en-US")}`;
  const ranking =
    facts.householdIncomes[stateKey] === undefined
      ? "same-shape plain mean because the target household income is unread"
      : "same tax shape, then Census region and household-income distance; authored reciprocal-rank weights";
  const estimate = {
    schedule: {
      standardDeductionMinor: deductionDollars * 100,
      brackets,
      sourceUrl: facts.sourceUrl,
    },
    note: `ESTIMATED FROM AVERAGE: ${references.length} states with ${shape} rates, ${ranking}, and ${deductionNote}. References: ${references.map((reference) => `${reference.stateKey} weight ${reference.weight}`).join(", ")}. Source: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026; Census CPS 2023 Table H-8. This estimate is not a rate written in the bill.`,
  };
  return estimate;
}
