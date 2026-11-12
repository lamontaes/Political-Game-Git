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
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { seatSaid } from "../english/journal-words";
import { P } from "../core2/parameters";

const one = P.one;

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

/**
 * The seat the race is for, as people say it ("the Mutual Village Council",
 * "mayor"), from the elections engine's contest and the office's record
 * through the one seat wording (`seatSaid`); nothing where the race is not
 * on record. A reporter's or moderator's line names what the candidate is
 * running for, never a stock "the race".
 */
export function seatFact(
  core: Readonly<CoreState>,
  contestId: string | null,
  recordId: string,
): Facts {
  if (!contestId || !core.modules.has(ELECTIONS_MODULE_ID)) return {};
  const api = coreAPI(core as CoreState);
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as
    { officeId: string; title: string; district: string | null } | undefined;
  if (!contest) return {};
  const office = core.modules.has(OFFICES_MODULE_ID)
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(contest.officeId) as
        { seats?: number; bodyName?: string } | undefined)
    : undefined;
  const seats = office?.seats ?? one;
  return {
    seat: {
      text: seatSaid({
        title: contest.title,
        seats,
        bodyName:
          seats > one && office?.bodyName ? properName(office.bodyName) : null,
        district: contest.district,
      }),
      sourceRecordIds: [contestId, contest.officeId, recordId],
    },
  };
}
