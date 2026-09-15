import {
  GIVEN_NAME_GENERATION_POOLS_V1,
  NAMES_STARTER_V1,
  SeededRng,
  type GenderIdentityKey,
} from "../simulation";

/**
 * Visible name draws for the creator (UI FINISH, ported from UX #254).
 *
 * A Randomize press fills the field with a name the player can read, keep or
 * edit; Begin then treats it exactly like a typed name. Leaving a field blank
 * still lets the world build choose one. The draw forks its own stream from
 * the setup seed and a press counter, so it never consumes the world's RNG
 * and the same presses reproduce the same names.
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
