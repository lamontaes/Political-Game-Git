/**
 * Races counted from afar: the world's races, their results, folding old ones, and deciding a race outside the town.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { lawChain } from "./laws";
import {
  type CountedFieldEntry,
  type PlaceResult,
  type RacePlace,
  type SampleVoter,
  ownMoves,
  countParties,
  partyFieldEntries,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import {
  carryLeans,
  keptPlaces,
  leanRow,
  setOpeningLean as setOpeningLeanRow,
  type LeanRow,
} from "../place-leans";
import type { CoreAPI } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-data";
import { ELECTIONS_MODULE_ID } from "./elections";
import { CAMPAIGNS_MODULE_ID } from "./campaigns";
import { isOutsideOffice, OFFICES_MODULE_ID, type TermRow } from "./offices";
import { researchedHolderParty } from "./officials";
import { novemberGeneralElectionDay } from "../elections-calendar";
import { stateParties } from "./parties";
import { partyFieldsNominee } from "./candidacy";
import { historyMode } from "../electorate-century";
import {
  housePlace,
  legislativePlace,
  publishedSenateSeats,
  statePlaces,
  worldRoster,
  type ElectoratePlace,
} from "../electorate-places";
import {
  appealOfShare,
  candidateInputs,
  electorateChange,
  electorateParameter,
  raceConditions,
  type CandidateInputs,
  type CandidateReasons,
} from "../electorate-inputs";
import { townIncumbentLean } from "./voting-appeal";
import { caucusSide, nationalParty, partySide, table } from "./voting-base";
import type { ResultRow } from "./voting-base";
import { classes, dayAfter, specialCandidates } from "./voting-college";
import type { Race, SpecialCandidate, SpecialRace } from "./voting-college";
import { cycleTurnout, electionCycle } from "./voting-count";
import { resultOf } from "./voting-counted-ballots";
import {
  electorateSample,
  keepCount,
  republicanShareOf,
} from "./voting-returns";
import { ticketRace } from "./voting-tickets";

// ---- The races the town doesn't vote in (M2-10) ----
//
// Every state and federal seat the town only sees from afar is elected on the
// real general election day, and its winner seated on the real date, by this
// same engine. Each race is counted on the one engine for everyone the world
// doesn't name (`electorate.ts`), at a coarser level: its places (a House
// district, a state's counties for the Senate, a governor and the presidency,
// a state legislative district's share of its state; `electorate-places.ts`)
// vote as the town's counted residents would on each place's own 2024 lean,
// weighted to its eligible voters. Nothing is rolled.

/** Whether this world counts the races the town doesn't vote in. */
export function worldRacesOpen(api: CoreAPI): boolean {
  return (
    api.state.modules.has(VOTING_MODULE_ID) &&
    table(api, "world").get("open") !== undefined
  );
}

/**
 * A race the town doesn't vote in: its seat, the lean of its places and who
 * won. Its count (each party's votes, each candidate's reasons, every
 * place's votes and the night's returns) is the one count's result record,
 * `resultId`.
 */
export interface RaceRow {
  readonly id: string;
  readonly seatId: string;
  readonly office: string;
  readonly date: string;
  readonly incumbentParty: string | null;
  /** The Republican two-party share of its places' 2024 vote. */
  readonly lean: number;
  readonly winnerParty: string;
  readonly seatedOn: string;
  readonly leanSource: string;
  /** An office whose ballot carries no party labels. */
  readonly nonpartisan?: boolean;
  /** The race's count, kept by the one count writer (`resultOf`). */
  readonly resultId: string;
  /** Each major party's votes and the ballots cast, kept on the row so they outlive the count (`foldOutsideRaces`). */
  readonly votes?: { readonly republican: number; readonly democratic: number };
  readonly cast?: number;
  /** The seat's older races, folded into its newest seated race row (`foldOutsideRaces`). */
  readonly past?: SeatRacePast;
}

/** One folded race of a seat: what its readers read of the race row and its count. */
export interface FoldedRace {
  readonly id: string;
  readonly seatId: string;
  readonly office: string;
  readonly date: string;
  readonly incumbentParty: string | null;
  readonly winnerParty: string;
  readonly seatedOn: string;
  readonly republican: number;
  readonly democratic: number;
  readonly cast: number;
}

