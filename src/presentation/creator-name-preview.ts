import {
  GIVEN_NAME_GENERATION_POOLS_V1,
  NAMES_STARTER_V1,
  SeededRng,
  type GenderIdentityKey,
} from "../simulation";

/**
 * Visible name draws for the creator. Filling these fields is what Begin
 * later treats as typed names; leaving them blank still lets the generator
 * choose at world build. Clicking Randomize does not start a life.
 */
export function previewCreatorNames(
  seed: string,
  gender: GenderIdentityKey | undefined,
  salt: number,
): { readonly givenName: string; readonly familyName: string } {
  const rng = new SeededRng(seed).fork(`creator-name-preview:${salt}`);
  const givenPool =
    gender === "male"
      ? GIVEN_NAME_GENERATION_POOLS_V1.male
      : gender === "female"
        ? GIVEN_NAME_GENERATION_POOLS_V1.female
        : gender === "nonbinary"
          ? GIVEN_NAME_GENERATION_POOLS_V1.neutral
          : NAMES_STARTER_V1.givenNames;
  return {
    givenName: rng.pick(givenPool),
    familyName: rng.pick(NAMES_STARTER_V1.familyNames),
  };
}
