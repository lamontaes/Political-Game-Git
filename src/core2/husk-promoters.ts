/**
 * Engines that keep a husk they can build a full person from (another
 * state's officials) register here, so opening one builds the person from
 * what the engine recorded. A file of its own so the engine and the state
 * can both import it without an import cycle.
 */
import type { PersonId, PersonState } from "./types";
import type { CoreState } from "./types";

type Promoter = (
  core: CoreState,
  personId: PersonId,
) => PersonState | undefined;

const promoters: Promoter[] = [];

export function registerHuskPromoter(promoter: Promoter): void {
  if (!promoters.includes(promoter)) promoters.push(promoter);
}

/** The person built for a husk by the first engine that holds its record, if any. */
export function promoteHusk(
  core: CoreState,
  personId: PersonId,
): PersonState | undefined {
  for (const promote of promoters) {
    const promoted = promote(core, personId);
    if (promoted) return promoted;
  }
  return undefined;
}
