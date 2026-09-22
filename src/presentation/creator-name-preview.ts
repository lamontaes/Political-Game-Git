import {
  givenNamePoolForStatedGender,
  NAMES_STARTER_V1,
  SeededRng,
  type GenderIdentityKey,
} from "../simulation";

/**
 * Visible name draws for the creator (UI FINISH, ported from UX #254).
 *
 * A Randomize press fills the field with a name the player can read, keep or
 * edit; Begin then treats it exactly like a typed name. The draw uses the
 * pool of the gender the player chose and never the other way round: a name
 * never implies a gender. The draw forks its own stream from
 * the setup seed and a press counter, so it never consumes the world's RNG
 * and the same presses reproduce the same names.
 */
export type StatedGender = Exclude<GenderIdentityKey, "unstated">;

export function previewCreatorNames(
  seed: string,
  gender: StatedGender,
  salt: number,
): { readonly givenName: string; readonly familyName: string } {
  const rng = new SeededRng(seed).fork(`creator-name-preview:${salt}`);
  const givenPool = givenNamePoolForStatedGender(gender);
  return {
    givenName: rng.pick(givenPool),
    familyName: rng.pick(NAMES_STARTER_V1.familyNames),
  };
}
