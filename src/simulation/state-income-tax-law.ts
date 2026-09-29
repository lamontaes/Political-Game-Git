/**
 * What a state's income tax law, as enacted in play, does to a paycheck.
 *
 * Two policy questions reach the paycheck: "Should the state levy a personal
 * income tax?" (`fiscal.adopt-income-tax`) and "Should the state have a
 * graduated income tax?" (`fiscal.graduated-income-tax`). The 2026 schedules
 * in `state-income-tax-2026.json` already carry the law each state began
 * with, so only a law enacted in play changes anything here:
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
 * - A bill does not carry its own rates yet. A new or reshaped tax is
 *   ESTIMATED FROM AVERAGE: the average of the states that have that kind of
 *   tax in the Tax Foundation's 2026 tables, moved by the world's seed within
 *   half a standard deviation of the spread between those states, so two
 *   states that adopt a tax do not end up with the same rate.
 * - A newly adopted tax with no law on its shape is graduated, because most
 *   states that tax wages (27 of 42 in the tables) use brackets.
 * - A state that reshapes its tax keeps its own read standard deduction; a
 *   state with none read takes the average.
 * - Only single filers' schedules have been read. A joint return takes the
 *   single schedule with its brackets and deduction doubled, and a head of
 *   household files on the single schedule: the most common state rules,
 *   not yet counted state by state, so the label says so.
 */
