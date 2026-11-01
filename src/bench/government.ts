import { properName } from "../director/words";
import { ageOnDate } from "../core2/kernel/dates";
import { parameter } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { AMOUNT_SERIES, lawHere } from "../core2/modules/laws";
import { BUDGETS_MODULE_ID, governments } from "../core2/modules/budgets";
import { keyPeopleOf } from "../core2/opening-key-people";
import { faceOf, scenePlace, type PersonFace } from "./scene";
import {
  OFFICES_MODULE_ID,
  officesOfState,
  pastElections,
  seatsOfOffices,
  townSeats,
} from "../core2/modules/offices";
import { choosesPresident } from "../core2/electorate-places";
import { federalOffices } from "../core2/offices-state";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { lawChain } from "../core2/modules/laws";
import {
  checkEligibility,
  fileCandidacy,
  filingOfficeFor,
  incumbentOf,
  playerContests,
  playerMayFileFor,
  standing,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { candidateIdentity, resultOf } from "../core2/modules/voting";
import {
  PARTIES_MODULE_ID,
  joinParty,
  partiesHere,
  partyAgreement,
  partyTie,
} from "../core2/modules/parties";
import type { CoreState } from "../core2/types";
import { ownRace } from "./results";

const LOCAL_LEVELS = new Set(["city", "township", "county"]);

/** A state's seats in Congress, as the offices engine kinds them. */
const CONGRESS_KINDS = new Set(["us-senate", "us-house"]);

/** The key-people reasons Politics lists, in the order it lists them. */
const POLITICS_KEY_ORDER: readonly string[] = [
  "own-us-senator",
  "own-us-representative",
  "own-state-legislator",
  "own-council-member",
  "president",
  "vice-president",
  "chamber-leader",
];

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
 * Every sitting member one state sends to a level's legislature, for the
 * Politics screen's filter: its own legislature's chambers at the state level,
 * its U.S. senators and representatives at the federal level. The offices
 * engine seats them the first time anything reads them; each seat comes with
 * its holder. None for a key that is not a state or territory.
 */
export function stateLegislators(
  core: CoreState,
  stateKey: string,
  level: "state" | "federal" = "state",
) {
  if (!corePlaceStateIdentities().some((s) => s.jurisdictionKey === stateKey))
    return [];
  const api = coreAPI(core);
  const chambers = officesOfState(api, stateKey).filter((office) =>
    level === "federal"
      ? CONGRESS_KINDS.has(office.kind)
      : office.kind.startsWith("legislature-"),
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
      ...holderFace(core, holder, facePlace(core, core.playerId ?? undefined)),
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
/** The winner of a seat's decided race who takes office later, if any. */
function electOf(api: ReturnType<typeof coreAPI>, seatId: string) {
  for (const contest of api
    .moduleState(ELECTIONS)
    .table("contests")
    .query("bySeat", [seatId]) as unknown as ContestRow[]) {
    const result = resultOf(api, contest.id);
    if (!result?.winnerId || !result.takesOffice) continue;
    if (result.takesOffice <= api.state.date) continue;
    const who = candidateIdentity(api, result.winnerId);
    return {
      personId: result.winnerId,
      name: who ? `${who.givenName} ${who.familyName}` : result.winnerId,
      contestId: contest.id,
      takesOffice: result.takesOffice,
    };
  }
  return null;
}

/**
 * The room a viewer's faces are drawn for: the same figure the People map
 * draws (faceOf); no room when the viewer is not a full person.
 */
export function facePlace(
  core: CoreState,
  viewerId: string | undefined,
): string {
  return viewerId && core.people.has(viewerId)
    ? scenePlace(core, viewerId).place
    : "";
}

/**
 * An officeholder's headshot: by their person id when they live here, else
 * by their term (looksOf reads a named official's identity from it). The
 * card id is what a click opens: the person, or `official:<term>` for a
 * named official not filled in (memberKey's form).
 */
export function holderFace(
  core: CoreState,
  holder: { id: string; personId?: string | null },
  place: string,
): { cardId: string; face: PersonFace | null } {
  const cardId = holder.personId ?? `official:${holder.id}`;
  return {
    cardId,
    face: place ? faceOf(core, holder.personId ?? holder.id, place) : null,
  };
}

export function governmentView(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const place = facePlace(core, personId);
  const filings = api
    .moduleState(ELECTIONS)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[];
  const seats = townSeats(api);
  // Who sets each level's law: the government its seats name ("Texas").
  const governmentOf = new Map<string, string>();
  for (const { office } of seats)
    if (!governmentOf.has(office.level))
      governmentOf.set(office.level, office.governmentName);
  // A level with no seat on the town's ballot still has its government in the
  // budgets: a rate names who sets it there too.
  if (core.modules.has(BUDGETS_MODULE_ID))
    for (const row of governments(api))
      if (!governmentOf.has(row.level))
        governmentOf.set(row.level, properName(row.name));
  // The tier a seat is listed under on the Politics screens: a state or
  // federal office is its own; every other level is local.
  const tierOf = (level: string) =>
    level === "state" || level === "federal" ? level : "local";
  // How many seats each party holds, by office and over all the town sees.
  const partySeatsByOffice: Record<string, { party: string; seats: number }[]> =
    {};
  const seatsByParty = new Map<string, { name: string; title: string }[]>();
  for (const { office, holder } of seats) {
    if (!holder?.party) continue;
    const counts = (partySeatsByOffice[office.id] ??= []);
    const row = counts.find((c) => c.party === holder.party);
    if (row) row.seats += 1;
    else counts.push({ party: holder.party, seats: 1 });
    seatsByParty.set(holder.party, [
      ...(seatsByParty.get(holder.party) ?? []),
      {
        name: `${holder.identity.givenName} ${holder.identity.familyName}`,
        title: office.title,
        // Their headshot and the id a click opens, as every person row has.
        ...holderFace(core, holder, place),
      },
    ]);
  }
  const race = ownRace(core, personId);
  return {
    date: core.date,
    partySeatsByOffice,
    parties: [...seatsByParty].map(([party, held]) => ({ party, seats: held })),
    // Every law in force here: the amounts, then each policy question a level
    // has a law on, answered yes or no.
    law: lawHere(api).map((row) => ({
      series: row.series,
      yesNo: !AMOUNT_SERIES.includes(row.series),
      value: row.value,
      unit: row.unit,
      estimate: row.estimate,
      governing: row.governing,
      levels: row.levels.map((level) => ({
        ...level,
        government: governmentOf.get(level.level) ?? null,
      })),
      pending: row.pending,
    })),
    seats: seats.map(({ office, seat, holder }) => ({
      officeId: office.id,
      title: office.title,
      level: office.level,
      tier: tierOf(office.level),
      government: office.governmentName,
      // A local seat's body as its record names it, place included ("Eolia
      // Board of Trustees"); a state chamber's name ("Senate") leaves its
      // government's name in place.
      body: LOCAL_LEVELS.has(office.level) ? (office.bodyName ?? null) : null,
      seatId: seat.id,
      district: seat.district,
      // The seat's elections, oldest first, each named by the term it seated.
      // Only races the world ran: the history before the opening carries an
      // average share for the office, not a count, so it is not shown.
      elections: pastElections(api, seat.id).filter(
        (e) =>
          (
            api.moduleState(OFFICES_MODULE_ID).table("terms").get(e.termId) as
              { reached?: string } | undefined
          )?.reached !== "in office at the opening",
      ),
      // Who won the seat's last race and has not taken office yet.
      elect: electOf(api, seat.id),
      holder: holder && {
        termId: holder.id,
        personId: holder.personId,
        ...holderFace(core, holder, place),
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
    keyPeople: core.people.has(personId)
      ? politicsKeyPeople(core, personId, place)
      : [],
    // The player files only for the offices player-offices.json lists (owner, Oct 29); the rest run in the world.
    contests: playerContests(api).map((contest) => ({
      contest,
      filingOffice: filingOfficeFor(api, contest.id),
      checks: core.people.has(personId)
        ? checkEligibility(api, personId, contest.id)
        : [],
    })),
    filings,
    nextFiling: nextFiling(core),
    // The newest race the person ran in that has a result, for its seat's row.
    ownRace: race && { ...race, tier: tierOf(race.level) },
    ofVotingAge: ofVotingAge(core, personId),
    party: partyView(core, personId),
    // The player's own state, by name, for the State and Federal filter.
    homeState: homeStateOf(api),
  };
}

/** The state the player's town is in: its key, its name and what its laws are called. */
export function homeStateOf(api: ReturnType<typeof coreAPI>) {
  const key = lawChain(api).stateKey;
  const state = corePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === key,
  );
  return {
    key,
    name: state?.name ?? key,
    levelWord: state?.levelWord ?? "State",
  };
}

/**
 * The race a player could next file for here: the open filing with the
 * soonest deadline, or else the filing that opens soonest, with the office
 * that takes it. The Politics guide reads it.
 */
function nextFiling(core: CoreState) {
  const api = coreAPI(core);
  const today = core.date;
  const opensOn = (c: ContestRow) =>
    c.filingOpens && c.filingOpens > today ? c.filingOpens : today;
  const next = (
    api
      .moduleState(ELECTIONS)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => c.filingDeadline >= today)
    .sort(
      (a, b) =>
        opensOn(a).localeCompare(opensOn(b)) ||
        a.filingDeadline.localeCompare(b.filingDeadline),
    )[0];
  if (!next) return null;
  return {
    contestId: next.id,
    title: next.title,
    filedWith: filingOfficeFor(api, next.id).filedWith,
    filingOpens: opensOn(next),
    filingDeadline: next.filingDeadline,
    primaryDate: next.primaryDate,
    electionDate: next.electionDate,
    // Dates read from no law or official calendar are shown as estimates.
    estimated: next.basis !== "read",
  };
}

/**
 * The town's next local ballot: each city, township or county seat on it,
 * with every candidate who filed, by the filing records. A race whose filing
 * is still open says when it closes; the screen marks one with a single name
 * as unopposed and one with none as unfilled.
 */
export function localRaces(core: CoreState) {
  const api = coreAPI(core);
  if (!core.modules.has(ELECTIONS)) return { date: null, races: [] };
  const elections = api.moduleState(ELECTIONS);
  const contests = (
    elections.table("contests").rows() as unknown as ContestRow[]
  ).filter(
    (contest) =>
      LOCAL_LEVELS.has(contest.level) && contest.electionDate >= core.date,
  );
  const date = contests.reduce<string | null>(
    (first, contest) =>
      !first || contest.electionDate < first ? contest.electionDate : first,
    null,
  );
  // The viewer's room, for the candidates' headshots (the same faces the
  // People map draws).
  const place = facePlace(core, core.playerId ?? undefined);
  const races = contests
    .filter((contest) => contest.electionDate === date)
    .map((contest) => {
      const filers = (
        elections
          .table("filings")
          .query("byContest", [contest.id]) as unknown as FilingRow[]
      )
        .filter(standing)
        .map((row) => {
          const who = candidateIdentity(api, row.personId);
          return {
            filingId: row.id,
            personId: row.personId,
            // The id a click opens and their face: a resident by their
            // person, a named official by their term (holderFace's rule).
            ...holderFace(
              core,
              { id: row.personId, personId: row.personId },
              place,
            ),
            name: who ? `${who.givenName} ${who.familyName}` : null,
            party: row.party ?? null,
            // Their views as filed: each stance on the filing record
            // ("question=1" for, "question=-1" against).
            stances: row.platform
              .map((entry) => {
                const [question, value] = entry.split("=");
                return { question: question ?? "", position: Number(value) };
              })
              .filter((s) => s.question && Number.isFinite(s.position)),
          };
        })
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      const office = filingOfficeFor(api, contest.id);
      return {
        contestId: contest.id,
        title: contest.district
          ? `${contest.title} (${contest.district})`
          : contest.title,
        electionDate: contest.electionDate,
        filingDeadline: contest.filingDeadline,
        filingClosed: contest.filingDeadline < core.date,
        // Filing is open today: the office takes a filing for it.
        filingOpen:
          (contest.filingOpens === null || contest.filingOpens <= core.date) &&
          contest.filingDeadline >= core.date,
        // Where a filing for it is made, for the hot link to the office.
        filedWith: office?.filedWith ?? null,
        // Whether the player may run for it (the offices the player runs
        // for, player-offices.json): the screen offers to file only then.
        playerMayFile: playerMayFileFor(api, contest.id),
        filers,
      };
    })
    // Two seats of one office on the ballot (two council seats) read the same;
    // each is told apart by whoever holds it now, from its term record.
    .map((race, _at, all) => {
      if (all.filter((other) => other.title === race.title).length < 2)
        return race;
      const holder = incumbentOf(api, race.contestId);
      return holder
        ? {
            ...race,
            title: `${race.title} (${holder.identity.givenName} ${holder.identity.familyName})`,
          }
        : race;
    })
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title) ||
        a.contestId.localeCompare(b.contestId),
    );
  return { date, races };
}

/**
 * Who Politics names as key, in the order the player reads them: their own
 * members first (U.S. senators, U.S. representative, state legislators,
 * council member), then the President and Vice President, then the person who
 * leads each chamber, named by that post and chamber. The opening's other key
 * people, the rest of the state's legislators, stay reachable behind the
 * State filter (`stateLegislators`), so this list is not a roll of the
 * legislature.
 */
function politicsKeyPeople(core: CoreState, personId: string, place: string) {
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const stateName = new Map(
    corePlaceStateIdentities().map((s) => [s.jurisdictionKey, s.name]),
  );
  const order = (reasons: readonly string[]) =>
    Math.min(
      ...reasons.map((reason) => {
        const i = POLITICS_KEY_ORDER.indexOf(reason);
        return i < 0 ? POLITICS_KEY_ORDER.length : i;
      }),
    );
  return keyPeopleOf(core, personId)
    .filter((row) => order(row.reasons) < POLITICS_KEY_ORDER.length)
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        order(a.row.reasons) - order(b.row.reasons) || a.index - b.index,
    )
    .map(({ row }) => {
      const own = row.reasons.some((reason) => reason.startsWith("own-"));
      // A member of Congress sits in their own state's seat, which this
      // world may not have loaded (a territory's world has no Senate seat at
      // all): the office is read from that state's federal offices, without
      // seating them, so a read-only screen makes no record.
      const office = (offices.get(row.officeId) ??
        (row.stateKey
          ? federalOffices(row.stateKey, "", core.date)
              .map((entry) => entry.office)
              .find((o) => o.kind === row.officeKind)
          : undefined)) as unknown as
        { governmentName?: string; title?: string } | undefined;
      return {
        personId: row.id,
        resident: core.people.has(row.id),
        // Their headshot, by person or by the term a named official's id names.
        face: place
          ? faceOf(
              core,
              row.id.startsWith("official:") ? row.id.slice(9) : row.id,
              place,
            )
          : null,
        name: row.name,
        officeTitle: row.officeTitle || (office?.title ?? ""),
        stateKey: row.stateKey,
        own,
        post: row.leads?.post ?? null,
        // The chamber a leader leads, by its record's name, and the state a
        // member of Congress serves, so a leader from elsewhere never reads
        // as the player's own member.
        chamber: row.leads ? (office?.governmentName ?? null) : null,
        stateName:
          row.leads && !own && row.stateKey
            ? (stateName.get(row.stateKey) ?? null)
            : null,
        // The President and Vice President are known to everyone, but a
        // territory's voters do not choose them (owner ruling, Oct 19).
        chosenByHere: row.reasons.some(
          (reason) => reason === "president" || reason === "vice-president",
        )
          ? choosesPresident(lawChain(api).stateKey)
          : null,
        reasons: row.reasons,
      };
    });
}

/** Whether the person is old enough to vote today. */
function ofVotingAge(core: CoreState, personId: string): boolean {
  const person = core.people.get(personId);
  return Boolean(
    person && ageOnDate(person.birthDate, core.date) >= parameter("votingAge"),
  );
}

export function fileForOffice(
  core: CoreState,
  personId: string,
  contestId: string,
  choices: { platform?: readonly string[]; party?: string | null } = {},
) {
  if (!playerMayFileFor(coreAPI(core), contestId))
    throw new Error(
      "The player files only for the place's own council or its equivalent, its mayor or its equivalent, the state legislature, governor, Congress and president.",
    );
  return fileCandidacy(coreAPI(core), {
    personId,
    contestId,
    platform: choices.platform ?? [],
    party: choices.party ?? null,
  });
}