/** A seat's folded races: how many, the wins by party, the flips, and each race, oldest first. */
export interface SeatRacePast {
  readonly races: number;
  readonly wins: Readonly<Record<string, number>>;
  readonly flips: number;
  readonly lastFlip: string | null;
  readonly entries: readonly FoldedRace[];
}

/** A count by its result record's id (`ResultRow.id`). */
export function countRecord(api: CoreAPI, resultId: string): ResultRow | null {
  return (
    (table(api, "results").get(resultId) as unknown as ResultRow | undefined) ??
    null
  );
}

/** A race's count: the one count writer's result record. */
export function raceResult(api: CoreAPI, race: RaceRow): ResultRow | null {
  return countRecord(api, race.resultId);
}

/** Each major party's votes in a race the town doesn't vote in. */
export function raceVotes(
  api: CoreAPI,
  race: RaceRow,
): { readonly republican: number; readonly democratic: number } {
  if (race.votes) return race.votes;
  const totals = raceResult(api, race)?.totals ?? {};
  return {
    republican: totals["party:R"] ?? 0,
    democratic: totals["party:D"] ?? 0,
  };
}

/** A race's Republican two-party share: its count's, else its places' lean where no one was counted. */
export function raceShare(api: CoreAPI, race: RaceRow): number {
  if (race.votes) {
    const { republican, democratic } = race.votes;
    return republican + democratic
      ? republican / (republican + democratic)
      : race.lean;
  }
  const result = raceResult(api, race);
  return (result && republicanShareOf(result)) ?? race.lean;
}

/**
 * How far ahead the seat's newest counted race finished, as a share of the
 * votes cast: the lead of its first place over its second, from the race's
 * own count. A seat whose races the town doesn't vote in reads its race
 * rows' major-party votes; a town seat reads its newest counted contest's
 * totals. Zero where the seat has no counted race (a seat with no standing
 * is an open race).
 */
export function seatLastMargin(api: CoreAPI, seatId: string): number {
  const lead = (votes: readonly number[]): number => {
    const sorted = [...votes].sort((a, b) => b - a);
    const cast = sorted.reduce((sum, n) => sum + n, 0);
    return cast > 0 ? ((sorted[0] ?? 0) - (sorted[1] ?? 0)) / cast : 0;
  };
  const races = (
    table(api, "races").query("bySeat", [seatId]) as unknown as RaceRow[]
  )
    .filter((race) => race.seatedOn <= api.state.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const race = races.at(-1);
  if (race) {
    const { republican, democratic } = raceVotes(api, race);
    return lead([republican, democratic]);
  }
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .query("bySeat", [seatId]) as unknown as {
      id: string;
      electionDate: string;
    }[]
  )
    .filter((contest) => contest.electionDate <= api.state.date)
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate));
  for (let at = contests.length - 1; at >= 0; at -= 1) {
    const result = resultOf(api, contests[at]!.id);
    if (result) return lead(Object.values(result.totals));
  }
  return 0;
}

/** The seat a race id names: `race:<seat>:<year>` or `race:<seat>:<date>:special`. */
function seatOfRaceId(id: string): string | null {
  const m = /^race:(.+?):(\d{4}|\d{4}-\d{2}-\d{2}:special)$/.exec(id);
  return m ? m[1]! : null;
}

/**
 * A race the town doesn't vote in, by its id: its row, or, once folded, its
 * entry in its seat's newest race row (OWNER-DECISIONS, Nov 1 23:40: a folded
 * race is found by its id inside its seat's summary).
 */
export function raceById(
  api: CoreAPI,
  id: string,
): RaceRow | FoldedRace | null {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return null;
  const row = table(api, "races").get(id) as unknown as RaceRow | undefined;
  if (row) return row;
  const seatId = seatOfRaceId(id);
  if (!seatId) return null;
  for (const held of table(api, "races").query("bySeat", [
    seatId,
  ]) as unknown as RaceRow[]) {
    const entry = held.past?.entries.find((e) => e.id === id);
    if (entry) return entry;
  }
  return null;
}

/**
 * Old outside races fold (core-long-run-election-and-term-rows, the laws
 * lead's answer of Nov 2): on a general election day, every race the town
 * doesn't vote in (picked by its `race:` id, never by following a resultId:
 * the presidency's row carries the town's own count) that was counted
 * strictly before the previous general election drops its count, its
 * places and its returns, its votes already kept on its row; and each
 * seat's older race rows fold into the seat's newest seated race row as a
 * summary. A race whose winner is not yet seated, and every presidential
 * row and count, is kept whole.
 */
