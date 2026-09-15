import {
  createStartingPerson,
  createWorld,
  type World,
  type PersonAppearance,
  createWorldId,
  defaultPronounsForGender,
  lifePlaceByKey,
  type Person,
} from "../simulation";
import {
  commitCompleteOutfit,
  initializeFreshCandidateOutfits,
} from "./complete-outfit";
import type { CharacterComponentLibrary } from "./character-components";
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

/** Isolated editor record: one prospective person, no life/history/household generation. */
export function creatorAppearanceDraft(
  setup: NewGameSetup,
  library: CharacterComponentLibrary,
): World | null {
  const person = prospectiveCreatorPerson(setup);
  const place = lifePlaceByKey(setup.placeKey);
  if (!person || !place) return null;
  const draft = createWorld({
    seed: buildSeedFor(setup),
    lineage: "production",
    currentDate: place.context.initialMoment.date,
    currentMoment: place.context.initialMoment,
    jurisdictions: [place.context.jurisdiction],
    people: [person],
    control: { kind: "person", personId: person.id },
  });
  return setup.appearanceOutfitVersion
    ? initializeFreshCandidateOutfits(
        draft,
        library,
        setup.appearanceOutfitVersion,
      )
    : draft;
}

export interface CreatorAppearanceChoice {
  readonly personId: string;
  readonly appearance: PersonAppearance;
}

/** Called only after the ordinary life constructor, once. No generator input changes. */
export function applyCreatorAppearance(
  world: World,
  choice: CreatorAppearanceChoice | null,
  library: CharacterComponentLibrary,
): World {
  if (!choice) return world;
  return commitCompleteOutfit(world, choice.personId, choice.appearance, {
    library,
    poseFamily: "standing-neutral",
    families: choice.appearance.outfit?.families,
  });
}
