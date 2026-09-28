import {
  macroConditionsAt,
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { EntityId, IsoDate, World } from "../types";
import type {
  MeasureReading,
  OutcomeLane,
  OutcomeMeasureDefinition,
  OutcomeMeasureKey,
  OutcomeMeasureReader,
} from "./contract";

/**
 * Every measure the web names, and how to read the ones that are causes.
 *
 * Each lane owns the measures in its areas: it adds a definition here, and a
 * reader for any measure another link reads as a cause. A measure with no
 * reader can still be moved by the web (the web returns its factor); it cannot
 * move anything else until it can be read.
 */
const measure = (
  key: OutcomeMeasureKey,
  ownerLane: OutcomeLane,
  unit: string,
  factorFloor = 0.5,
  factorCeiling = 2,
): OutcomeMeasureDefinition => ({
  key,
  ownerLane,
  unit,
  factorFloor,
  factorCeiling,
});

export const OUTCOME_MEASURES: readonly OutcomeMeasureDefinition[] = [
  // Economy and jobs (B).
  measure("economy.unemployment-rate", "B", "percent of the labor force"),
  measure("economy.employment-rate", "B", "percent of working-age adults"),
  measure("economy.minimum-wage", "B", "dollars an hour"),
  // Public safety (O). The crime producer reads these factors.
  measure("safety.crime.assault", "O", "offenses a year"),
  measure("safety.crime.robbery", "O", "offenses a year"),
  measure("safety.crime.burglary", "O", "offenses a year"),
  measure("safety.crime.vandalism", "O", "offenses a year"),
  // Health (F).
  measure("health.coverage", "F", "percent of residents insured"),
  measure("health.coverage-working-age-men", "F", "percent insured"),
  measure("health.catastrophic-medical-costs", "F", "percent of residents"),
  measure("health.medical-debt-in-collections", "F", "dollars per resident"),
  measure("health.depression", "F", "percent screening positive"),
  measure("health.blood-pressure-control", "F", "percent controlled"),
  measure("health.mortality", "F", "deaths per 100,000"),
  measure("health.mortality-55-64-low-income", "F", "deaths per 100,000"),
  measure("health.infant-mortality", "F", "deaths per 1,000 births"),
  // Safety net and poverty (F).
  measure("safety-net.poverty-rate", "F", "percent of residents"),
  measure("safety-net.child-poverty-rate", "F", "percent of children"),
  measure("safety-net.food-insecurity", "F", "percent of households"),
  measure("safety-net.food-aid-participation", "F", "percent of households"),
  measure("safety-net.child-benefit", "F", "dollars a year per child"),
  // Public budgets (F).
  measure("budget.borrowing-cost", "F", "basis points over the market"),
  // The press (C) and the environment (O), as causes.
  measure("press.local-outlets", "C", "local news outlets"),
  measure("environment.fine-particles", "O", "micrograms per cubic meter"),
  // Laws as causes: 1 while in force, 0 otherwise (G's lever records).
  measure("law.medicaid-work-requirement", "G", "in force"),
  measure("law.medicaid-expansion", "G", "in force"),
  measure("law.abortion-ban", "G", "in force"),
];

const DEFINITIONS = new Map(OUTCOME_MEASURES.map((row) => [row.key, row]));

export function outcomeMeasureDefinition(
  key: OutcomeMeasureKey,
): OutcomeMeasureDefinition | null {
  return DEFINITIONS.get(key) ?? null;
}

/**
 * Recorded unemployment for a place, or the nation's when the place has none,
 * as the crime rules have always read it. The baseline is the first month
 * recorded for the same scope: the place as the world opened.
 */
const unemploymentReader: OutcomeMeasureReader = {
  definition: DEFINITIONS.get("economy.unemployment-rate")!,
  read(world, jurisdictionId, asOf): MeasureReading | null {
    const local = macroScopeForJurisdiction(jurisdictionId);
    const scope = macroConditionsAt(world, local, asOf) ? local : "national";
    const record = macroConditionsAt(world, scope, asOf);
    if (!record) return null;
    const first = macroMonthHistory(world, scope, asOf)[0] ?? record;
    return {
      value: record.unemploymentPct,
      baseline: first.unemploymentPct,
      provenance: "recorded",
    };
  },
};

const READERS: ReadonlyMap<OutcomeMeasureKey, OutcomeMeasureReader> = new Map(
  [unemploymentReader].map((reader) => [reader.definition.key, reader]),
);

export function outcomeMeasureReader(
  key: OutcomeMeasureKey,
): OutcomeMeasureReader | null {
  return READERS.get(key) ?? null;
}

/** Reads a measure, or null when it has no reader or nothing is recorded. */
export function readOutcomeMeasure(
  world: World,
  key: OutcomeMeasureKey,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): MeasureReading | null {
  return READERS.get(key)?.read(world, jurisdictionId, asOf) ?? null;
}
