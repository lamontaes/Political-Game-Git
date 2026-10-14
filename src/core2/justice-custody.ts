/**
 * Prison removes a person from play for the term: they make no choices of
 * their own until release. The core has no call for a module to set that
 * yet, so this writes the person's discretionary-choice flag directly and
 * remembers what it was, to give it back on release (needs OPUS-CORE: an
 * `updatePerson` change for `discretionaryEligibleV1`).
 */
import type { CoreAPI, PersonId, PersonState } from "./types";

/** Takes away the person's own choices; returns what the flag was. */
export function holdInCustody(
  api: CoreAPI,
  personId: PersonId,
): boolean | undefined {
  // stopgapId: SG-GOV-justice-custody-core-call
  api.stopgap("SG-GOV-justice-custody-core-call");
  const person = api.state.people.get(personId) as PersonState | undefined;
  if (!person) return undefined;
  const prior = person.discretionaryEligibleV1;
  person.discretionaryEligibleV1 = false;
  return prior;
}

/** Gives the person their own choices back as they were before custody. */
export function releaseFromCustody(
  api: CoreAPI,
  personId: PersonId,
  prior: boolean | undefined,
): void {
  // stopgapId: SG-GOV-justice-custody-core-call
  api.stopgap("SG-GOV-justice-custody-core-call");
  const person = api.state.people.get(personId) as PersonState | undefined;
  if (!person) return;
  if (prior === undefined) delete person.discretionaryEligibleV1;
  else person.discretionaryEligibleV1 = prior;
}
