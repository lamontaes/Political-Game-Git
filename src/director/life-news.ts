/**
 * What happened in a person's life since a day, read from the records the
 * world keeps: a child born into their household, a wedding, a move, a new
 * job, a serious illness. A reunion says it of the one who has come back; a
 * letter says it of the one who wrote. Each fact is cited to the records it
 * came from, and a fact with no record behind it is left out, so the lines
 * that need it never play.
 */
import { FAMILY_MARRIED } from "../core2/modules/partnerships";
import { P } from "../core2/parameters";
import { MOVED_AWAY_EVENT } from "../core2/modules/moves";
import type { CoreState, PersonId } from "../core2/types";
import { properName } from "./words";

export interface NewsFact {
  text: string;
  sourceRecordIds: string[];
}

/** The health engine's record of a serious illness beginning. */
export const ILLNESS_EVENT = "health.serious-illness";

/** The records of a kind that name a person, dated after `since`, the newest first. */
export function recordsSince(
  core: Readonly<CoreState>,
  personId: PersonId,
  kind: string,
  since: string,
  until: string = core.date,
) {
  return [...(core.logByPerson.get(personId) ?? [])]
    .map((id) => core.durableLog.get(id))
    .filter(
      (row) => row?.kind === kind && row.date > since && row.date <= until,
    )
    .sort(
      (a, b) => b!.date.localeCompare(a!.date) || a!.id.localeCompare(b!.id),
    )
    .map((row) => row!);
}

/**
 * What changed for `personId` after `since`: `new-child` (the youngest child
 * born in their household), `married` (the spouse's first name), `moved`
 * (a move away, the person's own record), `new-employer`
 * (a work commitment that began), `ill` (a serious illness began). The
 * player's own household is left out, since the player knows it.
 */
export function newsSince(
  core: Readonly<CoreState>,
  personId: PersonId,
  since: string,
  leaveHousehold: string,
  until: string = core.date,
): Record<string, NewsFact> {
  const facts: Record<string, NewsFact> = {};
  const person = core.people.get(personId);
  if (!person) return facts;
  const today = until;
  const put = (key: string, text: string, ids: string[]) => {
    facts[key] = { text, sourceRecordIds: ids };
  };

  const home = core.households.get(person.householdId);
  if (home && person.householdId !== leaveHousehold) {
    const baby = (home.memberIds ?? [])
      .map((id) => core.people.get(id as PersonId))
      .filter(
        (row) =>
          row?.alive &&
          row.id !== personId &&
          row.birthDate > since &&
          row.birthDate <= today,
      )
      .sort((a, b) => b!.birthDate.localeCompare(a!.birthDate))
      .at(P.zero);
    if (baby) put("new-child", baby.givenName, [baby.id, person.householdId]);
  }

  const wedding = recordsSince(core, personId, FAMILY_MARRIED, since, until).at(
    P.zero,
  );
  if (wedding) {
    const spouse = wedding.personIds
      .filter((id) => id !== personId)
      .map((id) => core.people.get(id))
      .find((row) => row?.alive);
    if (spouse) put("married", spouse.givenName, [wedding.id, spouse.id]);
  }

  const moved = recordsSince(core, personId, MOVED_AWAY_EVENT, since, until).at(
    P.zero,
  );
  if (moved) put("moved", "yes", [moved.id]);

  const commitment = [...(core.work.commitmentsByPerson.get(personId) ?? [])]
    .map((id) => core.work.commitments.get(id))
    .filter(
      (row) =>
        row && !row.endsAt && row.startsAt > since && row.startsAt <= until,
    )
    .sort((a, b) => b!.startsAt.localeCompare(a!.startsAt))
    .at(P.zero);
  const job = commitment ? core.jobs.get(commitment.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (commitment && job && org && !job.endsAt) {
    put("new-employer", properName(org.name), [job.id, org.id]);
  }

  const illness = recordsSince(core, personId, ILLNESS_EVENT, since, until).at(
    P.zero,
  );
  if (illness) put("ill", "yes", [illness.id]);
  return facts;
}
