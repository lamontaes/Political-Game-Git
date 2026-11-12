/**
 * The law in force as the country tier's month reads it, from the game's own law answers and the
 * rules a town paycheck and a town claim already use (`withholdingFor`, `unemploymentTermsOf`):
 * one rule, two tiers. The caller says how a state's law on a series is read (the laws module's
 * `stateLawInForce` in play); answers are kept for the month this reader lives.
 */
import type { TaxIndex } from "./tax-index";
import type {
  CountryFederalDestination,
  CountryFederalLine,
  CountryLaw,
  CountryState,
  CountryWithheldLine,
} from "./country-model";
import federalLines from "./data/country/federal-lines.json" with { type: "json" };
import spending from "../../data/research/federal/federal-spending-by-state-fy2024.json" with { type: "json" };
import { unemploymentTermsOf } from "./jobs-benefits";
import { withholdingFor } from "./budgets-treasury";
import { resolveLawInForce, type LawInForceAnswer } from "./laws-in-force";
import { stateOpeningLawRows } from "./modules/laws";

const DAYS_PER_YEAR = 365;
const WEEKS_PER_YEAR = 52;

/** The value of a series at one level of an answer, or null where that level has no law on it. */
function atLevel(
  answer: LawInForceAnswer,
  level: "state" | "federal",
): number | null {
  const found = answer.levels.find((row) => row.level === level);
  if (!found?.row || found.setAside) return null;
  return typeof found.row.value === "number" ? found.row.value : null;
}

/** Where each federal budget line reaches a state (data/country/federal-lines.json). */
const DESTINATIONS = federalLines.lines as Readonly<
  Record<string, CountryFederalDestination>
>;
/** Each place's population in the federal spending research, by jurisdiction key. */
const POPULATION = spending.population as Readonly<Record<string, number>>;

/** A federal budget row as the tier reads it: its id and its spending lines, minor units a year. */
export interface CountryFederalBudget {
  readonly id: string;
  readonly spendingMinor: Readonly<Record<string, number>>;
}

/**
 * The federal budget in force as it reaches each state, line by line: each line's dollars shared
 * among the 56 places by population times the place's stake in the line (`stake`, the world's
 * stake around data/research/federal/federal-spending-by-state-fy2024.json), sent where the
 * line pays (data/country/federal-lines.json). Shares are worked out once per reader.
 */
export function federalSpendingReader(
  budget: CountryFederalBudget | undefined,
  stake: (stateKey: string, line: string) => number,
  minorPerDollar: number,
): (state: CountryState) => readonly CountryFederalLine[] {
  if (!budget) return () => [];
  const keys = Object.keys(POPULATION);
  const byState = new Map<string, CountryFederalLine[]>();
  for (const [line, minor] of Object.entries(budget.spendingMinor)) {
    let total = 0;
    const own = new Map<string, number>();
    for (const key of keys) {
      const weight = POPULATION[key]! * stake(key, line);
      own.set(key, weight);
      total += weight;
    }
    if (total <= 0) continue;
    for (const key of keys) {
      const rows = byState.get(key) ?? [];
      byState.set(key, rows);
      rows.push({
        line,
        budgetId: budget.id,
        to: DESTINATIONS[line] ?? "elsewhere",
        dollarsYear: ((minor / minorPerDollar) * own.get(key)!) / total,
      });
    }
  }
  return (state) => byState.get(state.key) ?? [];
}