export function foldOutsideRaces(api: CoreAPI, before: string): void {
  const today = api.state.date;
  const races = table(api, "races");
  const seated = (r: RaceRow) => r.seatedOn < today;
  const old = (races.rows() as unknown as RaceRow[]).filter(
    (r) => r.id.startsWith("race:") && r.date < before && seated(r),
  );
  const seats = new Set<string>();
  for (const race of old) {
    seats.add(race.seatId);
    if (!race.votes) {
      const counted = raceResult(api, race);
      races.put({
        ...race,
        votes: raceVotes(api, race),
        cast: counted?.placesCast ?? counted?.electorate ?? 0,
      } as unknown as ModuleRow);
    }
    table(api, "results").remove(`result:${race.id}`);
    table(api, "returns").remove(`returns:${race.id}`);
    for (const place of table(api, "places").query("byContest", [race.id]))
      table(api, "places").remove(place.id);
  }
  for (const seatId of [...seats].sort()) {
    const rows = [
      ...(races.query("bySeat", [seatId]) as unknown as RaceRow[]),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const newest = rows.filter(seated).at(-1);
    if (!newest) continue;
    const folding = rows.filter(
      (r) =>
        r.id !== newest.id &&
        r.id.startsWith("race:") &&
        r.date < before &&
        seated(r),
    );
    if (!folding.length) continue;
    const entries: FoldedRace[] = [...(newest.past?.entries ?? [])];
    for (const r of folding) {
      entries.push(...(r.past?.entries ?? []));
      entries.push({
        id: r.id,
        seatId: r.seatId,
        office: r.office,
        date: r.date,
        incumbentParty: r.incumbentParty,
        winnerParty: r.winnerParty,
        seatedOn: r.seatedOn,
        republican: r.votes?.republican ?? 0,
        democratic: r.votes?.democratic ?? 0,
        cast: r.cast ?? 0,
      });
    }
    entries.sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
    const wins: Record<string, number> = {};
    let flips = 0,
      lastFlip: string | null = null;
    for (const e of entries) {
      if (e.winnerParty) wins[e.winnerParty] = (wins[e.winnerParty] ?? 0) + 1;
      if (
        e.incumbentParty &&
        e.winnerParty &&
        e.winnerParty !== e.incumbentParty
      ) {
        flips += 1;
        lastFlip = e.date;
      }
    }
    races.put({
      ...newest,
      past: { races: entries.length, wins, flips, lastFlip, entries },
    } as unknown as ModuleRow);
    for (const r of folding) races.remove(r.id);
  }
}

/**
 * The first general election from `from`: every even year, and an odd year
 * when a seat the world counts is up then (New Jersey's and Virginia's
 * legislatures and governors, among others, are elected in odd years).
 */
export function nextRaceYear(api: CoreAPI, from: number): number {
  let year = from;
  while (year % 2 === 1 && !racesIn(api, year).length) year += 1;
  return year;
}

/**
 * Whether the voting engine can count a race in a place: its electorate has
 * counted places on record. A territory's has none (no presidential vote or
 * county places), so its races are not run.
 */
export function countedPlace(api: CoreAPI, stateKey: string): boolean {
  return statePlaces(stateKey.slice(3), api.state.seed).length > 0;
}

export function scheduleElection(api: CoreAPI, year: number): void {
  const date = novemberGeneralElectionDay(year);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `general:${year}`,
    date,
    kind: "general-election",
    source: {
      tag: "SOURCED",
      citation:
        "2 U.S.C. § 7; 3 U.S.C. § 1 (the Tuesday after the first Monday in November)",
      asOf: api.state.date,
    },
    sourceRecordIds: [String(year)],
  });
}

