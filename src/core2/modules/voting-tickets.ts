/**
 * Running mates and tickets.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { makeIsoDate } from "../kernel/dates";
import { lawChain } from "./laws";
import { VOTING_MODULE_ID } from "../voting-module-id";
import { fillInIdentity } from "../state";
import {
  ambitionOf,
  partyOf,
  raceScope,
  standingPool,
} from "../candidate-pool";
import { drawStateHome } from "../places";
import type { CoreAPI, CoreState, PersonId, PlaceId } from "../types";
import type { ModuleRow } from "../module-data";
import {
  announce,
  contestsOnDate,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
  runningMateOf,
  ticketGovernorContest,
  ticketOfficeContest,
  ticketStageOf,
} from "./elections";
import {
  OFFICES_MODULE_ID,
  seatWinner,
  electedWithGovernorOnTicket,
  unheldVacancyWon,
  type TermRow,
  officeById,
  servingTermsOnSeat,
  seatById,
} from "./offices";
import {
  INDEPENDENT,
  type WeighedPerson,
  candidateChoices,
  currentOfficial,
  officialCandidate,
} from "./officials";
import { PARTIES_MODULE_ID, joinParty, partiesHere, partyTie } from "./parties";
import { voterLean } from "./voting-appeal";
import {
  drawOfficialIdentity,
  holds,
  seatHolder,
  table,
  town,
  workFromHome,
} from "./voting-base";
import type { ResultRow } from "./voting-base";
import type {
  PresidentialRow,
  Race,
  SpecialCandidate,
  SpecialRace,
} from "./voting-college";
import { settleCount, termStartsOn, winningPersonId } from "./voting-count";
import type { RaceRow } from "./voting-outside-races";
import { officialCandidateId } from "./voting-primary";
import { heldByRecount, keepCount, placesOf } from "./voting-returns";

/** The ticket a running mate is weighed for: one governor candidate's, in the ticket office's contest. */
function ticketOf(governorFiling: FilingRow, ticketContest: ContestRow) {
  // No "|" in the id: a newcomer offered takes their person id from it, and
  // the money engines key payments as "<government>|<person>" (a "|" in a
  // person id cut the payee short at the month's food aid, Nov 14).
  return {
    id: `${ticketContest.id}:ticket:${governorFiling.personId}`,
    seatId: ticketContest.seatId,
    electionDate: ticketContest.electionDate,
  };
}

/** How many people of their party a player running for governor chooses a running mate from (owner, Nov 14). */
const RUNNING_MATE_CHOICES = 4;

/**
 * A governor candidate's ticket, as their campaign shows it: the ticket
 * office's contest, the running mate once named, and, while the candidate
 * may still name one (the player, from filing where the state's law joins
 * the ticket then, else from the primary), the people of their party the
 * world's own pick ranks, strongest first (owner, Nov 14: the player picks,
 * or "Choose for me" takes the world's pick). Null where the governor's
 * state elects no office on the ticket.
 */
export function runningMateChoice(
  api: CoreAPI,
  governorFilingId: string,
  /**
   * Whether a person offered would say yes to the player's ask (the
   * serve-asks engine's read). Where none of the people offered would, the
   * strongest of the wider ranking who would takes the last place, so a
   * player is never offered only people who will turn them down.
   */
  willing?: (personId: string) => boolean,
): {
  readonly ticketContestId: string;
  readonly office: string;
  readonly mateId: string | null;
  readonly choices: readonly {
    readonly id: string;
    readonly name: string;
    /** The seat their officials' record names: held now, or held before. */
    readonly seatId: string | null;
    /** Their standing in the state beyond a seat (`standingPool`): party officer, former candidate, prominent. */
    readonly roles: readonly string[];
  }[];
} | null {
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const filing = elections.table("filings").get(governorFilingId) as unknown as
    FilingRow | undefined;
  if (!filing) return null;
  const governor = elections
    .table("contests")
    .get(filing.contestId) as unknown as ContestRow | undefined;
  const ticket = governor ? ticketOfficeContest(api, governor) : null;
  if (!governor || !ticket) return null;
  const mate = runningMateOf(api, filing, ticket);
  return {
    ticketContestId: ticket.id,
    office: ticket.title,
    mateId: mate?.personId ?? null,
    choices:
      mate || !mayNameRunningMate(api, governor, ticket)
        ? []
        : offeredMates(api, filing, governor, ticket, willing),
  };
}