import stateIncomeTax2026 from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import {
  annualTax,
  spreadOf,
  STATE_FILING_STATUS_NOTE,
  stateScheduleForFilingStatus,
  type FilingStatus,
  type IncomeTaxBracket,
  type IncomeTaxSchedule,
  type Spread,
} from "./income-tax-withholding";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import { SeededRng } from "./rng";
import type { EntityId, IsoDate, World } from "./types";

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
  const adopt = enactedLaw(
    world,
    state.id,
    ADOPT_STATE_INCOME_TAX_QUESTION,
    taxYearStart,
  );
  const graduated = enactedLaw(
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
  if (!adopted && shape === begunShape) return { kind: "as-begun" };
  const lawMeasureIds = [
    ...(adopted && adopt ? [adopt.measureId] : []),
    ...(graduated ? [graduated.measureId] : []),
  ];
  const estimate = estimatedSchedule(
    world,
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

/** The law on a question in force on `onDate`, only when enacted in play. */
function enactedLaw(
  world: World,
  stateJurisdictionId: EntityId,
  questionKey: string,
  onDate: IsoDate,
): LawInForce | null {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === questionKey);
  if (!proposition) return null;
  return lawInForce(
    world,
    stateJurisdictionId,
    proposition.id,
    onDate,
    "enacted-only",
  );
}

const placesShaped = (shape: TaxShape): readonly StatePlace[] =>
  Object.values(STATE_PLACES).filter((place) => place.wageIncomeTax === shape);

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
/** The taxable income whose tax measures how far states spread around it. */
const SPREAD_REFERENCE_DOLLARS = 50_000;

interface AverageShape {
  readonly brackets: readonly IncomeTaxBracket[];
  /** Spread of the states' rates, as a share of the average (flat) or of
   * the average state's tax at the reference income (graduated). */
  readonly rateSpread: Spread;
  readonly deduction: Spread;
  readonly summary: string;
}

let averages: Readonly<Record<TaxShape, AverageShape>> | null = null;

function averageShapes(): Readonly<Record<TaxShape, AverageShape>> {
  averages ??= { flat: averageFlat(), graduated: averageGraduated() };
  return averages;
}

function deductionSpread(places: readonly StatePlace[]): Spread {
  return spreadOf(
    places.flatMap((place) =>
      place.standardDeductionSingle === null
        ? []
        : [place.standardDeductionSingle],
    ),
  );
}

function averageFlat(): AverageShape {
  const places = placesShaped("flat");
  const rates = spreadOf(places.map((place) => place.brackets[0]!.ratePercent));
  return {
    brackets: [{ overMinor: 0, rateBasisPoints: Math.round(rates.mean * 100) }],
    rateSpread: {
      ...rates,
      mean: 1,
      standardDeviation: rates.standardDeviation / rates.mean,
    },
    deduction: deductionSpread(places),
    summary: `the average flat rate of the ${rates.count} states with one, ${rates.mean.toFixed(2)}%`,
  };
}

function averageGraduated(): AverageShape {
  const places = placesShaped("graduated");
  const averageTaxMinor = (dollars: number) =>
    places.reduce(
      (sum, place) => sum + annualTax(dollars * 100, bracketsOf(place)),
      0,
    ) / places.length;
  const brackets = GRADUATED_STEPS_DOLLARS.map((dollars, index) => {
    const next = GRADUATED_STEPS_DOLLARS[index + 1];
    const rateBasisPoints =
      next === undefined
        ? Math.round(
            (places.reduce(
              (sum, place) => sum + place.brackets.at(-1)!.ratePercent,
              0,
            ) /
              places.length) *
              100,
          )
        : Math.round(
            ((averageTaxMinor(next) - averageTaxMinor(dollars)) /
              ((next - dollars) * 100)) *
              10_000,
          );
    return { overMinor: dollars * 100, rateBasisPoints };
  });
  const atReference = spreadOf(
    places.map((place) =>
      annualTax(SPREAD_REFERENCE_DOLLARS * 100, bracketsOf(place)),
    ),
  );
  return {
    brackets,
    rateSpread: {
      ...atReference,
      mean: 1,
      standardDeviation: atReference.standardDeviation / atReference.mean,
    },
    deduction: deductionSpread(places),
    summary: `the average brackets of the ${places.length} states with graduated rates (top rate ${(brackets.at(-1)!.rateBasisPoints / 100).toFixed(2)}%)`,
  };
}

/**
 * The average schedule of states with this shape, moved within half a
 * standard deviation by the world's seed and the state, the same every time
 * for the same world and state.
 */
function estimatedSchedule(
  world: World,
  stateKey: string,
  shape: TaxShape,
  ownDeductionDollars: number | null,
): { readonly schedule: IncomeTaxSchedule; readonly note: string } {
  const average = averageShapes()[shape];
  const rng = new SeededRng(world.seed).fork(
    `state-income-tax-estimate:${stateKey}`,
  );
  const rateScale =
    1 + (rng.next() - 0.5) * average.rateSpread.standardDeviation;
  const deductionDraw = rng.next();
  const deductionDollars =
    ownDeductionDollars ??
    Math.round(
      average.deduction.mean +
        (deductionDraw - 0.5) * average.deduction.standardDeviation,
    );
  const schedule: IncomeTaxSchedule = {
    standardDeductionMinor: deductionDollars * 100,
    brackets: average.brackets.map((bracket) => ({
      overMinor: bracket.overMinor,
      rateBasisPoints: Math.max(
        0,
        Math.round(bracket.rateBasisPoints * rateScale),
      ),
    })),
    sourceUrl: STATE_SOURCE,
  };
  const deductionNote =
    ownDeductionDollars === null
      ? `a standard deduction of $${deductionDollars.toLocaleString("en-US")} from the average of the ${average.deduction.count} such states whose deduction was read ($${Math.round(average.deduction.mean).toLocaleString("en-US")})`
      : `the state's own standard deduction of $${deductionDollars.toLocaleString("en-US")}`;
  const note =
    `ESTIMATED FROM AVERAGE: ${average.summary}, rates ${rateScale >= 1 ? "raised" : "lowered"} ` +
    `${Math.abs((rateScale - 1) * 100).toFixed(1)}% by the world's seed within half the spread between states, ` +
    `and ${deductionNote}. Source: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026.`;
  return { schedule, note };
}