/** The race for a seat the offices engine holds outside the town, in `year`. */
export function seatRace(
  api: CoreAPI,
  seat: {
    readonly id: string;
    readonly officeId: string;
    readonly district: string | null;
    readonly electionYear?: number;
  },
  office: {
    readonly kind: string;
    readonly termYears: number | null;
    readonly jurisdiction?: string;
  },
  year: number,
): Race {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const house = office.kind === "us-house";
  const stateKey = office.jurisdiction?.startsWith("US-")
    ? office.jurisdiction
    : lawChain(api).stateKey;
  const holder = (
    offices
      .table("terms")
      .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
  )[0];
  const code = (seat.district ?? "00").padStart(2, "0");
  // A seat emptied by a death or resignation is the last holder's side: the
  // seat's lean is read from that party, so a special election's even count
  // keeps the seat there instead of naming no winner.
  const lastHolder = holder
    ? undefined
    : (
        offices
          .table("terms")
          .query("bySeatStatus", [seat.id, "ended"]) as unknown as TermRow[]
      )
        .filter((term) => term.party)
        .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)))
        .at(-1);
  return {
    seatId: seat.id,
    office: office.kind,
    usps: stateKey.slice(3),
    code,
    incumbentParty: holder?.party ?? lastHolder?.party ?? null,
    leanSource: house
      ? "2024 House vote in the district"
      : seat.district === null
        ? "2024 presidential vote in the state's counties"
        : "the state's 2024 two-party vote over its districts, the holder's party at the typical margin",
    seatedOn: house
      ? `${year + 1}-01-03`
      : (holder?.endDate ?? `${year + 1}-01-01`),
    offices: {
      seatId: seat.id,
      officeId: seat.officeId,
      termYears: office.termYears,
    },
  };
}

/** Every race this year the town's named voters don't decide. */
export function racesIn(api: CoreAPI, year: number): readonly Race[] {
  const races: Race[] = [];
  const stateKey = lawChain(api).stateKey;
  // Seats in the town's own state the town doesn't vote for.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const officeRows = new Map(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
        level: string;
        jurisdiction: string;
        termYears: number | null;
        elected: boolean;
        nextElectionYear?: number;
      }[]
    ).map((o) => [o.id, o]),
  );
  const counted = new Map<string, boolean>();
  for (const seat of offices.table("seats").rows() as unknown as {
    id: string;
    officeId: string;
    district: string | null;
    coversTown: boolean;
    electionYear?: number;
  }[]) {
    const office = officeRows.get(seat.officeId);
    if (!office?.elected || seat.coversTown) continue;
    const house = office.kind === "us-house";
    const legislature = office.kind.startsWith("legislature-");
    // Another place's statewide executive (its governor, a lieutenant
    // governor, an attorney general, D.C.'s mayor): the same seat rule as a
    // legislator's.
    const executive = !house && !legislature && isOutsideOffice(api, office);
    if (!house && !legislature && !executive) continue;
    // Congress is elected in even years only.
    if (house && year % 2) continue;
    if (!house && (seat.electionYear ?? office.nextElectionYear) !== year)
      continue;
    // A place with no counted electorate (a territory) is not raced: no
    // count could decide it, and its seats' own parties are not the major
    // parties the count fields.
    if (!house) {
      const place = office.jurisdiction;
      if (!counted.has(place)) counted.set(place, countedPlace(api, place));
      if (!counted.get(place)) {
        // stopgapId: SG-GOV-territory-legislature-race (a territory's legislative seats, governor and statewide executives are not raced: its electorate's places and its own parties are not on record)
        api.stopgap("SG-GOV-territory-legislature-race");
        continue;
      }
    }
    // An office elected without party labels is counted by the places' lean,
    // and its winner takes the seat with no party.
    let nonpartisan = false;
    if (
      executive &&
      researchedHolderParty(office.jurisdiction, seat.id, "elected")?.party ===
        null
    ) {
      // stopgapId: SG-GOV-outside-nonpartisan-race (another place's statewide office elected without party labels is not raced; its holder serves past the term's end)
      api.stopgap("SG-GOV-outside-nonpartisan-race");
      nonpartisan = true;
    }
    races.push({
      ...seatRace(api, seat, office, year),
      ...(nonpartisan ? { nonpartisan: true } : {}),
    });
  }
  if (races.length) {
    // stopgapId: SG-GOV-outside-seat-records-unfolded (each raced state seat's ended terms, race rows and counts are kept forever; nothing folds the ones play no longer reads)
    api.stopgap("SG-GOV-outside-seat-records-unfolded");
  }
  const congressStart = `${year + 1}-01-03`;
  // Congress outside the town's state, in even years.
  if (year % 2) return races.sort((a, b) => a.seatId.localeCompare(b.seatId));
  for (const [state, seats] of Object.entries(
    worldRoster(api.state.seed).congress,
  )) {
    if (state === stateKey) continue;
    const usps = state.slice(3);
    for (const [district, parties] of Object.entries(seats)) {
      if (district === "senate") continue;
      const code = district.padStart(2, "0");
      const seatId = `seat:${state}:us-house:${code}`;
      races.push({
        seatId,
        office: "us-house",
        usps,
        code,
        incumbentParty: currentParty(api, seatId, parties[0] ?? null),
        leanSource: "2024 House vote in the district",
        seatedOn: congressStart,
      });
    }
    // Senate seats whose class is up this year: a class pairs with its seat
    // by the published holder; this world's holder stands for it.
    const sorted = publishedSenateSeats(state);
    const held = seats.senate ?? [];
    const used = new Set<number>();
    for (const cls of classes[state] ?? []) {
      const index = sorted.findIndex((p, i) => p === cls.party && !used.has(i));
      if (index < 0) continue;
      used.add(index);
      if ((year - cls.nextElection) % 6 !== 0 || year < cls.nextElection)
        continue;
      const seatId = `seat:${state}:us-senate:${index}`;
      races.push({
        seatId,
        office: "us-senate",
        usps,
        code: "00",
        incumbentParty: currentParty(api, seatId, held[index] ?? cls.party),
        leanSource: "2024 presidential vote in the state's counties",
        seatedOn: congressStart,
      });
    }
  }
  return races.sort((a, b) => a.seatId.localeCompare(b.seatId));
}