/** How many of the wider ranking are weighed for a willing person when none of those offered would say yes. */
const RUNNING_MATE_WIDER = 3;

/**
 * The people of the player's party offered as running mates, strongest
 * first, each filled in when offered; where a `willing` read is given and
 * none of them would say yes, the strongest willing person further down the
 * ranking takes the last place (filled in only until one is found).
 */
function offeredMates(
  api: CoreAPI,
  filing: FilingRow,
  governor: ContestRow,
  ticket: ContestRow,
  willing?: (personId: string) => boolean,
) {
  const party = filing.party ?? INDEPENDENT;
  // Nobody who holds or runs for the office the candidate seeks is offered
  // to run beside them (Words lead, Nov 14: Glencoe KY offered the sitting
  // governor as a challenger's running mate).
  const holder = seatHolder(api, governor);
  const rivals = new Set<string>(
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byContest", [governor.id]) as unknown as FilingRow[]
    )
      .filter((f) => f.status !== "withdrawn")
      .map((f) => f.personId),
  );
  const official = currentOfficial(api, governor.seatId)?.id;
  const seeks = (id: string) =>
    rivals.has(id) || holds(holder, id) || id === official;
  const ranked = candidateChoices(
    api,
    ticketOf(filing, ticket),
    party,
    (willing
      ? RUNNING_MATE_CHOICES * RUNNING_MATE_WIDER
      : RUNNING_MATE_CHOICES) + RUNNING_MATE_CHOICES,
    weighableFor(api, filing, ticket),
  )
    .filter((c) => !seeks(c.id))
    .slice(
      0,
      willing
        ? RUNNING_MATE_CHOICES * RUNNING_MATE_WIDER
        : RUNNING_MATE_CHOICES,
    );
  // A newcomer offered is filled in now (two-level rule: a person is filled
  // in when the player meets them), with a home town and work, so the choice
  // can be weighed.
  const offer = (c: (typeof ranked)[number]) => {
    if (c.newcomer) offerNewcomer(api, c.id, c.newcomer, filing.party ?? null);
    return {
      id: c.id,
      name: `${c.givenName} ${c.familyName}`,
      seatId: c.fromSeatId,
      roles:
        standingPool(api, raceScope(api, ticket))
          .find((m) => m.personId === c.id)
          ?.roles.filter((r) => r !== "officeholder") ?? [],
    };
  };
  const shown = ranked.slice(0, RUNNING_MATE_CHOICES).map(offer);
  if (!willing || shown.some((c) => willing(c.id))) return shown;
  for (const c of ranked.slice(RUNNING_MATE_CHOICES)) {
    const row = offer(c);
    if (willing(row.id))
      return [...shown.slice(0, RUNNING_MATE_CHOICES - 1), row];
  }
  return shown;
}

/**
 * Who a ticket's pick may be weighed among beyond the officeholders: the
 * people with standing in the state (party officers, former candidates,
 * prominent people: `standingPool`) and, for the player's own ticket, the
 * people they know, each of the candidate's party, old enough and living in
 * the state for the office (`checkEligibility`), with their ambition and
 * lean from their own record. Anyone already on that day's ballot is out.
 */
