/**
 * Public safety, once a month on the sixth: the crimes the crime engine
 * recorded become arrests, and arrests become cases the justice engine files
 * and decides under the law in force, and the laws on guns, oversight and
 * immigration partnership reach the town's households (see
 * `public-safety.ts`).
 */
import { coreAPI, registerModule } from "../state";
import {
  openingSafetyMonth,
  PUBLIC_SAFETY_MODULE_ID,
  runSafetyMonth,
} from "../public-safety";
import type { CoreModule, CoreState } from "../types";

export const PUBLIC_SAFETY_MODULE: CoreModule = {
  id: PUBLIC_SAFETY_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      carry: {},
      storage: {},
      permits: {},
      months: { indexes: { byPlace: { fields: ["placeId"] } } },
    },
  },
  onDay(api) {
    if (api.state.date.endsWith("-06")) runSafetyMonth(api);
    return undefined;
  },
};

export function openPublicSafety(core: CoreState): void {
  if (core.modules.has(PUBLIC_SAFETY_MODULE_ID)) return;
  registerModule(core, PUBLIC_SAFETY_MODULE);
  openingSafetyMonth(coreAPI(core));
}