function currentParty(
  api: CoreAPI,
  seatId: string,
  start: string | null,
): string | null {
  const row = table(api, "seats").get(seatId) as unknown as
    { party: string; since: string } | undefined;
  return row && row.since <= api.state.date ? row.party : start;
}

/** A race's places: the House district, the state's counties, or the legislative district. */
function worldRacePlaces(api: CoreAPI, race: Race): readonly ElectoratePlace[] {
  const usps = race.usps;
  if (race.office === "us-house") {
    const place = housePlace(usps, race.code, api.state.seed);
    if (place) return [place];
    // A delegate's seat with no House vote on record (a territory): the
    // place at its 2024 delegate race's lean, sized by the votes it cast.
    const delegate = statePlaces(usps, api.state.seed, 1)[0];
    return delegate ? [delegate] : [];
  }
  const offices = api.moduleState(OFFICES_MODULE_ID);
  // A seat the whole state elects (a senator, a governor, an attorney
  // general) is counted over the state's counties.
  const seat = race.offices
    ? (offices.table("seats").get(race.offices.seatId) as unknown as
        { district: string | null } | undefined)
    : undefined;
  if (race.office === "us-senate" || seat?.district === null)
    return statePlaces(usps, api.state.seed);
  const districts = new Set(
    (
      offices
        .table("seats")
        .query("byOffice", [race.offices!.officeId]) as unknown as {
        district: string | null;
      }[]
    ).map((s) => s.district),
  ).size;
  const place = legislativePlace(
    usps,
    race.seatId,
    districts,
    sideOf(race.incumbentParty),
    null,
    api.state.seed,
  );
  return place ? [place] : [];
}

/**
 * The town's counted voters as every place counted from afar sees them, at
 * the cycle's cost of voting; none where the town's elections aren't
 * modeled.
 */
export function sampleFor(api: CoreAPI, date: string): readonly SampleVoter[] {
  if (
    !api.state.modules.has(ELECTIONS_MODULE_ID) ||
    !api.state.modules.has(CAMPAIGNS_MODULE_ID)
  )
    return [];
  return electorateSample(api, date, cycleTurnout(date).cost);
}

/**
 * A race's places as the engine counts them: in the town's own state the
 * barred share today against the opening's, which the 2024 vote they are
 * sized from reflects; elsewhere the opening's election laws (the town's
 * state's changes don't reach them).
 */
export function coarse(
  places: readonly ElectoratePlace[],
  townsState: boolean,
  change: ReturnType<typeof electorateChange>,
  /** The places' own conditions, appeal units for the party that holds the seat (`ownConditionsOf`). */
  ownConditions = 0,
): readonly RacePlace[] {
  const scale = townsState
    ? (1 - change.barred) / Math.max(1e-9, 1 - change.openingBarred)
    : 1;
  return places.map((p) => ({
    ...p,
    scale,
    readinessShift: townsState ? 0 : change.lawCost,
    ...(ownConditions ? { ownConditions } : {}),
  }));
}