function weighableFor(
  api: CoreAPI,
  filing: FilingRow,
  ticket: ContestRow,
): {
  readonly people: readonly WeighedPerson[];
  readonly exclude: ReadonlySet<string>;
} {
  const party = filing.party ?? null;
  const exclude = new Set<string>([filing.personId]);
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  for (const contest of contestsOnDate(api, ticket.electionDate))
    for (const f of elections
      .table("filings")
      .query("byContest", [contest.id]) as unknown as FilingRow[])
      if (f.status !== "withdrawn") exclude.add(f.personId);
  const playerId = (api.state as CoreState).playerId;
  const ids = new Set<string>(
    standingPool(api, raceScope(api, ticket)).map((m) => m.personId),
  );
  if (filing.personId === playerId)
    for (const id of api.state.people.get(playerId)?.knownIds ?? [])
      ids.add(id);
  const people: WeighedPerson[] = [];
  for (const id of [...ids].sort()) {
    if (exclude.has(id)) continue;
    const person = api.state.people.get(id);
    if (!person || person.alive === false) continue;
    if ((partyOf(api, id as PersonId) ?? null) !== party) continue;
    if (
      checkEligibility(api, id, ticket.id, party).some(
        (c) => !c.met && (c.rule === "minimum-age" || c.rule === "residency"),
      )
    )
      continue;
    people.push({
      id,
      ambition: ambitionOf(person),
      lean: voterLean(api, person),
    });
  }
  return { people, exclude };
}

/**
 * A newcomer offered as a running mate, filled in: their name, birthday and
 * temperament as the officials engine drew them, a home town in the state
 * drawn from the world's seed among its towns by how many people live in
 * each, and the work that town's counts show (`metResident`, as a person
 * met on a trip is filled in). Seeded, so the same person comes back.
 */
function offerNewcomer(
  api: CoreAPI,
  id: string,
  newcomer: NonNullable<
    ReturnType<typeof candidateChoices>[number]["newcomer"]
  >,
  party: string | null,
): void {
  if (api.state.people.has(id)) return;
  const seed = (api.state as CoreState).seed;
  const home = drawStateHome(seed, id, newcomer.stateKey);
  const work = home
    ? workFromHome(seed, home.key, `running-mate:${id}`)
    : undefined;
  fillInIdentity(api.state as CoreState, {
    id: id as PersonId,
    givenName: newcomer.identity.givenName,
    familyName: newcomer.identity.familyName,
    birthDate: makeIsoDate(newcomer.identity.birthDate),
    placeId: (home?.context.jurisdiction.id ?? newcomer.stateKey) as PlaceId,
    gender: newcomer.identity.gender,
    ...(party ? { party } : {}),
    traits: newcomer.traits,
    tier: "monthly",
    ...(work ? { work } : {}),
    source: {
      tag: "ESTIMATED",
      citation: `offered as a running mate on ${api.state.date}`,
      asOf: makeIsoDate(api.state.date),
      estimatedFrom:
        "world seed and the home town's counts (officials-identity)",
    },
  });
}

/**
 * Whether a governor candidate may name their running mate today, by the
 * state's law for when the ticket forms: from filing, or once the primary
 * is past; never where the office wins a primary of its own.
 */
function mayNameRunningMate(
  api: CoreAPI,
  governor: ContestRow,
  ticket: ContestRow,
): boolean {
  const stage = ticketStageOf(api, ticket);
  if (stage === "at-filing") return true;
  if (stage === "after-primary")
    return !governor.primaryDate || governor.primaryDate < api.state.date;
  return false;
}

/**
 * The player names their running mate: one of `runningMateChoice`'s people,
 * or, with none named, the world's own pick ("Choose for me").
 */
export function chooseRunningMate(
  api: CoreAPI,
  governorFilingId: string,
  personId: string | null,
  /** The same willing read the choice was offered with (`runningMateChoice`). */
  willing?: (personId: string) => boolean,
  /** People the player already asked, who stay theirs to name though the ranking moved on. */
  asked: readonly string[] = [],
): FilingRow {
  const choice = runningMateChoice(api, governorFilingId, willing);
  if (!choice || choice.mateId !== null || !choice.choices.length)
    throw new Error("There is no running mate to name for this race.");
  if (
    personId !== null &&
    !choice.choices.some((c) => c.id === personId) &&
    !asked.includes(personId)
  )
    throw new Error(
      "That person isn't one of the running mates to choose from.",
    );
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const filing = elections
    .table("filings")
    .get(governorFilingId) as unknown as FilingRow;
  const ticket = elections
    .table("contests")
    .get(choice.ticketContestId) as unknown as ContestRow;
  return nameRunningMate(api, filing, ticket, personId ?? undefined)!;
}

