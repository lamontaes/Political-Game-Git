import { CUSTOM_ECONOMY_KEY } from "./modules/macro";
import type { CoreInput } from "./types";

/** Population, past, civic records, the player's peers and circle, then the economy. */
/**
 * Custom-world settings (M6-04). A new game uses real data unless the player
 * changes something; every setting is recorded on the world so engines and
 * screens can show it as the player's choice, not as real data.
 */
export interface WorldSettings {
  /** Residents generated (at least), default from targetPopulation. */
  population?: number;
  economy?: {
    /** Multiplies outside buyers' demand for the town's firms. */
    outsideDemand?: number;
    /** Multiplies every household's opening cash. */
    householdCash?: number;
    /** Multiplies every job's pay. */
    wages?: number;
    /** The national economy's opening month, in percent (M6-04): where the game starts. */
    unemploymentPct?: number;
    inflationPct?: number;
    policyRatePct?: number;
  };
  /** Recorded for PEOPLE's views and GOV's elections to read. */
  politics?: {
    /** -1 (left) to +1 (right), added to residents' lean. */
    leanShift?: number;
    /** Multiplies turnout. */
    turnout?: number;
    /** Party name to a strength multiplier. */
    partyStrength?: Readonly<Record<string, number>>;
  };
}

export function checkSettings(settings: WorldSettings): void {
  const multiplier = (value: number | undefined, name: string) => {
    if (value !== undefined && !(value >= 0.25 && value <= 4))
      throw new Error(`World setting ${name} must be between 0.25 and 4.`);
  };
  if (
    settings.population !== undefined &&
    !(
      Number.isSafeInteger(settings.population) &&
      settings.population >= 100 &&
      settings.population <= 50_000
    )
  )
    throw new Error("World population must be 100 to 50,000 people.");
  multiplier(settings.economy?.outsideDemand, "outside demand");
  multiplier(settings.economy?.householdCash, "household cash");
  multiplier(settings.economy?.wages, "wages");
  const percent = (
    value: number | undefined,
    name: string,
    low: number,
    high: number,
  ) => {
    if (value !== undefined && !(value >= low && value <= high))
      throw new Error(
        `World setting ${name} must be between ${low} and ${high}.`,
      );
  };
  percent(settings.economy?.unemploymentPct, "unemployment", 0, 40);
  percent(settings.economy?.inflationPct, "inflation", -5, 50);
  percent(settings.economy?.policyRatePct, "policy rate", 0, 30);
  multiplier(settings.politics?.turnout, "turnout");
  for (const [party, value] of Object.entries(
    settings.politics?.partyStrength ?? {},
  ))
    multiplier(value, `party strength (${party})`);
  const shift = settings.politics?.leanShift;
  if (shift !== undefined && !(shift >= -1 && shift <= 1))
    throw new Error("World lean shift must be between -1 and 1.");
}

/** Wages and household cash, applied before the economy is built from them. */
export function applyOpeningSettings(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  const wages = settings.economy?.wages ?? 1,
    cash = settings.economy?.householdCash ?? 1;
  const recorded: Record<string, string> =
    Object.keys(settings).length === 0
      ? {}
      : { worldSettings: JSON.stringify(settings) };
  // The opening month's national figures the player chose ride to the macro
  // engine, which starts its history from them (modules/macro.ts).
  const national = {
    ...(settings.economy?.unemploymentPct !== undefined
      ? { unemploymentPct: settings.economy.unemploymentPct }
      : {}),
    ...(settings.economy?.inflationPct !== undefined
      ? { inflationPct: settings.economy.inflationPct }
      : {}),
    ...(settings.economy?.policyRatePct !== undefined
      ? { policyRatePct: settings.economy.policyRatePct }
      : {}),
  };
  if (Object.keys(national).length)
    recorded[CUSTOM_ECONOMY_KEY] = JSON.stringify(national);
  return {
    ...input,
    placeMetadata: { ...(input.placeMetadata ?? {}), ...recorded },
    gaps:
      Object.keys(settings).length === 0
        ? input.gaps
        : [
            ...input.gaps,
            `Custom world: the player changed real data (${Object.keys(settings).join(", ")}); see placeMetadata.worldSettings.`,
          ],
    people:
      cash === 1
        ? input.people
        : input.people.map((row) => ({
            ...row,
            liquidMinor: Math.round(row.liquidMinor * cash),
          })),
    jobs:
      wages === 1
        ? input.jobs
        : input.jobs.map((row) => ({
            ...row,
            wageDailyMinor: Math.round(row.wageDailyMinor * wages),
            ...(row.hourlyMinor === undefined
              ? {}
              : { hourlyMinor: Math.round(row.hourlyMinor * wages) }),
          })),
    workCommitments:
      wages === 1
        ? input.workCommitments
        : input.workCommitments?.map((row) => ({
            ...row,
            hourlyMinor: Math.round(row.hourlyMinor * wages),
          })),
  };
}

export function scaleOutsideSales(factor: number, input: CoreInput): CoreInput {
  if (factor === 1 || !input.residents) return input;
  return {
    ...input,
    residents: {
      ...input.residents,
      flows: input.residents.flows.map((row) =>
        row.kind === "outside-sales"
          ? { ...row, amountMinor: Math.round(row.amountMinor * factor) }
          : row,
      ),
    },
  };
}

/**
 * A town opened at a multiple of its sample runs that multiple of sales and
 * wages, so each business's opening cash (its estimated days of payroll and
 * costs) is that multiple too: the same cover for the same days.
 */
export function scaleBusinessCash(factor: number, input: CoreInput): CoreInput {
  if (factor === 1 || !input.finance) return input;
  const businesses = new Set(
    input.finance.businesses.map((book) => book.organizationId),
  );
  return {
    ...input,
    organizations: input.organizations.map((org) =>
      businesses.has(org.id)
        ? { ...org, liquidMinor: Math.round(org.liquidMinor * factor) }
        : org,
    ),
  };
}