/**
 * A counted place's own conditions, by the town's rule (`candidateReasons`' local part):
 * the party that holds the seat loses `localUnemploymentShare` of the two-party vote for
 * each point its state's unemployment rose over the last twelve months beyond the
 * nation's, and gains it where the state did better. Read from the country tier's kept
 * state months and the nation's months. Nothing where the world keeps no such months.
 */
export function ownConditionsOf(
  api: CoreAPI,
  usps: string,
): {
  /** Appeal units for the party that holds the seat. */
  readonly appeal: number;
  /** Points: the state's change, the nation's, over the same twelve months. */
  readonly stateChange: number;
  readonly nationChange: number;
  readonly month: string | null;
  readonly recordIds: readonly string[];
} {
  const none = {
    appeal: 0,
    stateChange: 0,
    nationChange: 0,
    month: null,
    recordIds: [],
  };
  if (!api.state.modules.has("macro")) return none;
  const macro = api.moduleState("macro");
  const latest = (
    macro.table("state").get("macro:state") as unknown as
      { latestMonth: string } | undefined
  )?.latestMonth;
  const fips = (
    macro.table("countryStates").get(`country-state:US-${usps}`) as unknown as
      { fips: string } | undefined
  )?.fips;
  if (!latest || !fips) return none;
  const [y, m] = latest.split("-").map(Number) as [number, number];
  const before = `${String(y - 1)}-${String(m).padStart(2, "0")}`;
  const read = (tableName: string, id: string) =>
    (
      macro.table(tableName).get(id) as unknown as
        { unemploymentPct: number } | undefined
    )?.unemploymentPct;
  const ids = [
    `country-state-month:${fips}:${latest}`,
    `country-state-month:${fips}:${before}`,
    `macro-month:${latest}`,
    `macro-month:${before}`,
  ] as const;
  const stateNow = read("countryStateMonths", ids[0]),
    stateThen = read("countryStateMonths", ids[1]),
    nationNow = read("months", ids[2]),
    nationThen = read("months", ids[3]);
  if (
    stateNow === undefined ||
    stateThen === undefined ||
    nationNow === undefined ||
    nationThen === undefined
  )
    return none;
  const stateChange = stateNow - stateThen,
    nationChange = nationNow - nationThen;
  // stopgapId: SG-GOV-counted-places-hear-their-state (a counted place's people are taken to have heard their state's jobs figures; no press outside the town carries them)
  api.stopgap("SG-GOV-counted-places-hear-their-state");
  return {
    appeal: appealOfShare(
      -electorateParameter("localUnemploymentShare") *
        (stateChange - nationChange),
    ),
    stateChange,
    nationChange,
    month: latest,
    recordIds: ids,
  };
}

/** The world's kept lean for a place (undefined where no count has moved it and no history set it). */
export function placeLeanRow(
  api: CoreAPI,
  placeId: string,
): LeanRow | undefined {
  return leanRow(table(api, "leans"), placeId);
}

/** A place's opening lean, set before any count: a history's last record of where its people stand. */
export function setOpeningLean(
  api: CoreAPI,
  placeId: string,
  rightShare: number,
  source: string,
): void {
  setOpeningLeanRow(table(api, "leans"), placeId, rightShare, source);
}

/**
 * Carry a counted contest into its places' leans (`carryLeans`): each place moves by the
 * part of its result that was its own, a share of it (`leanCarryShare`).
 */
export function carryCount(
  api: CoreAPI,
  input: {
    readonly contestId: string;
    readonly date: string;
    /** The general election's year. */
    readonly election: number;
    readonly sample: readonly SampleVoter[];
    readonly places: readonly RacePlace[];
    /** The side of the party that holds the seat (0: none). */
    readonly holderSide: number;
    readonly counted: readonly PlaceResult[];
    readonly sideOf: (candidateId: string) => number;
    /** What the places' own conditions were read from (`ownConditionsOf`), for the trace. */
    readonly conditions: ReturnType<typeof ownConditionsOf>;
  },
): void {
  const moves = ownMoves(input.sample, input.places, input.holderSide);
  if (!moves.size) return;
  const { month, stateChange, nationChange, recordIds } = input.conditions;
  carryLeans(table(api, "leans"), {
    date: input.date,
    election: String(input.election),
    contestId: input.contestId,
    strength: electorateParameter("leanCarryShare"),
    conditions: {
      month,
      stateChange,
      nationChange,
      recordIds,
      holderSide: input.holderSide,
    },
    places: input.places.map((place, at) => {
      const row = input.counted[at];
      let right = 0,
        left = 0;
      for (const [id, votes] of Object.entries(row?.votes ?? {})) {
        const side = input.sideOf(id);
        if (side > 0) right += votes;
        else if (side < 0) left += votes;
      }
      return {
        placeId: place.id,
        lean: place.rightShare,
        ownMove: moves.get(place.id) ?? 0,
        result: right + left > 0 ? right / (right + left) : null,
      };
    }),
  });
}

