import { birthCohortGivenName } from "./gov-rules/given-name-cohorts";
import {
  DEFAULT_CORPUS_VERSION,
  getNameCorpus,
  givenNamePoolForCorpus,
} from "./gov-rules/names-data";
import { SeededRng } from "./kernel/rng";

/** Keep a generated name unless a living sibling already carries it. */
export function distinctSiblingGivenName(
  seed: string,
  key: string,
  person: {
    givenName: string;
    familyName: string;
    birthDate: string;
    gender: string | undefined;
  },
  takenGivenNames: readonly string[],
): string {
  const taken = new Set(takenGivenNames.map((name) => name.toLowerCase()));
  if (!taken.has(person.givenName.toLowerCase())) return person.givenName;
  const corpus = getNameCorpus(DEFAULT_CORPUS_VERSION);
  const gender =
    person.gender === "male" ||
    person.gender === "female" ||
    person.gender === "nonbinary"
      ? person.gender
      : "unstated";
  const pool =
    gender === "unstated"
      ? corpus.givenNames
      : givenNamePoolForCorpus(corpus, gender);
  const available = pool.filter((name) => !taken.has(name.toLowerCase()));
  if (!available.length) throw new Error("No unused sibling name in corpus.");
  const givenName = new SeededRng(seed)
    .fork(`sibling-name:${key}`)
    .pick(available);
  const cohort = birthCohortGivenName(
    seed,
    key,
    { ...person, givenName, gender },
    takenGivenNames,
  );
  // A creator's capitalization must not turn Evelyn into a second EVELYN.
  return taken.has(cohort.toLowerCase()) ? givenName : cohort;
}
