import { coreAPI } from "../core2/state";
import {
  bankPanel,
  benefitsPanel,
  boardPanel,
  buildingPanel,
  evictionPanel,
  jobHistory,
  lawCostsPanel,
  metricsPanel,
  ownerPanel,
  regionPanel,
  turnoverPanel,
} from "../core2/modules/world-panels";
import { nationalPanel } from "../core2/modules/macro";
import type { CoreState } from "../core2/types";

/** OPUS-WORLD's read-only panels for the screen: record data only. */
export function economyView(
  core: CoreState,
  placeId: string,
  personId: string,
) {
  const api = coreAPI(core);
  const national = core.modules.has("macro") ? nationalPanel(api) : undefined;
  const turnover = core.modules.has("jobs") ? turnoverPanel(api) : undefined;
  return {
    nation: national?.months.at(-1),
    nationMonths: national?.months.slice(-13) ?? [],
    meetings: national?.meetings.slice(-3) ?? [],
    region: core.modules.has("regional")
      ? regionPanel(api, placeId).region
      : undefined,
    jobs: turnover && {
      employed: turnover.employed,
      seekers: turnover.seekers,
      openPositions: turnover.openPositions,
    },
    jobHistory: jobHistory(api, personId),
  };
}

/** Everything the panels hold, for the developer bench. */
export function worldPanels(core: CoreState, placeId: string) {
  const api = coreAPI(core);
  return {
    national: core.modules.has("macro") ? nationalPanel(api) : null,
    region: core.modules.has("regional") ? regionPanel(api, placeId) : null,
    turnover: core.modules.has("jobs") ? turnoverPanel(api) : null,
    bank: bankPanel(api),
    evictions: evictionPanel(api),
    owners: ownerPanel(api),
    building: buildingPanel(api),
    lawCosts: lawCostsPanel(api),
    benefits: benefitsPanel(api),
    board: boardPanel(api),
    metrics: metricsPanel(api, placeId),
  };
}