/** Each candidate as a counted voter sees them on a race the town doesn't vote in. */
export function partyField(
  api: CoreAPI,
  reasons: readonly CandidateReasons[],
  field: readonly CandidateInputs[],
): readonly CountedFieldEntry[] {
  return partyFieldEntries(reasons, field, townIncumbentLean(api));
}

/**
 * The party that stands for a side of the scale in a state: the largest on
 * that side in the state's own record (its 2024 ballot or legislature), else
 * the national party of that side (party-sides data).
 */
function partyOnSideIn(stateKey: string, side: number, seed: string): string {
  const best = stateParties(stateKey, seed)
    .filter((p) => partySide(p.name) === side)
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))[0];
  return best?.name ?? nationalParty(side);
}

/** A member's side, with the side an independent caucuses with (party-sides data). */
const sideOf = caucusSide;

/**
 * Decide a race the town doesn't vote in: its blocks count it on the same
 * engine as the town's own races. The seat's holder stands for their party
 * (an incumbent official the world doesn't name, with the typical
 * campaign); the other major party fields a typical challenger.
 */
export function decide(
  api: CoreAPI,
  race: Race,
  year: number,
  special?: SpecialRace,
): void {
  const governor = special ? null : ticketRace(api, race, year);
  if (governor) {
    keepRace(
      api,
      race,
      {
        id: `race:${race.seatId}:${year}`,
        seatId: race.seatId,
        office: race.office,
        date: api.state.date,
        incumbentParty: race.incumbentParty,
        lean: governor.lean,
        winnerParty: governor.winnerParty,
        seatedOn: race.seatedOn,
        leanSource: `the governor's race, ${governor.id}`,
        resultId: governor.resultId,
        votes: governor.votes,
        cast: governor.cast,
      },
      {},
    );
    return;
  }
  const side = sideOf(race.incumbentParty);
  // stopgapId: SG-GOV-world-race-lean
  api.stopgap("SG-GOV-world-race-lean");
  // Each place at the lean the world keeps for it: its own last result carried forward.
  const places = keptPlaces(api, race.usps, worldRacePlaces(api, race));
  const date = api.state.date;
  const votesAt2024 = places.reduce((s, b) => s + b.votes2024, 0);
  const lean = votesAt2024
    ? places.reduce((s, b) => s + b.votes2024 * b.rightShare, 0) / votesAt2024
    : (places[0]?.rightShare ??
      0.5 + side * campaignParameter("legislativeSeatMargin"));
  const cycle = electionCycle(date);
  const townsState = `US-${race.usps}` === lawChain(api).stateKey;
  const conditions = raceConditions(api, {
    federal: race.office.startsWith("us-"),
    family:
      race.office === "us-house"
        ? "usHouse"
        : race.office.startsWith("legislature-")
          ? "stateLegislative"
          : "statewideExecutive",
    cycle,
    raceVotes: votesAt2024 * cycleTurnout(date).share,
    townPlaceId: null,
    electionDate: date,
  });
  const stateKey = `US-${race.usps}`;
  const parties =
    side === 0
      ? [-1, 1].map((s) => ({
          party: partyOnSideIn(stateKey, s, api.state.seed),
          side: s,
          incumbent: false,
        }))
      : [
          { party: race.incumbentParty!, side, incumbent: true },
          {
            party: partyOnSideIn(stateKey, -side, api.state.seed),
            side: -side,
            incumbent: false,
          },
        ];
  // In a century world each party stands a nominee where its chance in the
  // seat covers what standing one costs; a seat one side cannot realistically
  // win is the other's uncontested. A race always keeps at least one side.
  const fielded =
    historyMode(api.state.seed) === "century"
      ? parties.filter((c) => partyFieldsNominee(api, c.side, lean))
      : parties;
  const candidates = (fielded.length ? fielded : parties).map((c) =>
    candidateInputs(api, {
      id: `party:${c.side > 0 ? "R" : "D"}`,
      party: c.party,
      filingId: null,
      incumbent: c.incumbent,
      seatParty: race.incumbentParty,
      raceLean: 2 * lean - 1,
      side: c.side,
      seatSide: side,
    }),
  );
  // The seat's party pays or gains for its state's own jobs against the nation's.
  const ownRaceConditions = ownConditionsOf(api, race.usps);
  const sample = sampleFor(api, date);
  const countedPlaces = coarse(
    places,
    townsState,
    electorateChange(api),
    side ? ownRaceConditions.appeal : 0,
  );
  const { reasons, counted } = countParties(
    sample,
    countedPlaces,
    candidates,
    conditions,
    townIncumbentLean(api),
  );
  const raceId = special
    ? `race:${race.seatId}:${date}:special`
    : `race:${race.seatId}:${year}`;
  // The two parties' votes decide it; where no one in the race's places
  // could be counted, the places' own lean does, and an even split keeps
  // the seat with its holder's side.
  // Named by the count's decision; a seat with no holder (a special
  // election's vacancy) has no side until the count gives it one.
  let winnerParty = race.incumbentParty ?? "";
  const result = keepCount(api, {
    id: raceId,
    date,
    candidates: candidates.map((c) => c.id),
    wider: counted,
    reasons,
    decide: () => {
      const rep = counted.votes["party:R"] ?? 0,
        dem = counted.votes["party:D"] ?? 0;
      const share = rep + dem ? rep / (rep + dem) : lean;
      const winnerSide = share > 0.5 ? 1 : share < 0.5 ? -1 : side;
      // An even split of a seat with no holder's side names no winner.
      if (!winnerSide) return null;
      winnerParty =
        winnerSide === side && race.incumbentParty
          ? race.incumbentParty
          : partyOnSideIn(stateKey, winnerSide, api.state.seed);
      return `party:${winnerSide > 0 ? "R" : "D"}`;
    },
    winnerOf: () => `${raceId}:${winnerParty}`,
    takesOffice: race.seatedOn,
    stateKey,
    office: race.office,
  });
  // A general election's count stays with its places; a special election or a ballot with
  // no party labels moves no lean.
  if (!special && !race.nonpartisan)
    carryCount(api, {
      contestId: raceId,
      date,
      election: year,
      sample,
      places: countedPlaces,
      holderSide: side,
      counted: counted.places,
      sideOf: (id) => (id === "party:R" ? 1 : id === "party:D" ? -1 : 0),
      conditions: ownRaceConditions,
    });
  keepRace(
    api,
    race,
    {
      id: raceId,
      seatId: race.seatId,
      office: race.office,
      date,
      incumbentParty: race.incumbentParty,
      lean,
      winnerParty,
      seatedOn: race.seatedOn,
      leanSource: race.leanSource,
      resultId: result.id,
      votes: {
        republican: result.totals["party:R"] ?? 0,
        democratic: result.totals["party:D"] ?? 0,
      },
      cast: result.placesCast ?? result.electorate,
      ...(race.nonpartisan ? { nonpartisan: true } : {}),
    },
    special
      ? { special, candidates: specialCandidates(api, race, parties, raceId) }
      : {},
    result.takesOffice,
  );
}

/**
 * Keep a decided race's row and, where it names a winner, schedule the
 * winner's seating on the term's first day (the morning after the count where
 * that day has come by then; the calendar takes only a day not yet run).
 */
function keepRace(
  api: CoreAPI,
  race: Race,
  row: RaceRow,
  extra: { special?: SpecialRace; candidates?: readonly SpecialCandidate[] },
  takesOffice?: string | null,
): void {
  table(api, "races").put({
    ...row,
    offices: race.offices ?? null,
    ...extra,
  } as unknown as ModuleRow);
  // An even split with no holder's side seats no one.
  if (!row.winnerParty) return;
  // The winner is seated on the term's first day, or the day a recount ends
  // where that is later; where that day has come by the count's own day, the
  // morning after (the calendar takes only a day not yet run).
  const seatedOn = takesOffice ?? race.seatedOn;
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `seat:${row.id}`,
    date: seatedOn > api.state.date ? seatedOn : dayAfter(api.state.date),
    kind: "seat-winner",
    source: {
      tag: "SOURCED",
      citation: `Result of ${row.id}`,
      asOf: api.state.date,
    },
    sourceRecordIds: [row.id],
  });
}
