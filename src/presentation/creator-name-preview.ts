import {
  getNameCorpus,
  givenNamePoolForCorpus,
  nameCorpusVersionForPlace,
  PLACE_NAMES_V1_VERSION,
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
 *
 * The draw uses the names of the place already chosen, the same corpus the
 * new game will name the household from: in Puerto Rico a given name and two
 * surnames from the island's own names, not Douglas Pope.
 */
export type StatedGender = Exclude<GenderIdentityKey, "unstated">;

export function previewCreatorNames(
  seed: string,
  gender: StatedGender,
  salt: number,
  stateUsps: string | null = null,
): { readonly givenName: string; readonly familyName: string } {
  const rng = new SeededRng(seed).fork(`creator-name-preview:${salt}`);
  const corpus = getNameCorpus(
    nameCorpusVersionForPlace(stateUsps, PLACE_NAMES_V1_VERSION),
  );
  const givenName = rng.pick(givenNamePoolForCorpus(corpus, gender));
  const familyName = rng.pick(corpus.familyNames);
  return {
    givenName,
    familyName:
      corpus.surnamesCarried === 2
        ? `${familyName} ${rng.pick(corpus.familyNames)}`
        : familyName,
  };
}
