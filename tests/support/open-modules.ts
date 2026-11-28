/**
 * The installs a test makes by hand: the vote record, the climate and the
 * national events, each added to a core that does not have it yet. The world
 * builder installs them from its list of engines (`installEngines`,
 * src/bench/world.ts), so game code carries no function for it; a test that
 * builds a small core without the whole world uses these.
 */
import { CLIMATE_MODULE } from "../../src/core2/modules/climate";
import { NATIONAL_EVENTS_MODULE } from "../../src/core2/modules/national-events";
import { RECORD_MODULE } from "../../src/core2/modules/record";
import { registerModule } from "../../src/core2/state";
import type { CoreModule, CoreState } from "../../src/core2/types";

function installOnce(core: CoreState, module: CoreModule): void {
  if (!core.modules.has(module.id)) registerModule(core, module);
}

export const openRecord = (core: CoreState): void =>
  installOnce(core, RECORD_MODULE);
export const openClimate = (core: CoreState): void =>
  installOnce(core, CLIMATE_MODULE);
export const openNationalEvents = (core: CoreState): void =>
  installOnce(core, NATIONAL_EVENTS_MODULE);
