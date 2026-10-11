import parameters from "./data/renewal/parameters.json" with { type: "json" };
import { DEFAULT_DATA, extendData } from "./data";
import { createLifeCore } from "./life";
import { RENEWAL_MODULE } from "./modules/renewal";
import { registerModule } from "./state";
import type { Parameter } from "./parameters";
import type { CoreData, CoreInput, CoreState } from "./types";

export function renewalData(base: CoreData = DEFAULT_DATA): CoreData {
  return extendData(base, {
    parameters: parameters as Readonly<Record<string, Parameter>>,
    tiers: [{ id: "newborn", cadence: "inactive" }],
    actions: base.actions.map((action) => ({
      ...action,
      prerequisites: [
        ...(action.prerequisites ?? []),
        { operation: "renewal-dependent" },
      ],
    })),
  });
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
