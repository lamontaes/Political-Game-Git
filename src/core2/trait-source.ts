import type { PersonInput, Source } from "./types";

/** Explicit trait overrides keep their authority; a shared prior covers only recorded traits. */
export function recordedTraitSource(
  person: Pick<PersonInput, "traits" | "traitSources" | "sharedTraitSource">,
  traitId: string,
): Source | undefined {
  return (
    person.traitSources?.[traitId] ??
    (Object.prototype.hasOwnProperty.call(person.traits, traitId)
      ? person.sharedTraitSource
      : undefined)
  );
}
