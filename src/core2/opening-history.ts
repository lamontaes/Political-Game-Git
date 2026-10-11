import opening from "./data/history/opening.json" with { type: "json" };
import { makeIsoDate } from "../simulation/dates";
import { buildPopulation, type PopulationOptions } from "./population";
import { buildDeepPast } from "./deep-past";
import {
  buildOpeningEconomy,
  type OpeningEconomyOptions,
} from "./opening-economy";
import { enrichCivicInputs } from "./civic-inputs";
import {
  buildRecentLifeHistory,
  recentLifeHistoryModule,
} from "./history-people";
import { orderedHistoryModules, type HistoryModule } from "./history-contract";
import { runPreStartHistory } from "./history-run";
import { createLifeCore } from "./life";
import { P } from "./parameters";
import type { CoreInput } from "./types";

export interface HistoryOpeningOptions {
  modules?: readonly HistoryModule[];
  economy?: OpeningEconomyOptions;
  scheduledWork?: boolean;
}

/** Explicit 2026 opening entry point. Historical benchmark dates stay authored. */
export function openHistoryWorld(
  population: Omit<PopulationOptions, "startedAt"> & { startedAt?: string },
  options: HistoryOpeningOptions = {},
) {
  const startedAt = makeIsoDate(population.startedAt ?? opening.startedAt);
  if (
    startedAt.slice(P.zero, "YYYY".length) !==
    opening.startedAt.slice(P.zero, "YYYY".length)
  )
    throw new Error("The M1 opening must use its 2026 law vintage.");
  const generated = buildPopulation({
    ...population,
    startedAt,
    scheduledWork: options.scheduledWork ?? population.scheduledWork,
  });
  return prepareHistoryOpening(generated, options);
}

/** Supplied input uses the same opening path and retains all established facts. */
export function prepareHistoryOpening(
  input: CoreInput,
  options: HistoryOpeningOptions = {},
) {
  if (
    makeIsoDate(input.startedAt).slice(P.zero, "YYYY".length) !==
    opening.startedAt.slice(P.zero, "YYYY".length)
  )
    throw new Error("The M1 opening must use its 2026 law vintage.");
  const past = buildRecentLifeHistory(buildDeepPast(input));
  const civic = enrichCivicInputs(past);
  const economy = buildOpeningEconomy(civic, options.economy);
  const modules = [
    recentLifeHistoryModule(economy.input),
    ...(options.modules ?? []),
  ];
  // Include the built-in people pass in dependency preflight, before any pass writes.
  orderedHistoryModules(modules);
  const core = createLifeCore(economy.input, {
    modules,
    scheduledWork: options.scheduledWork,
  });
  const history = runPreStartHistory(core);
  const preparedInput: CoreInput = {
    ...economy.input,
    moduleState: modules
      .filter((module) => module.state)
      .map((module) =>
        // Snapshots are explicit opening data, not a second state store or save format.
        coreModuleSnapshot(core, module.id),
      ),
  };
  return {
    core,
    input: preparedInput,
    history,
    economyReceipt: economy.receipt,
  };
}

import { coreAPI } from "./state";
function coreModuleSnapshot(
  core: ReturnType<typeof createLifeCore>,
  id: string,
) {
  return coreAPI(core).moduleState(id).snapshot();
}