/**
 * A governor candidate's running mate, named once: the ticket office's
 * candidate the state's own pick for that party would field, weighed for
 * this ticket alone (`officialCandidate`: the officeholder one step down the
 * ladder or a newcomer, whoever has the strongest reason), so two
 * candidates of one party in a primary never share a running mate. Filed in
 * the ticket office's contest on the governor candidate's ticket, with no
 * petition of its own: it stands while the governor candidate does (`ballot`).
 */
export function nameRunningMate(
  api: CoreAPI,
  governorFiling: FilingRow,
  ticketContest: ContestRow,
  /** One of `runningMateChoice`'s people, where the candidate picked (the player); else the strongest. */
  chosenId?: string,
): FilingRow | null {
  const held = runningMateOf(api, governorFiling, ticketContest);
  if (held) return held;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const picked = officialCandidate(
    api,
    ticketOf(governorFiling, ticketContest),
    governorFiling.party ?? INDEPENDENT,
    chosenId,
    true,
    chosenId ? weighableFor(api, governorFiling, ticketContest) : undefined,
  );
  // Where the officials engine isn't installed: a named official not yet
  // filled in, as a party's nominee is (`fileStandingCandidates`).
  if (!picked) {
    // stopgapId: SG-GOV-who-runs-stand-in
    api.stopgap("SG-GOV-who-runs-stand-in");
  }
  const personId =
    picked ?? officialCandidateId(`running-mate:${governorFiling.id}`);
  const filing: FilingRow = {
    id: `filing:${ticketContest.id}:${personId}`,
    contestId: ticketContest.id,
    personId,
    filedOn: api.state.date,
    filedWith: governorFiling.filedWith,
    platform: [...governorFiling.platform],
    party: governorFiling.party ?? null,
    status: "on-ballot",
    how: "running mate",
    ticketWith: governorFiling.id,
  };
  // A partyHere member, as a party's nominee joins it the day they file.
  const partyHere =
    filing.party && api.state.modules.has(PARTIES_MODULE_ID)
      ? partiesHere(api).find((row) => row.name === filing.party)
      : undefined;
  if (partyHere && api.state.people.has(personId) && !partyTie(api, personId))
    joinParty(api, personId, partyHere.id);
  filings.put(filing as unknown as ModuleRow);
  announce(api, filing, ticketContest);
  return filing;
}

/**
 * Put each governor candidate's running mate on the ticket, by the state's
 * law for when the ticket forms (`ticketStageOf`): at filing; after the
 * primary, by the nominee; or, where the ticket office wins a primary of its
 * own, its party's one nominee joins its party's one governor nominee. On
 * election day every governor candidate still alone names a running mate
 * and a ticket office candidate with no governor beside them leaves the
 * race: the law elects the two together.
 */
