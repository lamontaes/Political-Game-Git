// Custom world (M6-04): the new-game settings, applied to the opening.
//
// Stopgap SG-PLAY-world-settings-copy: OPUS-CORE's generated world applies
// these settings in functions it doesn't export (applyOpeningSettings and
// scaleOutsideSales in src/core2/tooling/generated-world.ts); the bench runs
// the same arithmetic here until they are exported.
import type { WorldSettings } from "../core2/tooling/generated-world";
import type { CoreInput } from "../core2/types";

export type { WorldSettings };

/** The same bounds the core's generated world checks. */
export function checkWorldSettings(settings: WorldSettings): void {
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
  multiplier(settings.politics?.turnout, "turnout");
  for (const [party, value] of Object.entries(
    settings.politics?.partyStrength ?? {},
  ))
    multiplier(value, `party strength (${party})`);
  const shift = settings.politics?.leanShift;
  if (shift !== undefined && !(shift >= -1 && shift <= 1))
    throw new Error("World lean shift must be between -1 and 1.");
}

/** Wages and household cash, recorded on the world as the player's choice. */
export function applyWorldSettings(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  if (!Object.keys(settings).length) return input;
  const wages = settings.economy?.wages ?? 1,
    cash = settings.economy?.householdCash ?? 1;
  return {
    ...input,
    placeMetadata: {
      ...(input.placeMetadata ?? {}),
      worldSettings: JSON.stringify(settings),
    },
    gaps: [
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

/** Outside buyers' demand for the town's firms, on the two-level flows. */
export function scaleOutsideDemand(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  const factor = settings.economy?.outsideDemand ?? 1;
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
