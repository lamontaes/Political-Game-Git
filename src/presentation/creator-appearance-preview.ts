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
  findCompleteOutfit,
} from "./complete-outfit";
import type { CharacterComponentLibrary } from "./character-components";
import { buildSeedFor } from "./new-game-identity";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";
import type { NewGameSetup } from "./new-game";
import {
  PREPARED_FAMILIES,
  preparedFamily,
  selectPreparedBody,
} from "./engine-people29-data";

/** A creation rule only; existing people and saved appearance are never rewritten. */
export function creatorBodyAllowed(
  setup: NewGameSetup,
  bodyFamily: string,
): boolean {
  return (
    setup.startKind === "custom" ||
    setup.gender !== "male" ||
    (preparedFamily(bodyFamily)?.geometry.presentation === "masculine" &&
      ["masculine-lean", "masculine-average", "masculine-heavy"].includes(
        preparedFamily(bodyFamily)!.bodyType,
      ))
  );
}

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
  // A descriptor marked for complete candidate outfits (for example a replay
  // from a private build) still previews in a public checkout, which carries
  // no prepared bodies to dress.
  const dressed =
    setup.appearanceOutfitVersion && PRIVATE_CANDIDATE_ART_AVAILABLE
      ? initializeFreshCandidateOutfits(
          draft,
          library,
          setup.appearanceOutfitVersion,
        )
      : draft;
  const appearance = dressed.people[person.id]?.appearance;
  const body = appearance?.selection?.bodyFamily;
  if (!appearance || !body || creatorBodyAllowed(setup, body)) return dressed;
  const pack = body.split("-")[0];
  for (const family of PREPARED_FAMILIES) {
    const candidateBody = family.parts.find(
      (part) => part.kind === "body",
    )?.logicalFamily;
    if (
      !candidateBody?.startsWith(`${pack}-`) ||
      !creatorBodyAllowed(setup, candidateBody)
    )
      continue;
    const selected = selectPreparedBody(appearance, candidateBody);
    if (!selected) continue;
    const outfit = findCompleteOutfit({
      appearance: selected,
      library,
      poseFamily: "standing-neutral",
    });
    if (outfit.ok)
      return commitCompleteOutfit(dressed, person.id, selected, {
        library,
        poseFamily: "standing-neutral",
        families: outfit.families,
      });
  }
  return dressed;
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
  // A public checkout has no prepared candidate bodies, so there is no
  // complete outfit to commit; the ordinary generated appearance stands.
  if (!choice || !PRIVATE_CANDIDATE_ART_AVAILABLE) return world;
  return commitCompleteOutfit(world, choice.personId, choice.appearance, {
    library,
    poseFamily: "standing-neutral",
    families: choice.appearance.outfit?.families,
  });
}
