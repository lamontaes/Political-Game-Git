/**
 * What the outcome web (OPUS-WEB, M3-04) does to a measure an economy engine
 * sets itself: the multiplier its running links put on the measure's base in
 * the place this month, 1 where the web isn't running, doesn't keep the
 * measure, or keeps it as a level. The same rule as the web's own
 * `outcomeWebFactor`, read here from the web's records so the economy engines
 * don't import the web module (which imports them).
 */
import { keptOutcome, scaleOf } from "./outcome-web-model";
import type { CoreAPI, CoreState } from "./types";

const OUTCOME_WEB_MODULE_ID = "core2-outcome-web-v1";

export function webFactor(
  api: CoreAPI,
  placeId: string,
  measure: string,
): number {
  if (!keptOutcome(measure) || scaleOf(measure) === "level") return 1;
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID)) return 1;
  const rows = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly {
    month: string;
    values: Readonly<Record<string, number>>;
    bases: Readonly<Record<string, number>>;
  }[];
  let latest: (typeof rows)[number] | undefined;
  for (const row of rows) if (!latest || row.month > latest.month) latest = row;
  const value = latest?.values[measure],
    base = latest?.bases[measure];
  return value !== undefined && base ? value / base : 1;
}