export function countryLaw(
  read: (stateKey: string, series: string) => LawInForceAnswer,
  parameter: (key: string) => number,
  asOf: string,
  /** How far prices and pay have moved since the law's dollar year: what the law indexes moves with it. */
  index?: TaxIndex,
  /** The federal budget in force by state (`federalSpendingReader`); none where the world keeps no budgets. */
  federal: (state: CountryState) => readonly CountryFederalLine[] = () => [],
): CountryLaw {
  const answers = new Map<string, LawInForceAnswer>();
  const law = (state: CountryState, series: string) => {
    const id = `${state.key}|${series}`;
    let answer = answers.get(id);
    if (!answer) answers.set(id, (answer = read(state.key, series)));
    return answer;
  };
  const hundred = parameter("macroHundred");
  const minor = parameter("minorPerDollar");
  const hours = parameter("countryHoursPerYear");
  const terms = new Map<string, ReturnType<typeof unemploymentTermsOf>>();
  return {
    federalSpendingYear: federal,
    withheld(state, payYear) {
      // One paycheck for the year: the percentage method gives the year's tax, the wage base and
      // the added Medicare rate apply to the year's pay.
      const income = law(state, "income-tax");
      const lines = withholdingFor({
        paidMinor: Math.round(payYear * minor),
        periodDays: DAYS_PER_YEAR,
        yearToDateMinor: 0,
        incomeTax: income,
        socialSecurity: law(state, "social-security-tax"),
        medicare: law(state, "medicare-tax"),
        ...(index ? { index } : {}),
      });
      let toState = 0,
        toNation = 0;
      const byLaw = new Map<string, CountryWithheldLine>();
      // An income tax row in force that withholds nothing (a rate ended at zero) is still the
      // law read: it is listed at zero, so a trace names the row that changed.
      for (const level of income.levels)
        if (
          level.row &&
          !level.setAside &&
          (level.level === "state" || level.level === "federal")
        )
          byLaw.set(level.row.id, {
            lawId: level.row.id,
            level: level.level,
            dollars: 0,
          });
      for (const line of lines) {
        if (line.level !== "state" && line.level !== "federal") continue;
        if (line.level === "state") toState += line.minor;
        else toNation += line.minor;
        const kept = byLaw.get(line.lawId);
        if (kept) kept.dollars += line.minor / minor;
        else
          byLaw.set(line.lawId, {
            lawId: line.lawId,
            level: line.level,
            dollars: line.minor / minor,
          });
      }
      return {
        state: toState / minor,
        federal: toNation / minor,
        lines: [...byLaw.values()],
      };
    },
    salesTaxRate: (state) =>
      (atLevel(law(state, "sales-tax"), "state") ?? 0) / hundred,
    profitTaxRate: (state) =>
      (atLevel(law(state, "corporate-income-tax"), "state") ?? 0) / hundred,
    federalProfitTaxRate: (state) =>
      (atLevel(law(state, "corporate-income-tax"), "federal") ?? 0) / hundred,
    wageFloorYear: (state) =>
      ((law(state, "minimum-wage").value ?? 0) / minor) * hours,
    joblessBenefitYear(state, payYear) {
      let own = terms.get(state.key);
      if (!own)
        terms.set(
          state.key,
          (own = unemploymentTermsOf(
            law(state, "unemployment-insurance"),
            law(state, "unemployment-weekly-maximum"),
            parameter,
            asOf,
          )),
        );
      if (!own.hasProgram) return 0;
      const weekly = Math.min(
        (own.weeklyShare * payYear) / WEEKS_PER_YEAR,
        own.weeklyMaximumMinor / minor,
      );
      return weekly * WEEKS_PER_YEAR;
    },
  };
}

/**
 * A state's law read from the research's starting law alone, by the same rule
 * the laws module uses: for a world that has no laws module open (a model test,
 * a small world), where no act has changed anything.
 */
export function startingLawReader(
  date: string,
  /** The world's first day: a series recorded only from a later date is in force from then. */
  startedAt: string = date,
): (stateKey: string, series: string) => LawInForceAnswer {
  return (stateKey, series) =>
    resolveLawInForce({
      series,
      chain: {
        placeKey: "",
        placeName: stateKey,
        townPlaceId: "",
        stateKey,
        countyGeoids: [],
        incorporated: false,
        levels: [
          { level: "federal" as const, jurisdiction: "US" },
          { level: "state" as const, jurisdiction: stateKey },
        ],
      },
      date,
      rows: stateOpeningLawRows(stateKey, startedAt).filter(
        (row) => row.series === series,
      ),
    });
}
