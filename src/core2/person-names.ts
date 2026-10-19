/**
 * A generated person's name, drawn from the name corpora so that it agrees
 * with the identity the person was already given. Moved from the old engine's
 * `people.ts`; the opening, births and arrivals draw names here.
 */
import type { SeededRng } from "./kernel/rng";
import {
  DEFAULT_CORPUS_VERSION,
  getNameCorpus,
  givenNamePoolForCorpus,
} from "./gov-rules/names-data";
import type { GenderIdentityKey, PersonIdentity } from "./gov-rules/types";

/**
 * A name off the whole corpus, with nothing said about who is carrying it.
 *
 * Deliberately off the module's surface. It was on it, and that is most of why a man came out
 * named Maria: a writer that wanted a name reached for the loose draw, got one
 * with no argument to fill in, and never learned that a gendered draw existed
 * two functions down. Sixteen routes did exactly that. Correcting sixteen
 * callers while leaving the loose draw on the module's surface only waits for
 * the seventeenth, so the surface is now `drawCanonicalNameForGender`, whose
 * gender argument is required. A route that genuinely knows nothing passes
 * `"unstated"` and lands back here, which is the same draw and a declaration
 * instead of an omission. The one narrow exception is `drawCanonicalName`
 * below, which exists so a pre-fix save still replays byte-for-byte.
 */
function drawUnrestrictedName(
  rng: SeededRng,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): { readonly givenName: string; readonly familyName: string } {
  const corpus = getNameCorpus(corpusVersion);
  const givenName = rng.pick(corpus.givenNames);
  const familyName = rng.pick(corpus.familyNames);
  return {
    givenName,
    familyName:
      corpus.surnamesCarried === 2
        ? `${familyName} ${rng.pick(corpus.familyNames)}`
        : familyName,
  };
}

export const LEGACY_GIVEN_NAME_GENERATION_VERSION = "given-name-v1";
export const DISTINCT_GIVEN_NAME_GENERATION_VERSION = "given-name-v2";
/**
 * v2, and then a generated person's given name follows the year they were
 * born (`given-name-cohorts.ts`). The draw itself is v2's; the cohort is
 * applied once the birth date is known, by the routes that write the person.
 */
export const COHORT_GIVEN_NAME_GENERATION_VERSION = "given-name-v3";
export type GivenNameGenerationVersion =
  | typeof LEGACY_GIVEN_NAME_GENERATION_VERSION
  | typeof DISTINCT_GIVEN_NAME_GENERATION_VERSION
  | typeof COHORT_GIVEN_NAME_GENERATION_VERSION;

export function drawCanonicalNameForGender(
  rng: SeededRng,
  gender: GenderIdentityKey,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
  generationVersion: GivenNameGenerationVersion = LEGACY_GIVEN_NAME_GENERATION_VERSION,
  takenGivenNames: readonly string[] = [],
): { readonly givenName: string; readonly familyName: string } {
  const drawn = drawUnrestrictedName(rng, corpusVersion);
  if (gender === "unstated") return drawn;
  const pool = givenNamePoolForCorpus(getNameCorpus(corpusVersion), gender);
  if (generationVersion === LEGACY_GIVEN_NAME_GENERATION_VERSION) {
    return {
      givenName: rng.fork("canonical-name:gendered-given-name").pick(pool),
      familyName: drawn.familyName,
    };
  }
  const offset = rng
    .fork(
      `canonical-name:gendered-given-name:${drawn.givenName}:${drawn.familyName}`,
    )
    .integer(0, pool.length);
  const taken = new Set(takenGivenNames);
  let givenName = pool[offset] as string;
  for (let step = 0; step < pool.length && taken.has(givenName); step += 1) {
    givenName = pool[(offset + step + 1) % pool.length] as string;
  }
  return { givenName, familyName: drawn.familyName };
}

/**
 * A name and the identity it agrees with, drawn as one act.
 *
 * `drawCanonicalNameForGender` has existed since OCD-UI-003 and is correct.
 * The defect it was written for kept happening anyway, because honoring it is
 * opt-in: a writer that draws a name on one stream and an identity on another
 * gets a person whose two halves were never introduced, and nothing complains.
 * Measured on this branch before the repair, an adult start in Lexington gave
 * 29 of 72 generated people a given name from the opposite pool — the owner
 * met a man called Maria and correctly called him "your dad".
 *
 * So the pairing is the unit. A route passes the identity it already draws —
 * on its own stream, under its own key, so no generated gender moves — and
 * gets back the name together with it. There is one call, one spread, and no
 * way to take the name without the identity that shaped it.
 *
 * The direction is still OCD-UI-003's: gender is the input, and no name is
 * ever read backwards to decide one. An `unstated` identity keeps the
 * unrestricted draw, because a person the world says nothing about must not be
 * given a name that implies something.
 */
export function drawCanonicalNamedIdentity(
  rng: SeededRng,
  identity: PersonIdentity,
  options: {
    readonly corpusVersion?: string;
    readonly generationVersion?: GivenNameGenerationVersion;
    readonly takenGivenNames?: readonly string[];
  } = {},
): {
  readonly givenName: string;
  readonly familyName: string;
  readonly identity: PersonIdentity;
} {
  return {
    ...drawCanonicalNameForGender(
      rng,
      identity.gender,
      options.corpusVersion,
      options.generationVersion ?? LEGACY_GIVEN_NAME_GENERATION_VERSION,
      options.takenGivenNames ?? [],
    ),
    identity,
  };
}
