import {
  createStartingPerson,
  createWorldId,
  defaultPronounsForGender,
  lifePlaceByKey,
  type Person,
} from "../simulation";
import { buildSeedFor } from "./new-game-identity";
import type { NewGameSetup } from "./new-game";

/**
 * A prospective character for creator preview. Not a World, not a household,
 * and never handed to Begin as a finished life. Shirt and wardrobe choices
 * live beside this object so they cannot reshuffle who is generated later.
 */
export function prospectiveCreatorPerson(setup: NewGameSetup): Person | null {
  const place = lifePlaceByKey(setup.placeKey);
  if (!place) return null;
  const worldSeed = buildSeedFor(setup);
  const worldId = createWorldId(worldSeed, "production");
  return createStartingPerson({
    worldId,
    worldSeed,
    currentDate: place.context.initialMoment.date,
    homeJurisdictionId: place.context.jurisdiction.id,
    age: setup.startAge,
    givenName: setup.givenName,
    familyName: setup.familyName,
    appearanceRecipeVersion: setup.appearanceRecipeVersion,
    appearanceCatalogGeneration: setup.appearanceCatalogGeneration,
    ...(setup.birthMonth === undefined || setup.birthDay === undefined
      ? {}
      : { birthMonth: setup.birthMonth, birthDay: setup.birthDay }),
    ...(setup.gender === undefined || setup.gender === "unstated"
      ? {}
      : {
          identity: {
            gender: setup.gender,
            pronouns: setup.pronouns ?? defaultPronounsForGender(setup.gender),
          },
        }),
  });
}
