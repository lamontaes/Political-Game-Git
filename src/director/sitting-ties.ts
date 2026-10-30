/**
 * The ties every kind of sitting gives its lines (owner, Oct 26-29: interviews
 * and debates are scenes; the loop is `./sitting`): how the asker stands with
 * the candidate, and the outlet that hosts it. Each is a fact the bank's pieces
 * are fitted by, citing the records it rests on.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { outletsHere } from "../core2/modules/press";
import type { Facts } from "./sitting";
import { properName } from "./words";

/**
 * How the asker stands with the candidate, as the flag a line is fitted by:
 * `acquainted` where either knows the other, else `stranger`. Any kind's
 * ties use it.
 */
export function tieBetween(
  core: Readonly<CoreState>,
  candidateId: PersonId,
  askerId: PersonId,
): Facts {
  const known =
    core.people.get(candidateId)?.knownIds.has(askerId) ||
    core.people.get(askerId)?.knownIds.has(candidateId);
  return {
    [known ? "acquainted" : "stranger"]: {
      text: "yes",
      sourceRecordIds: [candidateId, askerId],
    },
  };
}

/** The outlet that hosts a sitting, by name, citing the sitting's record; nothing where the outlet is not on record. */
export function outletFact(
  core: Readonly<CoreState>,
  outletId: string | null,
  recordId: string,
): Facts {
  const outlet = outletsHere(coreAPI(core as CoreState)).find(
    (o) => o.id === outletId,
  );
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  return org
    ? {
        outlet: {
          text: properName(org.name),
          sourceRecordIds: [org.id, recordId],
        },
      }
    : {};
}
