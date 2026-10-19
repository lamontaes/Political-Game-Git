/**
 * The world's economy in one place for the evening build and the bench:
 * the national economy and central bank, state and metro economies, jobs and
 * the town bank's credit, housing, businesses, and the town's monthly
 * economic numbers, and the prices a place's laws set.
 *
 *   const input = withWorldEconomy(opening);
 *   const core = createLifeCore(input, { data: worldCoreData(), modules: WORLD_MODULES });
 */
import { DEFAULT_DATA, extendData } from "../data";
import type { CoreData, CoreInput, CoreModule } from "../types";
import { BUSINESS_MODULE, BUSINESS_PARAMETERS } from "./business";
import { CREDIT_MODULE, CREDIT_PARAMETERS, withTownBank } from "./credit";
import { HOUSING_MODULE, HOUSING_PARAMETERS, withHousing } from "./housing";
import { JOBS_MODULE, JOBS_PARAMETERS } from "./jobs";
import {
  CUSTOM_ECONOMY_KEY,
  MACRO_MODULE,
  MACRO_PARAMETERS,
  withCentralBank,
} from "./macro";
import { REGIONAL_MODULE, REGIONAL_PARAMETERS } from "./regional";
import { WORLD_METRICS_MODULE } from "./world-metrics";
import { PLACE_PRICES_MODULE, PRICES_PARAMETERS } from "./place-prices";
import { withMembershipDues } from "../membership-dues";

export const WORLD_MODULES = [
  MACRO_MODULE,
  REGIONAL_MODULE,
  CREDIT_MODULE,
  JOBS_MODULE,
  HOUSING_MODULE,
  BUSINESS_MODULE,
  PLACE_PRICES_MODULE,
  WORLD_METRICS_MODULE,
] as const;

export function withWorldEconomy(input: CoreInput): CoreInput {
  const economy = withMembershipDues(
    withHousing(withTownBank(withCentralBank(input))),
  );
  return economy;
}

export function worldCoreData(base: CoreData = DEFAULT_DATA): CoreData {
  return extendData(base, {
    parameters: {
      ...MACRO_PARAMETERS,
      ...REGIONAL_PARAMETERS,
      ...JOBS_PARAMETERS,
      ...CREDIT_PARAMETERS,
      ...HOUSING_PARAMETERS,
      ...BUSINESS_PARAMETERS,
      ...PRICES_PARAMETERS,
    },
  });
}

/**
 * Everything newGame and loadGame need to run a game with the whole economy:
 *
 *   newGame(recipe, worldGameOptions())
 */
/** A custom world's national economy at the start (M6-04): the opening month's figures the player chose. */
export interface CustomEconomy {
  unemploymentPct?: number;
  inflationPct?: number;
  policyRatePct?: number;
}

export function worldGameOptions(custom: { economy?: CustomEconomy } = {}): {
  input: (input: CoreInput) => CoreInput;
  data: CoreData;
  modules: () => readonly CoreModule[];
} {
  return {
    input: (input) =>
      withWorldEconomy(
        custom.economy
          ? {
              ...input,
              placeMetadata: {
                ...input.placeMetadata,
                [CUSTOM_ECONOMY_KEY]: JSON.stringify(custom.economy),
              },
            }
          : input,
      ),
    data: worldCoreData(),
    modules: () => [...WORLD_MODULES],
  };
}
