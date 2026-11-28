/**
 * Public safety, once a month on the sixth: the crimes the crime engine
 * recorded become arrests, and arrests become cases the justice engine files
 * and decides under the law in force, and the laws on guns, oversight and
 * immigration partnership reach the town's households (see
 * `public-safety.ts`).
 */
import { coreAPI } from "../state";
import {
  openingSafetyMonth,
  PUBLIC_SAFETY_MODULE_ID,
  runSafetyMonth,
} from "../public-safety";
import type { CoreModule } from "../types";

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
  // The month's ordinary crime, courts, jail, firearm laws and fire service, run once as the world opens.
  worldOpen: (core) => openingSafetyMonth(coreAPI(core)),
  onDay(api) {
    if (api.state.date.endsWith("-06")) runSafetyMonth(api);
    return undefined;
  },
};
