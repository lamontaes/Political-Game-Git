import type { CoreState, PersonId, PersonInput } from "./types";

/**
 * Who is still in the wider population, for the shared chooser. The residents
 * module registers how it reads a counted person; the core asks here, so the
 * core never imports a module (owner, Oct 15: the layering stays one way).
 */
type CountedPersonSource = (
  core: CoreState,
  personId: PersonId,
) => PersonInput | undefined;

const sources: CountedPersonSource[] = [];

export function registerCountedPersonSource(source: CountedPersonSource): void {
  if (!sources.includes(source)) sources.push(source);
}

/** A counted person's record, from whichever module holds the counted population. */
export function countedPersonOf(
  core: CoreState,
  personId: PersonId,
): PersonInput | undefined {
  for (const source of sources) {
    const found = source(core, personId);
    if (found) return found;
  }
  return undefined;
}
