/**
 * Prison removes a person from play for the term: they make no choices of
 * their own until release. The supported person update holds their choices
 * and restores the prior flag on release, including an originally absent flag.
 */
import type { CoreAPI, PersonId } from "./types";

/** Takes away the person's own choices; returns what the flag was. */
export function holdInCustody(
  api: CoreAPI,
  personId: PersonId,
): boolean | undefined {
  const person = api.state.people.get(personId);
  if (!person) return undefined;
  const prior = person.discretionaryEligibleV1;
  api.updatePerson(personId, { discretionaryEligibleV1: false });
  return prior;
}

/** Gives the person their own choices back as they were before custody. */
export function releaseFromCustody(
  api: CoreAPI,
  personId: PersonId,
  prior: boolean | undefined,
): void {
  if (!api.state.people.has(personId)) return;
  api.updatePerson(personId, { discretionaryEligibleV1: prior });
}
