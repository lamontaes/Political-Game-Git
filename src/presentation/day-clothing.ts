import type { EntityId, Person, World } from "../simulation";
import { officesHeldBy } from "../simulation/governing/office-consequence";
import { isMarriedNow } from "./appearance-engine/marital-status";
import type { EngineRecipe, OutfitTag } from "./appearance-engine/pack";
import {
  engineRecipeFor,
  type EngineRecipeOptions,
} from "./appearance-engine/recipe";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import { placeWear } from "./dress-code";
import { workplacePlaceForPerson } from "./place-backdrops";
import { workUniform } from "./work-uniform";

/** Places whose staff dress for work, whatever the room itself calls for. */
export const STAFF_WEAR: Readonly<Record<string, "business" | "casual">> = {
  "clerk-counter": "business",
  "hospital-hallway": "business",
  classroom: "business",
  "church-supper-hall": "business",
  office: "business",
  "county-party-office": "business",
  "campaign-storefront": "business",
};

/**
 * What a person wears today (OW-9): dressed for the place they work, in its
 * uniform when the job has one, else their own casual clothes. It depends on
 * the person and the day only, never on which screen draws them, so the card
 * and every scene show the same outfit.
 */
export function dayClothing(
  world: World,
  personId: EntityId,
): Pick<EngineRecipeOptions, "wear" | "uniform"> {
  const workplace = workplacePlaceForPerson(world, personId);
  const wear: Exclude<OutfitTag, "uniform"> = workplace
    ? (STAFF_WEAR[workplace] ?? placeWear(workplace, world.currentDate))
    : "casual";
  const uniform = workUniform(world, personId, wear);
  return uniform ? { wear, uniform } : { wear };
}

/** The one recipe for a person today; a scene adds only how they stand. */
export function personDayRecipe(
  world: World,
  person: Person,
  pose: Omit<
    EngineRecipeOptions,
    "wear" | "uniform" | "officeholder" | "married"
  > = {},
): EngineRecipe | null {
  return engineRecipeFor(person, world.currentDate, PEOPLE_PACK, {
    ...dayClothing(world, person.id),
    officeholder: () => officesHeldBy(world, person.id).length > 0,
    married: () => isMarriedNow(world, person.id),
    ...pose,
  });
}
