/**
 * The world's economy in one place for the evening build and the bench:
 * the national economy and central bank, state and metro economies, jobs and
 * the town bank's credit and housing.
 *
 *   const input = withWorldEconomy(opening);
 *   const core = createLifeCore(input, { data: worldCoreData(), modules: WORLD_MODULES });
 */
import { DEFAULT_DATA, extendData } from "../data";
import type { CoreData, CoreInput } from "../types";
import { CREDIT_MODULE, CREDIT_PARAMETERS, withTownBank } from "./credit";
import { HOUSING_MODULE, HOUSING_PARAMETERS, withHousing } from "./housing";
import { JOBS_MODULE, JOBS_PARAMETERS } from "./jobs";
import { MACRO_MODULE, MACRO_PARAMETERS, withCentralBank } from "./macro";
import { REGIONAL_MODULE, REGIONAL_PARAMETERS } from "./regional";

export const WORLD_MODULES = [
  MACRO_MODULE,
  REGIONAL_MODULE,
  CREDIT_MODULE,
  JOBS_MODULE,
  HOUSING_MODULE,
] as const;

export function withWorldEconomy(input: CoreInput): CoreInput {
  return withHousing(withTownBank(withCentralBank(input)));
}

export function worldCoreData(base: CoreData = DEFAULT_DATA): CoreData {
  return extendData(base, {
    parameters: {
      ...MACRO_PARAMETERS,
      ...REGIONAL_PARAMETERS,
      ...JOBS_PARAMETERS,
      ...CREDIT_PARAMETERS,
      ...HOUSING_PARAMETERS,
    },
  });
}
