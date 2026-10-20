/**
 * Public safety, once a month on the sixth: crime becomes arrests, arrests
 * become cases under the law in force, and the laws on guns, oversight and
 * immigration partnership reach the town's households (see
 * `public-safety.ts`).
 */
import { registerModule } from "../state";
import { PUBLIC_SAFETY_MODULE_ID, runSafetyMonth } from "../public-safety";
import type { CoreModule, CoreState } from "../types";

export const PUBLIC_SAFETY_MODULE: CoreModule = {
  id: PUBLIC_SAFETY_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      cases: {
        indexes: {
          byStatus: { fields: ["status"] },
          byPerson: { fields: ["personId"] },
        },
      },
      terms: { indexes: { byStatus: { fields: ["status"] } } },
      carry: {},
      storage: {},
      permits: {},
      months: {},
    },
  },
  onDay(api) {
    if (api.state.date.endsWith("-06")) runSafetyMonth(api);
    return undefined;
  },
};

export function openPublicSafety(core: CoreState): void {
  if (!core.modules.has(PUBLIC_SAFETY_MODULE_ID))
    registerModule(core, PUBLIC_SAFETY_MODULE);
}