export function formTickets(
  api: CoreAPI,
  contest: ContestRow,
  when: "filing" | "primary" | "election",
): void {
  const governor =
    ticketOfficeContest(api, contest) !== null
      ? contest
      : ticketGovernorContest(api, contest);
  if (!governor) return;
  const ticket = ticketOfficeContest(api, governor);
  if (!ticket) return;
  const stage = ticketStageOf(api, ticket);
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  // A running mate whose governor candidate left the race (a primary lost,
  // a withdrawal) leaves it with them.
  const standingIds = new Set(ballot(api, governor.id).map((f) => f.id));
  for (const m of filings.query("byContest", [
    ticket.id,
  ]) as unknown as FilingRow[])
    if (
      m.ticketWith &&
      m.status !== "withdrawn" &&
      !standingIds.has(m.ticketWith)
    )
      filings.put({ ...m, status: "withdrawn" } as unknown as ModuleRow);
  const alone = () =>
    ballot(api, governor.id).filter((f) => !runningMateOf(api, f, ticket));
  if (stage === "separate-primary") {
    const unpaired = () => ballot(api, ticket.id).filter((f) => !f.ticketWith);
    // Once both nominations are made, every ticket is whole: a nominee
    // with no governor candidate of their party leaves the race.
    const settled =
      when === "election" ||
      (when === "primary" &&
        nominated(api, governor) &&
        nominated(api, ticket));
    for (const f of alone()) {
      const mates = unpaired().filter((m) => f.party && m.party === f.party);
      const sameParty = ballot(api, governor.id).filter(
        (g) => g.party === f.party,
      );
      if (mates.length === 1 && sameParty.length === 1)
        filings.put({
          ...mates[0]!,
          ticketWith: f.id,
        } as unknown as ModuleRow);
      else if (!f.party || settled) nameRunningMate(api, f, ticket);
    }
    if (settled)
      for (const m of unpaired())
        filings.put({ ...m, status: "withdrawn" } as unknown as ModuleRow);
    return;
  }
  const playerId = (api.state as CoreState).playerId;
  // The player names their own running mate (`chooseRunningMate`): the
  // world names one for them only once the ticket must be whole, at the
  // primary where the law joins it at filing, else on election day.
  const playerWaits = (f: FilingRow) =>
    f.personId === playerId &&
    (when === "filing" || (when === "primary" && stage === "after-primary"));
  if (
    stage === "at-filing" ||
    when !== "filing" ||
    // Where the state holds no primary for the office, its candidates are
    // its nominees when filing closes.
    !governor.primaryDate
  )
    for (const f of alone())
      if (!playerWaits(f)) nameRunningMate(api, f, ticket);
}

/**
 * Whether a contest's nominees are settled: no primary, or its primary
 * counted (a primary later today has not run yet), so a ticket formed now
 * is the one on the ballot.
 */
function nominated(api: CoreAPI, contest: ContestRow): boolean {
  if (!contest.primaryDate || contest.primaryDate < api.state.date) return true;
  if (contest.primaryDate > api.state.date) return false;
  return (
    api.moduleCalendar(VOTING_MODULE_ID).get(`primary:${contest.id}`)
      ?.status !== "pending"
  );
}

/**
 * A ticket office's count, decided with its governor's: each vote for a
 * governor candidate is a vote for their running mate, in the town, among
 * its counted residents and across the rest of the state, so the ticket
 * wins or loses together and one vote counts both. Seated by the same rule
 * as any count (`settleCount`); a recount is the governor race's.
 */
export function decideTicket(
  api: CoreAPI,
  governor: ContestRow,
  ticket: ContestRow,
  counted: ResultRow,
): ResultRow {
  formTickets(api, governor, "election");
  const mates = new Map<string, string>();
  for (const f of ballot(api, governor.id)) {
    const mate = runningMateOf(api, f, ticket);
    if (mate) mates.set(f.personId, mate.personId);
  }
  const map = (votes: Readonly<Record<string, number>>, keep = false) =>
    Object.fromEntries(
      Object.entries(votes).flatMap(([id, n]) =>
        mates.has(id) ? [[mates.get(id)!, n]] : keep ? [[id, n]] : [],
      ),
    );
  const filings = ballot(api, ticket.id);
  const places = placesOf(api, governor.id);
  const takesOffice = termStartsOn(api, ticket);
  const result = keepCount(api, {
    id: ticket.id,
    date: api.state.date,
    candidates: filings.map((f) => f.personId),
    named: {
      votes: map(counted.namedVotes),
      turnout: counted.namedTurnout,
      eligible: counted.namedEligible,
      exitPoll: map(counted.exitPoll, true),
    },
    counted: {
      votes: map(counted.countedVotes),
      turnout: counted.countedTurnout,
      eligible: counted.countedEligible,
    },
    wider:
      counted.placesCast === undefined
        ? null
        : {
            votes: map(counted.placeVotes),
            cast: counted.placesCast,
            places: places.map(({ placeId, ...place }) => ({
              ...place,
              id: placeId,
              votes: map(place.votes),
            })),
          },
    reasons: null,
    decide: () =>
      counted.winnerCandidateId
        ? (mates.get(counted.winnerCandidateId) ?? null)
        : null,
    winnerOf: (candidateId) => winningPersonId(api, candidateId),
    // A recount that holds the governor's result holds the ticket's.
    takesOffice:
      counted.takesOffice && counted.takesOffice > takesOffice
        ? counted.takesOffice
        : takesOffice,
    stateKey: town(api).stateKey,
    office: ticket.title,
    recount: false,
  });
  return settleCount(api, {
    contest: ticket,
    group: [ticket],
    filings,
    result,
    takesOffice,
  });
}

