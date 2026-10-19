import { DEFAULT_DATA } from "./data";
import { createLifeCore } from "./life";
import { RENEWAL_MODULE } from "./modules/renewal";
import { registerModule } from "./state";
import type { CoreData, CoreInput, CoreState } from "./types";

export function renewalData(base: CoreData = DEFAULT_DATA): CoreData {
  return {
    ...base,
    tiers: [
      ...base.tiers.filter((tier) => tier.id !== "newborn"),
      { id: "newborn", cadence: "inactive" },
    ],
  };
}

/** Production integration entry: same engine, scheduler, people module and writers. */
export function createRenewalCore(
  input: CoreInput,
  options: Parameters<typeof createLifeCore>[1] = {},
): CoreState {
  const core = createLifeCore(input, {
    ...options,
    data: renewalData(options.data),
  });
  registerModule(core, RENEWAL_MODULE);
  return core;
}
