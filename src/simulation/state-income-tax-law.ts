/**
 * What a state's income tax law in force does to a paycheck.
 *
 * Two policy questions reach the paycheck: "Should the state levy a personal
 * income tax?" (`fiscal.adopt-income-tax`) and "Should the state have a
 * graduated income tax?" (`fiscal.graduated-income-tax`). The 2026 schedules
 * in `state-income-tax-2026.json` already carry the law each state began
 * with. Structured flat starting-law terms reach that same calculator;
 * a law enacted in play can then change it:
 * 1. a repeal ("no" on the first question) where the state taxes wages ends
 *    the state's withholding;
 * 2. an adoption ("yes") where the state has no wage income tax starts one;
 * 3. a change of shape (the second question) where the state taxes wages
 *    moves it between one flat rate and graduated brackets.
 *
 * Game rules, labeled:
 * - A law governs the tax year it is in force on January 1, so a law that
 *   takes effect during a year applies from the next one: withholding tables
 *   change by tax year.
 * - An adopted flat rate and annual taxable-income threshold govern when
 *   both are recorded in the final bill. Otherwise a new or reshaped tax is
 *   ESTIMATED FROM AVERAGE: the average of the states that have that kind of
 *   tax in the Tax Foundation's 2026 tables, ranked by Census region and
 *   sourced household-income distance with the approved reciprocal-rank
 *   estimation rule. The world seed never changes a rate or deduction.
 * - A newly adopted tax with no law on its shape is graduated, because most
 *   states that tax wages (27 of 42 in the tables) use brackets.
 * - A state that reshapes its tax keeps its own read standard deduction; a
 *   state with none read takes the ranked peers' read deductions.
 * - Only single filers' schedules have been read. A joint return takes the
 *   single schedule with its brackets and deduction doubled, and a head of
 *   household files on the single schedule: the most common state rules,
 *   not yet counted state by state, so the label says so.
 */
import stateIncomeTax2026 from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import stateHouseholdIncome2023 from "../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import {
  annualTax,
  reciprocalRankedReferences,
  weightedReferenceMean,
  STATE_FILING_STATUS_NOTE,
  stateScheduleForFilingStatus,
  type FilingStatus,
  type IncomeTaxBracket,
  type IncomeTaxSchedule,
} from "./income-tax-withholding";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import type { EntityId, IsoDate, World } from "./types";
import { censusRegionOf } from "./world-setup/census-regions";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";

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

const STATE_SOURCE = stateIncomeTax2026.source.url;
const STATE_PLACES = stateIncomeTax2026.places as Readonly<
  Record<string, StatePlace>
>;

export type StateIncomeTaxUnderLaw =
  /** No law enacted in play changes this state's tax: read the 2026 tables. */
  | { readonly kind: "as-begun" }
  /** A law enacted in play ended the state's wage income tax. */
  | { readonly kind: "repealed"; readonly lawMeasureIds: readonly EntityId[] }
  /** Recorded starting/adopted numeric terms; an unread deduction can be estimated. */
  | {
      readonly kind: "enacted";
      readonly shape: "flat";
      readonly lawMeasureIds: readonly EntityId[];
      readonly schedule: IncomeTaxSchedule;
      readonly estimatedFromAverage?: string;
    }
  /** A law enacted in play started or reshaped the tax; rates estimated. */
  | {
      readonly kind: "estimated";
      readonly shape: TaxShape;
      readonly lawMeasureIds: readonly EntityId[];
      readonly schedule: IncomeTaxSchedule;
      readonly estimatedFromAverage: string;
    };

/**
 * The state's wage income tax for a paycheck paid on `paidAt` to a resident
 * of `stateKey` (`US-XX`) filing as `status`.
 */