/**
 * Whether the law elects this race's office on one ticket with its state's
 * governor (a lieutenant governor in about thirty places, read from the
 * office's research row): its race is decided with the governor's.
 */
export function onGovernorTicket(api: CoreAPI, race: Race): boolean {
  if (!race.offices) return false;
  const office = officeById(api, race.offices.officeId) as unknown as
    { kind: string; jurisdiction: string } | undefined;
  return office
    ? electedWithGovernorOnTicket(office.jurisdiction, office.kind)
    : false;
}

/**
 * A ticket office's race, decided with its governor's: the governor race's
 * winning party seats the running mate the same day. Null for any other race
 * and where the state's governor is not raced this year, so the office is
 * counted on its own.
 */
export function ticketRace(
  api: CoreAPI,
  race: Race,
  year: number,
): RaceRow | null {
  if (!onGovernorTicket(api, race)) return null;
  const office = officeById(api, race.offices!.officeId) as unknown as {
    jurisdiction: string;
  };
  const governor = table(api, "races").get(
    `race:seat:${office.jurisdiction}:governor:${year}`,
  ) as unknown as RaceRow | undefined;
  return governor ?? null;
}

/** Seat the winner on the term's first day. */
/**
 * Whether a person has filed for a seat other than `seatId` in the contest
 * held on `date`: filing for the other office closed their own seat's ballot
 * (a state legislator who files for Congress is not also up for their own
 * seat), whether they went on to win, lose the primary or withdraw.
 */
function filedForAnotherSeat(
  api: CoreAPI,
  personId: string,
  seatId: string,
  date: string,
): boolean {
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  return (
    elections
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).some((filing) => {
    const contest = elections
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow | undefined;
    return (
      contest !== undefined &&
      contest.seatId !== seatId &&
      contest.electionDate === date
    );
  });
}

