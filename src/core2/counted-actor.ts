import { fieldsOf } from "./module-fields";
import type { CoreState, PersonId, PersonInput } from "./types";

/**
 * Who is still in the wider population, for the shared chooser. The engine
 * that keeps the counts carries how it reads a counted person as the module's
 * `countedPerson`; the core asks every installed engine here, so the core
 * never imports a module (owner, Oct 15: the layering stays one way).
 */

/** A counted person's record, from whichever module holds the counted population. */
export function countedPersonOf(
  core: CoreState,
  personId: PersonId,
): PersonInput | undefined {
  for (const read of fieldsOf(core, "countedPerson")) {
    const found = read(core, personId);
    if (found) return found;
  }
  return undefined;
}
