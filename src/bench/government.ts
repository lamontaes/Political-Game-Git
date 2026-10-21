import { coreAPI } from "../core2/state";
import { lawHere } from "../core2/modules/laws";
import { keyPeopleOf } from "../core2/opening-key-people";
import {
  officesOfState,
  pastElections,
  seatsOfOffices,
  townSeats,
} from "../core2/modules/offices";
import { choosesPresident } from "../core2/electorate-places";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { lawChain } from "../core2/modules/laws";
import {
  checkEligibility,
  fileCandidacy,
  filingOfficeFor,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import {
  PARTIES_MODULE_ID,
  joinParty,
  partiesHere,
  partyAgreement,
  partyTie,
} from "../core2/modules/parties";
import type { CoreState } from "../core2/types";

const ELECTIONS = "core2-elections-v1";

/**
 * The parties here and the one the person belongs to, with the tie's record
 * id and how their views sit against the party's today (-1 to 1). Null where
 * the town has no parties module. A person with no tie files unaffiliated.
 */
function partyView(core: CoreState, personId: string) {
  if (!core.modules.has(PARTIES_MODULE_ID)) return null;
  const api = coreAPI(core);
  const parties = partiesHere(api);
  const tie = core.people.has(personId) ? partyTie(api, personId) : null;
  const member = parties.find((row) => row.id === tie?.partyId);
  return {
    parties: parties.map((row) => ({ id: row.id, name: row.name })),
    member:
      tie && member
        ? {
            tieId: tie.id,
            partyId: member.id,
            name: member.name,
            since: tie.since,
            agreement: partyAgreement(api, personId),
          }
        : null,
  };
}

/** The player joins a party: the tie is made and read by filing and loyalty. */
export function joinPartyAs(
  core: CoreState,
  personId: string,
  partyId: string,
) {
  joinParty(coreAPI(core), personId, partyId);
  return partyView(core, personId);
}

/**
 * Every sitting member of one state's legislature, for the Politics screen's
 * state filter: the chambers the offices engine seats for that state (made the
 * first time anything reads them), each seat with its holder. None for a key
 * that is not a state or territory.
 */
export function stateLegislators(core: CoreState, stateKey: string) {
  if (!corePlaceStateIdentities().some((s) => s.jurisdictionKey === stateKey))
    return [];
  const api = coreAPI(core);
  const chambers = officesOfState(api, stateKey).filter((office) =>
    office.kind.startsWith("legislature-"),
  );
  return seatsOfOffices(api, chambers).map(({ office, seat, holder }) => ({
    officeId: office.id,
    title: office.title,
    level: office.level,
    government: office.governmentName,
    seatId: seat.id,
    district: seat.district,
    holder: holder && {
      termId: holder.id,
      personId: holder.personId,
      givenName: holder.identity.givenName,
      familyName: holder.identity.familyName,
      party: holder.party,
    },
  }));
}

/** The states and territories the Politics screen can show, by name. */
export function politicsStates() {
  return corePlaceStateIdentities().map((s) => ({
    key: s.jurisdictionKey,
    name: s.name,
  }));
}

/**
 * The government screen's records for one person: the law in force where
 * they live, who holds each seat over them, and the open contests with the
 * filing office's rules checked for them today. Record data only.
 */
export function governmentView(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const filings = api
    .moduleState(ELECTIONS)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[];
  return {
    date: core.date,
    law: lawHere(api).map((row) => ({
      series: row.series,
      value: row.value,
      unit: row.unit,
      estimate: row.estimate,
      governing: row.governing,
      levels: row.levels,
      pending: row.pending,
    })),
    seats: townSeats(api).map(({ office, seat, holder }) => ({
      officeId: office.id,
      title: office.title,
      level: office.level,
      government: office.governmentName,
      seatId: seat.id,
      district: seat.district,
      // The seat's elections, oldest first, each named by the term it seated.
      elections: pastElections(api, seat.id),
      holder: holder && {
        termId: holder.id,
        personId: holder.personId,
        givenName: holder.identity.givenName,
        familyName: holder.identity.familyName,
        party: holder.party,
        startDate: holder.startDate,
        serviceStart: holder.serviceStart ?? holder.startDate,
        elected: holder.elected ?? null,
        endDate: holder.endDate,
        endEstimated: holder.endEstimated,
        reached: holder.reached,
      },
    })),
    // The key people the opening names (owner, Oct 15): one list, both screens.
    keyPeople: core.people.has(personId)
      ? keyPeopleOf(core, personId).map((row) => ({
          personId: row.id,
          resident: core.people.has(row.id),
          name: row.name,
          officeTitle: row.officeTitle,
          stateKey: row.stateKey,
          post: row.leads?.post ?? null,
          // The President and Vice President are known to everyone, but a
          // territory's voters do not choose them (owner ruling, Oct 19).
          chosenByHere: row.reasons.some(
            (reason) => reason === "president" || reason === "vice-president",
          )
            ? choosesPresident(lawChain(api).stateKey)
            : null,
          reasons: row.reasons,
        }))
      : [],
    contests: openContests(api).map((contest) => ({
      contest,
      filingOffice: filingOfficeFor(api, contest.id),
      checks: core.people.has(personId)
        ? checkEligibility(api, personId, contest.id)
        : [],
    })),
    filings,
    party: partyView(core, personId),
  };
}

export function fileForOffice(
  core: CoreState,
  personId: string,
  contestId: string,
  choices: { platform?: readonly string[]; party?: string | null } = {},
) {
  return fileCandidacy(coreAPI(core), {
    personId,
    contestId,
    platform: choices.platform ?? [],
    party: choices.party ?? null,
  });
}