export function seatRaceWinner(api: CoreAPI, raceId: string): void {
  const race = table(api, "races").get(raceId) as unknown as
    | (RaceRow & {
        offices: Race["offices"] | null;
        special?: SpecialRace;
        candidates?: readonly SpecialCandidate[];
      })
    | undefined;
  if (!race) return;
  if (heldByRecount(api, raceId, `seat:${raceId}`, "seat-winner", raceId))
    return;
  if (!race.offices) {
    table(api, "seats").put({
      id: race.seatId,
      party: race.winnerParty,
      since: api.state.date,
      raceId,
    } as unknown as ModuleRow);
    // A special election's winner fills the vacancy of a seat the offices
    // engine keeps no term for (another state's member of Congress): the
    // record of the seating names who they are and their party.
    if (race.special) {
      const loaded = api
        .moduleState(OFFICES_MODULE_ID)
        .table("loaded")
        .get("town") as unknown as { worldSeed: string };
      const fielded = race.candidates?.find(
        (c) => c.party === race.winnerParty,
      );
      const stateUsps = race.seatId.split(":")[1]!.slice(3);
      const drawn = fielded
        ? null
        : drawOfficialIdentity({
            worldSeed: loaded.worldSeed,
            seatKey: raceId,
            stateUsps,
            role: "state-executive-challenger",
            referenceDate: api.state.date,
          });
      unheldVacancyWon(api, race.special.vacancyId, {
        winnerParty: race.winnerParty,
        winnerIdentity:
          fielded?.identity ??
          ({
            givenName: drawn!.givenName,
            familyName: drawn!.familyName,
            gender: drawn!.gender,
            birthDate: drawn!.birthDate,
            homeState: `US-${stateUsps}`,
          } as TermRow["identity"]),
        resultId: raceId,
      });
    }
    return;
  }
  // A seat the offices engine holds: the one term writer ends the term and
  // starts the winner's.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const serving = servingTermsOnSeat(api, race.seatId) as unknown as TermRow[];
  // A nonpartisan seat's holder has no party to compare: the one the places'
  // lean carried last time is re-elected when the lean carries the same side.
  const lastRace = race.nonpartisan
    ? (table(api, "races").rows() as unknown as RaceRow[])
        .filter(
          (row) =>
            row.seatId === race.seatId &&
            row.id !== raceId &&
            row.date < race.date,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1)
    : undefined;
  // A holder on another seat's ballot this year is not on this one's: the
  // seat is open, and its party's winner is a new person.
  const reelected =
    serving[0] &&
    !(
      serving[0].personId &&
      filedForAnotherSeat(api, serving[0].personId, race.seatId, race.date)
    ) &&
    (race.nonpartisan
      ? lastRace?.winnerParty === race.winnerParty
      : serving[0].party === race.winnerParty);
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const named = race.candidates?.find((c) => c.party === race.winnerParty);
  const office = officeById(api, race.offices.officeId) as
    { readonly title?: string; readonly jurisdiction?: string } | undefined;
  // A new holder lives in the office's own state; a local office's is the
  // town's.
  const homeState = office?.jurisdiction?.startsWith("US-")
    ? office.jurisdiction
    : lawChain(api).stateKey;
  const identity = reelected
    ? serving[0]!.identity
    : named
      ? named.identity
      : (() => {
          const drawn = drawOfficialIdentity({
            worldSeed: loaded.worldSeed,
            seatKey: raceId,
            stateUsps: homeState.slice(3),
            role: "state-executive-challenger",
            referenceDate: api.state.date,
          });
          return {
            givenName: drawn.givenName,
            familyName: drawn.familyName,
            gender: drawn.gender,
            birthDate: drawn.birthDate,
            homeState,
          };
        })();
  const years = race.offices.termYears;
  const personId = reelected ? serving[0]!.personId : null;
  seatWinner(api, {
    seatId: race.seatId,
    officeId: race.offices.officeId,
    personId,
    identity,
    party: race.nonpartisan ? null : race.winnerParty,
    // A special election's winner serves what was left of the term.
    endDate: race.special
      ? race.special.termEnd
      : years
        ? `${Number(api.state.date.slice(0, 4)) + years}${api.state.date.slice(4)}`
        : null,
    reached: race.special
      ? `elected in a special election ${race.date}`
      : `elected ${race.date}`,
    resultId: raceId,
    title: office?.title ?? race.office,
    winnerId: personId ?? `${raceId}:${race.winnerParty}`,
    news: false,
    ...(race.special ? { vacancyId: race.special.vacancyId } : {}),
    // A re-elected holder's unbroken service goes on.
    ...(reelected
      ? { serviceStart: serving[0]!.serviceStart ?? serving[0]!.startDate }
      : {}),
  });
  if (race.special) return;
  const seatRow = seatById(api, race.seatId) as unknown as
    { electionYear?: number } | undefined;
  if (seatRow && years)
    offices.table("seats").put({
      ...seatRow,
      electionYear: Number(race.date.slice(0, 4)) + years,
    } as unknown as ModuleRow);
}

export function racesOf(api: CoreAPI): readonly RaceRow[] {
  return (table(api, "races").rows() as unknown as RaceRow[]).filter(
    (r) => r.office !== "president",
  );
}

export function presidentialOf(
  api: CoreAPI,
  year: number,
): PresidentialRow | null {
  return (
    (table(api, "races").get(`presidential:${year}`) as unknown as
      PresidentialRow | undefined) ?? null
  );
}
