/**
 * What the engines that keep a husk they can build a full person from
 * (another state's officials) say about it, read through the fields their
 * modules carry (`huskPromoter`, `huskIdentity`, `huskIncome`,
 * `unbuiltHolders`), so opening one builds the person from what the engine
 * recorded. A file of its own so the engine and the state can both import it
 * without an import cycle.
 */
import { fieldsOf } from "./module-fields";
import type { HuskInput, PersonId, PersonState, UnbuiltHolders } from "./types";
import type { CoreState } from "./types";

/**
 * A person known only by name, birth and place (another state's official, a
 * named person outside the town) is recorded as a husk, the people engine's
 * row for someone nobody has opened. The one write of the husk map from an
 * engine; one already a person or a husk is left alone.
 */
export function recordBackgroundPerson(core: CoreState, husk: HuskInput): void {
  if (core.people.has(husk.id) || core.husks.has(husk.id)) return;
  core.husks.set(husk.id, husk);
}

/** The person built for a husk by the first engine that holds its record, if any. (The other `promoteHusk`, in `people-fill-in.ts`, builds one from a husk and a full record; this one asks the engines.) */
export function promoteFromEngineRecord(
  core: CoreState,
  personId: PersonId,
): PersonState | undefined {
  for (const promote of fieldsOf(core, "huskPromoter")) {
    const promoted = promote(core, personId);
    if (promoted) return promoted;
  }
  return undefined;
}

/** Who a husk is, if an engine holds its record (the health engine books its illness and death from it). */
export function huskIdentityOf(core: CoreState, personId: PersonId) {
  for (const provider of fieldsOf(core, "huskIdentity")) {
    const found = provider(core, personId);
    if (found) return found;
  }
  return undefined;
}

/** A husk's yearly income in minor units, if an engine knows it (the pay engine, from the seat). */
export function huskIncomeOf(core: CoreState, personId: PersonId) {
  for (const provider of fieldsOf(core, "huskIncome")) {
    const found = provider(core, personId);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Every engine that keeps unbuilt holders: names on its record that the health engine books without building them. */
export function unbuiltHolderEngines(
  core: CoreState,
): readonly UnbuiltHolders[] {
  return fieldsOf(core, "unbuiltHolders");
}

/** The engine that keeps `personId` as an unbuilt holder, if any. */
export function unbuiltHolderOf(
  core: CoreState,
  personId: PersonId,
): UnbuiltHolders | undefined {
  return unbuiltHolderEngines(core).find((holders) =>
    holders.holds(core, personId),
  );
}
