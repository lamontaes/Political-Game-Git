/**
 * The town's homeless count as a public record (homelessness item 6): on the
 * first of each month, the town's people by housing status (WORLD's
 * `housingStatusCounts`, full and counted people together). When the count
 * changes it is recorded, publicly, with the month before; the press takes
 * every public record onto its wire and its reporters decide what to print.
 */
import { declareSnapshotCovered } from "../snapshot";
import { registerModule } from "../state";
import { housingStatusCounts } from "../housing-homeless";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const HOMELESS_COUNT_MODULE_ID = "core2-homeless-count-v1";
export const HOMELESS_COUNT_EVENT = "housing.homeless-count";

const table = (api: CoreAPI) =>
  api.moduleState(HOMELESS_COUNT_MODULE_ID).table("counts");

/** The town's place: the first of its visible places (the player's place). */
function townOf(api: CoreAPI): string | undefined {
  return [...(api.state as CoreState).visiblePlaceIds][0];
}

function countMonth(api: CoreAPI): void {
  const town = townOf(api);
  if (!town) return;
  const counts = housingStatusCounts(api, town);
  const homeless = counts.sheltered + counts.unsheltered;
  const last = table(api).get(town) as unknown as
    { homeless: number; doubledUp: number } | undefined;
  if (
    last &&
    last.homeless === homeless &&
    last.doubledUp === counts["doubled-up"]
  )
    return;
  table(api).put({
    id: town,
    homeless,
    doubledUp: counts["doubled-up"],
    date: api.state.date,
  } as unknown as ModuleRow);
  // The first month only sets the baseline; a change is what is news.
  if (!last) return;
  api.emit({
    id: `${HOMELESS_COUNT_EVENT}:${town}:${api.state.date}`,
    date: api.state.date,
    kind: HOMELESS_COUNT_EVENT,
    personIds: [],
    placeId: town,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "The town's people by housing status: the housing engine's records of each household removed and where it went.",
      estimatedFrom:
        "Sheltered and unsheltered people counted as homeless, as HUD's point-in-time count does; doubled-up counted apart.",
    },
    publicRecord: true,
    news: true,
    facts: {
      // The town's own count, for the press (its place may not be the
      // town government's record place).
      level: "town",
      homeless: `${homeless}`,
      previous: `${last.homeless}`,
      sheltered: `${counts.sheltered}`,
      unsheltered: `${counts.unsheltered}`,
      doubledUp: `${counts["doubled-up"]}`,
    },
  });
}

export const HOMELESS_COUNT_MODULE: CoreModule = {
  id: HOMELESS_COUNT_MODULE_ID,
  state: { schemaVersion: 1, tables: { counts: {} } },
  onDay(api) {
    if (!api.state.modules.has("housing")) return undefined;
    if (api.state.date.endsWith("-01")) countMonth(api);
    return undefined;
  },
};

export function openHomelessCount(core: CoreState): void {
  if (core.modules.has(HOMELESS_COUNT_MODULE_ID)) return;
  registerModule(core, HOMELESS_COUNT_MODULE);
}

// Every table this engine keeps is in the snapshot; see scripts/core2-guard/snapshot-roundtrip.mjs.
declareSnapshotCovered("core2-homeless-count-v1");