export function stateIncomeTaxUnderLaw(
  world: World,
  stateKey: string,
  status: FilingStatus,
  paidAt: IsoDate,
): StateIncomeTaxUnderLaw {
  const place = STATE_PLACES[stateKey];
  const state = chiefExecutiveJurisdiction(stateKey.slice(3));
  if (!place || !state) return { kind: "as-begun" };
  const taxYearStart = `${paidAt.slice(0, 4)}-01-01` as IsoDate;
  const adopt = governingLaw(
    world,
    state.id,
    ADOPT_STATE_INCOME_TAX_QUESTION,
    taxYearStart,
  );
  const graduated = governingLaw(
    world,
    state.id,
    GRADUATED_STATE_INCOME_TAX_QUESTION,
    taxYearStart,
  );
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
  const flatRate =
    adopt?.answer === "yes"
      ? readFinalEnactedLawTerm(world, adopt, {
          questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
          termKey: "rate",
          unit: "ratio",
          onDate: taxYearStart,
        })
      : null;
  const threshold =
    adopt?.answer === "yes"
      ? readFinalEnactedLawTerm(world, adopt, {
          questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
          termKey: "threshold",
          unit: "minor",
          onDate: taxYearStart,
        })
      : null;
  const flatRateBasisPoints = flatRate
    ? Math.round(flatRate.value * 10_000)
    : null;
  // One numeric rate cannot represent an explicitly graduated schedule.
  // Missing, conflicting or wrong-unit terms retain the labeled fallback.
  // Round-trip the ratio: binary multiplication must not turn an exact 7%
  // bill into a peer estimate, and finer-than-basis-point rates stay unsupported.
  if (
    flatRate &&
    threshold &&
    flatRate.value >= 0 &&
    flatRate.value <= 1 &&
    flatRateBasisPoints !== null &&
    Number.isSafeInteger(flatRateBasisPoints) &&
    flatRateBasisPoints / 10_000 === flatRate.value &&
    Number.isSafeInteger(threshold.value) &&
    threshold.value >= 0 &&
    graduated?.answer !== "yes"
  ) {
    const deduction = estimatedSchedule(
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

/** The dated law, including structured terms in the canonical starting row. */
function governingLaw(
  world: World,
  stateJurisdictionId: EntityId,
  questionKey: string,
  onDate: IsoDate,
): LawInForce | null {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === questionKey);
  if (!proposition) return null;
  return lawInForce(world, stateJurisdictionId, proposition.id, onDate, "all");
}

const bracketsOf = (place: StatePlace): IncomeTaxBracket[] =>
  place.brackets.map((bracket) => ({
    overMinor: bracket.overSingle * 100,
    rateBasisPoints: Math.round(bracket.ratePercent * 100),
  }));

/**
 * Taxable incomes, in dollars, where the average graduated schedule changes
 * rate. Between two of them the average state's tax rises in a straight line,
 * which is what a bracket is.
 */
const GRADUATED_STEPS_DOLLARS = [
  0, 5_000, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000, 80_000, 100_000,
  150_000, 200_000, 300_000, 500_000, 1_000_000,
];
interface ScheduleReference {
  readonly stateKey: string;
  readonly place: StatePlace;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}

const HOUSEHOLD_INCOMES: Readonly<Record<string, number>> =
  stateHouseholdIncome2023.medianHouseholdIncomeDollarsByState;
const ESTIMATED_SCHEDULES = new Map<
  string,
  { readonly schedule: IncomeTaxSchedule; readonly note: string }
>();

/** Same tax shape first; weights are authored estimates, not legal tax terms. */
function scheduleReferences(
  stateKey: string,
  shape: TaxShape,
): readonly ScheduleReference[] {
  const income = HOUSEHOLD_INCOMES[stateKey];
  const region =
    income === undefined ? null : censusRegionOf(stateKey.slice(3));
  const compare = (
    a: Omit<ScheduleReference, "rank" | "weight">,
    b: Omit<ScheduleReference, "rank" | "weight">,
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = Object.entries(STATE_PLACES).flatMap(([key, place]) =>
    place.wageIncomeTax === shape &&
    (income === undefined || HOUSEHOLD_INCOMES[key] !== undefined)
      ? [
          {
            stateKey: key,
            place,
            sameRegion:
              income !== undefined && censusRegionOf(key.slice(3)) === region,
            incomeDistanceDollars:
              income === undefined
                ? 0
                : Math.abs(HOUSEHOLD_INCOMES[key]! - income),
          },
        ]
      : [],
  );
  return reciprocalRankedReferences(candidates, compare, (row) => row.stateKey);
}

/**
 * No admitted bill rate: retain a labeled estimate from actual same-shape
 * schedules. Region/income reciprocal ranking reuses the owner's #1369 rule;
 * it is not an empirical coefficient or a statute. No seed chooses a level.
 */
function estimatedSchedule(
  stateKey: string,
  shape: TaxShape,
  ownDeductionDollars: number | null,
): { readonly schedule: IncomeTaxSchedule; readonly note: string } {
  const cacheKey = `${stateKey}:${shape}:${ownDeductionDollars}`;
  const cached = ESTIMATED_SCHEDULES.get(cacheKey);
  if (cached) return cached;
  const references = scheduleReferences(stateKey, shape);
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
                      10_000,
                  ),
          };
        });
  const deductionNote =
    ownDeductionDollars === null
      ? `a standard deduction of $${deductionDollars.toLocaleString("en-US")} from ${deductions.length} peers with read deductions`
      : `the state's own standard deduction of $${deductionDollars.toLocaleString("en-US")}`;
  const ranking =
    HOUSEHOLD_INCOMES[stateKey] === undefined
      ? "same-shape plain mean because the target household income is unread"
      : "same tax shape, then Census region and household-income distance; authored reciprocal-rank weights";
  const estimate = {
    schedule: {
      standardDeductionMinor: deductionDollars * 100,
      brackets,
      sourceUrl: STATE_SOURCE,
    },
    note: `ESTIMATED FROM AVERAGE: ${references.length} states with ${shape} rates, ${ranking}, and ${deductionNote}. References: ${references.map((reference) => `${reference.stateKey} weight ${reference.weight}`).join(", ")}. Source: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026; Census CPS 2023 Table H-8. This estimate is not a rate written in the bill.`,
  };
  ESTIMATED_SCHEDULES.set(cacheKey, estimate);
  return estimate;
}
