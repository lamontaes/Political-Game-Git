import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { casesOpenFor, handleCase } from "../core2/modules/offices";

/**
 * The cases residents brought the player's office, soonest deadline first: who, what the
 * problem is (the record's own kind) and by when it needs an answer. The cases engine's
 * records; nothing here is stored.
 */
export function officeCases(core: CoreState, officialId: string) {
  if (!core.modules.has("core2-constituent-cases-v1")) return [];
  return casesOpenFor(coreAPI(core), officialId).map((row) => {
    const person = core.people.get(row.personId);
    return {
      id: row.id,
      personId: row.personId,
      name: person ? `${person.givenName} ${person.familyName}` : "",
      problem: row.problem,
      respondBy: row.respondBy,
    };
  });
}

/** The player's decision on one of their own cases: the cases engine's `handleCase`. */
export function decideCase(
  core: CoreState,
  officialId: string,
  caseId: string,
  decision: "help" | "decline",
) {
  const api = coreAPI(core);
  const open = casesOpenFor(api, officialId).some((c) => c.id === caseId);
  if (!open) throw new Error("That is not one of your open cases.");
  const done = handleCase(api, caseId, decision);
  return { id: caseId, status: done?.status ?? null };
}
