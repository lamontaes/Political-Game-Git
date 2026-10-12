/** Raw saved budget/work records, compiled geography and dated life/credential sources. */
import { employmentFacts } from "./employment-facts";
import { laborReadingFacts } from "./labor-facts";
import { budgetFacts } from "./budget-facts";
import { hasLifePathCredential } from "../../../simulation/life-paths2";
import {
  STAFFED_PROGRAMS,
  staffingSourceKey,
  type StaffingFacts,
} from "../public-staffing";
import type { World, EntityId } from "../../../simulation/types";
export function staffingFacts(world: World, town: EntityId): StaffingFacts {
  return {
    ...employmentFacts(world, town),
    macroEconomy: world.macroEconomy,
    labor: laborReadingFacts(world),
    budgetViews: budgetFacts(world, [town], [world.currentDate]).views,
    credentials: new Map(
      world.personOrder.flatMap((id) =>
        STAFFED_PROGRAMS.flatMap((row) =>
          row.credential
            ? [
                [
                  staffingSourceKey(id, row.credential),
                  hasLifePathCredential(world, id, row.credential),
                ] as const,
              ]
            : [],
        ),
      ),
    ),
  };
}
