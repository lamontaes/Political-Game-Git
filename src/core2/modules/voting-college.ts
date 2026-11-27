/**
 * Special elections, contingent elections and the electoral college.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { addDays, makeIsoDate, nthWeekdayOfMonth } from "../kernel/dates";
import senateClasses from "../../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import contingentData from "../data/elections/contingent-election.json" with { type: "json" };
import electorsData from "../data/elections/electoral-votes.json" with { type: "json" };
import { contingentElection } from "../contingent-election";
import { lawChain } from "./laws";
import { countParties } from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import { keptPlaces } from "../place-leans";
import type { CoreAPI } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { ELECTIONS_MODULE_ID, ballot, type ContestRow } from "./elections";
import {
  isOutsideOffice,
  OFFICES_MODULE_ID,
  seatWinner,
  townSeats,
  endServingTerms,
  type TermRow,
} from "./offices";
import { lastUnheldParty, researchedHolderParty } from "./officials";
import { statePlaces } from "../electorate-places";
import {
  candidateInputs,
  electorateChange,
  presidentSide,
  raceConditions,
  type CandidateInputs,
} from "../electorate-inputs";
import { townIncumbentLean } from "./voting-appeal";
import {
  drawOfficialIdentity,
  nationalParty,
  openNextCycle,
  partySide,
  table,
} from "./voting-base";
import { resultOf } from "./voting-counted-ballots";
import {
  carryCount,
  coarse,
  countedPlace,
  decide,
  foldOutsideRaces,
  nextRaceYear,
  ownConditionsOf,
  racesIn,
  sampleFor,
  scheduleElection,
  seatRace,
  worldRacesOpen,
} from "./voting-outside-races";
import { keepCount, republicanShareOf } from "./voting-returns";
import { onGovernorTicket, seatRaceWinner } from "./voting-tickets";

export const classes = (
  senateClasses as unknown as {
    states: Record<
      string,
      { class: number; party: string; nextElection: number }[]
    >;
  }
).states;
const electors = electorsData as unknown as {
  toWin: number;
  states: Record<string, number>;
};
/** The vacancy a special race fills and the end of the term it serves. */
export interface SpecialRace {
  readonly vacancyId: string;
  readonly termEnd: string | null;
}

/** A party's candidate in a special race, named. */
export interface SpecialCandidate {
  readonly party: string;
  readonly side: number;
  readonly incumbent: boolean;
  readonly identity: TermRow["identity"];
}

export interface Race {
  readonly seatId: string;
  readonly office: string;
  readonly usps: string;
  /** A House district's two-digit code. */
  readonly code: string;
  readonly incumbentParty: string | null;
  readonly leanSource: string;
  readonly seatedOn: string;
  /** The office's ballot carries no party labels: the count's side decides, the seated holder has no party. */
  readonly nonpartisan?: boolean;
  readonly offices?: {
    readonly seatId: string;
    readonly officeId: string;
    readonly termYears: number | null;
  };
}

export function raceWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "general-election") {
    const year = Number(work.sourceRecordIds[0]);
    // The races counted before the previous general election fold first.
    const held = table(api, "world").get("generals") as unknown as
      { last: string } | undefined;
    if (held) foldOutsideRaces(api, held.last);
    table(api, "world").put({
      id: "generals",
      last: api.state.date,
    } as unknown as ModuleRow);
    scheduleElection(api, nextRaceYear(api, year + 1));
    // A ticket office is decided with its governor's race, counted first.
    const races = racesIn(api, year);
    for (const race of [
      ...races.filter((r) => !onGovernorTicket(api, r)),
      ...races.filter((r) => onGovernorTicket(api, r)),
    ])
      decide(api, race, year);
    if (year % 4 === 0)
      api.moduleCalendar(VOTING_MODULE_ID).schedule({
        key: `electors:${year}`,
        date: electorsMeet(year),
        kind: "electors-meet",
        source: {
          tag: "SOURCED",
          citation:
            "3 U.S.C. § 7 (electors meet the first Tuesday after the second Wednesday in December)",
          asOf: api.state.date,
        },
        sourceRecordIds: [String(year)],
      });
    return;
  }
  if (work.kind === SPECIAL_KIND) decideSpecial(api, work);
  if (work.kind === "seat-winner")
    seatRaceWinner(api, work.sourceRecordIds[0]!);
  if (work.kind === "electors-meet")
    electoralCollege(api, Number(work.sourceRecordIds[0]));
  if (work.kind === "contingent-election")
    decideContingent(api, Number(work.sourceRecordIds[0]));
  if (work.kind === "inauguration") inaugurate(api, work.sourceRecordIds[0]!);
}

const SPECIAL_KIND = "special-race";

/** The winner takes the seat the day after the count. */
export const dayAfter = (date: string) => addDays(makeIsoDate(date), 1);

/**
 * What a seat outside the town is, for a special election: its office's kind
 * and state, where the world's races count it. A House seat, a senator, a
 * state legislator and another place's statewide executive are counted (a
 * place with no counted electorate, a territory, is not, as in the general
 * election); a seat the offices engine keeps no term for (another state's
 * member of Congress) is named by its vacancy. Null for any other seat: the
 * town's own seats are the voting engine's contests.
 */
function specialSeatKind(
  api: CoreAPI,
  seatId: string,
  unheld?: { readonly stateKey: string; readonly officeKind: string },
): { kind: string; stateKey: string; jurisdiction: string } | null {
  if (unheld)
    return unheld.officeKind === "us-house" || unheld.officeKind === "us-senate"
      ? {
          kind: unheld.officeKind,
          stateKey: unheld.stateKey,
          jurisdiction: unheld.stateKey,
        }
      : null;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seat = offices.table("seats").get(seatId) as unknown as
    { coversTown: boolean; officeId: string } | undefined;
  const office = seat
    ? (offices.table("offices").get(seat.officeId) as unknown as
        | {
            kind: string;
            elected: boolean;
            level: string;
            jurisdiction: string;
          }
        | undefined)
    : undefined;
  if (!seat || !office?.elected || seat.coversTown) return null;
  // The town's own seats are the voting engine's.
  if (townSeats(api).some((entry) => entry.seat.id === seatId)) return null;
  const house = office.kind === "us-house";
  const counted =
    office.kind === "us-senate" ||
    office.kind.startsWith("legislature-") ||
    isOutsideOffice(api, office);
  if (!house && !counted) return null;
  // A territory has no counted electorate: its seats are not raced.
  if (!house && !countedPlace(api, office.jurisdiction)) return null;
  return {
    kind: office.kind,
    stateKey: office.jurisdiction,
    jurisdiction: office.jurisdiction,
  };
}

/**
 * A vacancy in a seat outside the town (a House district, a senator, a state
 * legislative district, another place's statewide executive, another state's
 * member of Congress) is filled by a real race: on the special election day
 * its places vote as they do in the general election, between the two major
 * parties' named candidates, and the winner serves the unexpired term.
 * Returns false for any other seat, which the other engines or the
 * stand-in fill.
 */
export function openSpecialRace(
  api: CoreAPI,
  input: {
    readonly vacancyId: string;
    readonly seatId: string;
    readonly electionDate: string;
    readonly termEnd: string | null;
    readonly unheld?: {
      readonly stateKey: string;
      readonly officeKind: string;
    };
  },
): boolean {
  if (!worldRacesOpen(api)) return false;
  if (!specialSeatKind(api, input.seatId, input.unheld)) return false;
  // A special election whose day has already come is held the day after
  // (the calendar takes only a day not yet run).
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `special:${input.vacancyId}:${input.electionDate}`,
    date:
      input.electionDate > api.state.date
        ? input.electionDate
        : dayAfter(api.state.date),
    kind: SPECIAL_KIND,
    source: {
      tag: "SOURCED",
      citation: `Special election for ${input.vacancyId}`,
      asOf: api.state.date,
    },
    sourceRecordIds: [
      input.vacancyId,
      input.seatId,
      ...(input.termEnd ? [input.termEnd] : []),
    ],
  });
  return true;
}

/** Count a special race on its election day. */
function decideSpecial(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [vacancyId, seatId, termEnd] = work.sourceRecordIds;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const vacancy = offices.table("vacancies").get(vacancyId!) as unknown as
    | {
        status: string;
        unheld?: { stateKey: string; officeKind: string };
      }
    | undefined;
  if (!vacancy || vacancy.status !== "awaiting-election") return;
  const year = Number(api.state.date.slice(0, 4));
  const special = { vacancyId: vacancyId!, termEnd: termEnd || null };
  // A seat the offices engine keeps no term for: its race is named by the
  // vacancy, and its last holder's party is the seat's side.
  if (vacancy.unheld) {
    const kind = vacancy.unheld.officeKind;
    const code =
      kind === "us-house" ? (seatId!.split(":").at(-1) ?? "00") : "00";
    decide(
      api,
      {
        seatId: seatId!,
        office: kind,
        usps: vacancy.unheld.stateKey.slice(3),
        code,
        incumbentParty: lastUnheldParty(api, seatId!),
        leanSource:
          kind === "us-house"
            ? "2024 House vote in the district"
            : "2024 presidential vote in the state's counties",
        seatedOn: dayAfter(api.state.date),
      },
      year,
      special,
    );
    return;
  }
  const seat = offices.table("seats").get(seatId!) as unknown as
    | {
        id: string;
        officeId: string;
        district: string | null;
        electionYear?: number;
      }
    | undefined;
  const office = seat
    ? (offices.table("offices").get(seat.officeId) as unknown as
        | { kind: string; termYears: number | null; jurisdiction?: string }
        | undefined)
    : undefined;
  if (!seat || !office) return;
  const race = seatRace(api, seat, office, year);
  // Another place's office elected without party labels is counted by the
  // places' lean and its winner takes the seat with no party.
  const nonpartisan =
    isOutsideOffice(api, office) &&
    !office.kind.startsWith("legislature-") &&
    researchedHolderParty(office.jurisdiction!, seat.id, "elected")?.party ===
      null;
  decide(
    api,
    {
      ...race,
      seatedOn: dayAfter(api.state.date),
      ...(nonpartisan ? { nonpartisan: true } : {}),
    },
    year,
    special,
  );
}

/**
 * The two parties' candidates in a special race, each with a name drawn from
 * the race's id: the party of the seat's holder stands its holder.
 */
export function specialCandidates(
  api: CoreAPI,
  race: Race,
  parties: readonly { party: string; side: number; incumbent: boolean }[],
  raceId: string,
): readonly SpecialCandidate[] {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const holder = (
    offices
      .table("terms")
      .query("bySeatStatus", [race.seatId, "serving"]) as unknown as TermRow[]
  )[0];
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const stateKey = `US-${race.usps}`;
  return parties.map((c) => {
    if (holder && holder.party === c.party)
      return {
        party: c.party,
        side: c.side,
        incumbent: true,
        identity: holder.identity,
      };
    const drawn = drawOfficialIdentity({
      worldSeed: loaded.worldSeed,
      seatKey: `${raceId}:${c.party}`,
      stateUsps: race.usps,
      role: "state-executive-challenger",
      referenceDate: api.state.date,
    });
    return {
      party: c.party,
      side: c.side,
      incumbent: false,
      identity: {
        givenName: drawn.givenName,
        familyName: drawn.familyName,
        gender: drawn.gender,
        birthDate: drawn.birthDate,
        homeState: stateKey,
      },
    };
  });
}

/** The first Tuesday after the second Wednesday in December. */
export function electorsMeet(year: number): string {
  // The Tuesday after a Wednesday is six days on.
  return addDays(nthWeekdayOfMonth(year, 12, 3, 2), 6);
}

export interface PresidentialRow {
  readonly id: string;
  readonly year: number;
  readonly states: readonly {
    readonly stateKey: string;
    readonly electors: number;
    /** The Republican two-party share of the state's counties' 2024 vote. */
    readonly lean: number;
    /** The state's popular vote, kept by the one count writer. */
    readonly resultId: string | null;
    readonly winnerSide: number;
    readonly from: string;
  }[];
  readonly electoral: {
    readonly republican: number;
    readonly democratic: number;
  };
  readonly winnerParty: string;
  readonly winnerId: string;
  /** The vice president's party, or null when no vice president takes office with the president. */
  readonly vicePresidentParty: string | null;
  /** Who acts as president when the House chose no one (amend. XX, § 3). */
  readonly acting?: "vice-president-elect" | "speaker";
  /** Set when no ticket won a majority of the electors: the House and the Senate choose in January. */
  readonly contingent?: {
    readonly status: "pending" | "decided" | "deadlocked";
    readonly recordId: string;
    readonly on: string;
  };
  readonly inauguration: string;
}

/**
 * The electors vote: each state's electors go to its statewide winner. The
 * town's state is its own popular vote, counted from named and counted
 * voters and the state's counties (voting.ts); every other state is counted
 * in its own counties on the same engine, with the same candidates where the
 * town's ballot names them. A majority of electors (270) wins; a tie goes to
 * the House, voting by state delegation, and the Senate chooses the vice
 * president (U.S. Const. amend. XII), in January once the new Congress sits
 * (`decideContingent`). `toWin` is the majority the law sets; a test may pass
 * a higher one to force a split.
 */
export function electoralCollege(
  api: CoreAPI,
  year: number,
  toWin: number = electors.toWin,
): void {
  const { stateKey } = lawChain(api);
  const town = townPresidentialVote(api, year);
  const date = api.state.date;
  const conditions = raceConditions(api, {
    federal: true,
    family: "president",
    cycle: "presidential",
    raceVotes: 0,
    townPlaceId: null,
    electionDate: date,
  });
  const holder = presidentSide(api);
  const sample = sampleFor(api, date);
  const change = electorateChange(api);
  const states = Object.entries(electors.states).map(([key, count]) => {
    const own = key === stateKey && town ? town.republicanShare : null;
    const places =
      own === null
        ? keptPlaces(
            api,
            key.slice(3),
            statePlaces(key.slice(3), api.state.seed),
          )
        : [];
    const votes = places.reduce((s, b) => s + b.votes2024, 0);
    const lean = votes
      ? places.reduce((s, b) => s + b.votes2024 * b.rightShare, 0) / votes
      : 0.5;
    const field = town?.inputs.length
      ? town.inputs
      : [-1, 1].map((side) =>
          candidateInputs(api, {
            id: `party:${side > 0 ? "R" : "D"}`,
            party: nationalParty(side),
            filingId: null,
            incumbent: false,
            seatParty: null,
            raceLean: 2 * lean - 1,
            side,
            seatSide: holder,
          }),
        );
    let share = own;
    let resultId = own === null ? null : town!.resultId;
    if (share === null) {
      const stateConditions = ownConditionsOf(api, key.slice(3));
      const statePlacesCounted = coarse(
        places,
        key === stateKey,
        change,
        holder ? stateConditions.appeal : 0,
      );
      const { reasons, counted } = countParties(
        sample,
        statePlacesCounted,
        field,
        { ...conditions, raceVotes: votes },
        townIncumbentLean(api),
      );
      carryCount(api, {
        contestId: `presidential:${year}:${key}`,
        date,
        election: year,
        sample,
        places: statePlacesCounted,
        holderSide: holder,
        counted: counted.places,
        sideOf: (id) => field.find((c) => c.id === id)?.side ?? 0,
        conditions: stateConditions,
      });
      // The state's popular vote is a count like any other: kept by the one
      // writer, its winner the side its electors go to.
      const result = keepCount(api, {
        id: `presidential:${year}:${key}`,
        date,
        candidates: field.map((c) => c.id),
        wider: counted,
        reasons,
        // The ticket the state's electors go to: the leading candidate of
        // the side with more of the two-party vote.
        decide: (ranked) => {
          const sideOfId = (id: string) =>
            field.find((c) => c.id === id)?.side ?? 0;
          let r = 0,
            d = 0;
          for (const [id, n] of ranked)
            if (sideOfId(id) > 0) r += n;
            else if (sideOfId(id) < 0) d += n;
          const side = r > d ? 1 : d > r ? -1 : 0;
          return side
            ? (ranked.find(([id]) => sideOfId(id) === side)?.[0] ?? null)
            : null;
        },
        winnerOf: (id) => id,
        takesOffice: `${year + 1}-01-20`,
        stateKey: key,
        office: "President",
      });
      resultId = result.id;
      share = republicanShareOf(result) ?? lean;
    }
    return {
      stateKey: key,
      electors: count,
      lean,
      resultId,
      winnerSide: share > 0.5 ? 1 : share < 0.5 ? -1 : 0,
      from:
        own !== null
          ? "the state's own count"
          : "the state's counties, counted on the election engine",
    };
  });
  const republican = states
    .filter((s) => s.winnerSide > 0)
    .reduce((a, s) => a + s.electors, 0);
  const democratic = states
    .filter((s) => s.winnerSide < 0)
    .reduce((a, s) => a + s.electors, 0);
  let side = republican >= toWin ? 1 : democratic >= toWin ? -1 : 0;
  // No majority: the sitting president's side holds the row until the House
  // and the Senate choose, in January (`decideContingent`).
  const split = side === 0;
  if (split) side = holder;
  const winnerParty = nationalParty(side);
  const winnerId =
    town?.candidates.find((c) => partySide(c.party) === side)?.personId ??
    `official:president:${year}:${winnerParty}`;
  const contingentOn = `${year + 1}-${String(contingentData.meets.month).padStart(2, "0")}-${String(contingentData.meets.day).padStart(2, "0")}`;
  const row: PresidentialRow = {
    id: `presidential:${year}`,
    year,
    states,
    electoral: { republican, democratic },
    winnerParty,
    winnerId,
    vicePresidentParty: winnerParty,
    ...(split
      ? {
          contingent: {
            status: "pending" as const,
            recordId: `contingent:${year}`,
            on: contingentOn,
          },
        }
      : {}),
    inauguration: `${year + 1}-01-20`,
  };
  table(api, "races").put({
    ...row,
    seatId: "seat:US:president",
    office: "president",
    date: api.state.date,
  } as unknown as ModuleRow);
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  if (!calendar.get(`inauguration:${year + 1}`))
    calendar.schedule({
      key: `inauguration:${year + 1}`,
      date: row.inauguration,
      kind: "inauguration",
      source: {
        tag: "SOURCED",
        citation: "U.S. Const. amend. XX, § 1 (noon, January 20)",
        asOf: api.state.date,
      },
      sourceRecordIds: [row.id],
    });
  if (split && !calendar.get(`contingent:${year + 1}`))
    calendar.schedule({
      key: `contingent:${year + 1}`,
      date: contingentOn,
      kind: "contingent-election",
      source: {
        tag: "SOURCED",
        citation:
          "U.S. Const. amend. XII; 3 U.S.C. § 15 (the Congress meets January 6)",
        asOf: api.state.date,
      },
      sourceRecordIds: [String(year)],
    });
}

/**
 * January 6: no ticket won a majority of the electors, so the House chooses
 * the president by state delegation and the Senate the vice president. Every
 * member's vote and the parts of it are kept (the `contingent` table); the
 * presidency row takes the choice, or the one who acts when the House
 * chose no one by the start of the term.
 */
function decideContingent(api: CoreAPI, year: number): void {
  const row = table(api, "races").get(`presidential:${year}`) as unknown as
    PresidentialRow | undefined;
  if (!row?.contingent || row.contingent.status !== "pending") return;
  const result = contingentElection(api, {
    year,
    electors: Object.fromEntries(
      row.states.map((state) => [state.stateKey, state.winnerSide]),
    ),
    // A contingent election votes by state delegation: places with
    // electors but no House delegation (from the data) have no vote.
    states: row.states.filter(
      (state) => !electorsData.withoutHouseDelegation.includes(state.stateKey),
    ).length,
  });
  table(api, "contingent").put({
    id: row.contingent.recordId,
    ...result,
  } as unknown as ModuleRow);
  const town = townPresidentialVote(api, year);
  // The sitting president's side stands in only when nobody could act.
  const side = result.presidentSide || presidentSide(api);
  const winnerParty = nationalParty(side);
  const decided = result.house.chosenSide !== 0;
  table(api, "races").put({
    ...row,
    winnerParty,
    winnerId:
      town?.candidates.find((c) => partySide(c.party) === side)?.personId ??
      `official:president:${year}:${winnerParty}`,
    vicePresidentParty: result.vicePresidentSide
      ? nationalParty(result.vicePresidentSide)
      : null,
    ...(result.acting ? { acting: result.acting } : {}),
    contingent: {
      ...row.contingent,
      status: decided ? "decided" : "deadlocked",
    },
    seatId: "seat:US:president",
    office: "president",
    date: row.contingent.on,
  } as unknown as ModuleRow);
}

/** The town's state's count of the presidential race, where the town voted on it. */
function townPresidentialVote(
  api: CoreAPI,
  year: number,
): {
  republicanShare: number;
  /** The town's count of the race. */
  resultId: string;
  candidates: { personId: string; party: string | null }[];
  /** The same candidates as every other state's voters see them. */
  inputs: CandidateInputs[];
} | null {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) =>
      c.officeId === "office:US:president" &&
      c.electionDate.startsWith(String(year)),
  );
  for (const contest of contests) {
    const result = resultOf(api, contest.id);
    if (!result) continue;
    const candidates = ballot(api, contest.id).map((f) => ({
      personId: f.personId,
      party: f.party ?? null,
    }));
    let r = 0;
    let d = 0;
    for (const c of candidates) {
      const side = partySide(c.party);
      if (side > 0) r += result.totals[c.personId] ?? 0;
      if (side < 0) d += result.totals[c.personId] ?? 0;
    }
    const lean = r + d ? r / (r + d) : 0.5;
    const inputs = ballot(api, contest.id).map((f) =>
      candidateInputs(api, {
        id: f.personId,
        party: f.party ?? null,
        filingId: f.id,
        incumbent:
          (result.electorateReasons?.find((c) => c.id === f.personId)
            ?.incumbency ?? 0) > 0,
        seatParty: null,
        raceLean: 2 * lean - 1,
      }),
    );
    if (r + d > 0)
      return {
        republicanShare: r / (r + d),
        resultId: result.id,
        candidates,
        inputs,
      };
  }
  return null;
}

/** Noon, January 20: the president-elect and their running mate take office. */
function inaugurate(api: CoreAPI, rowId: string): void {
  const row = table(api, "races").get(rowId) as unknown as
    PresidentialRow | undefined;
  if (!row) return;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const terms = offices.table("terms");
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  for (const [seatId, officeId, key, party] of [
    ["seat:US:president", "office:US:president", row.winnerId, row.winnerParty],
    [
      "seat:US:vice-president",
      "office:US:vice-president",
      `running-mate:${row.winnerId}`,
      row.vicePresidentParty,
    ],
  ] as const) {
    // No vice president takes office when the vice president-elect is the one
    // acting as president (amend. XX, § 3), or the Senate chose no one.
    if (party === null) {
      endServingTerms(api, seatId, "term ended");
      continue;
    }
    // The running mate isn't the president's relative: no shared family name.
    const president = (
      terms.query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
    )[0];
    const drawn = drawOfficialIdentity({
      worldSeed: loaded.worldSeed,
      seatKey: key,
      stateUsps: lawChain(api).stateKey.slice(3),
      role: "state-executive-challenger",
      referenceDate: api.state.date,
      ...(seatId === "seat:US:vice-president" && president
        ? { avoidFamilyNames: [president.identity.familyName] }
        : {}),
    });
    const office = offices.table("offices").get(officeId) as
      { readonly title?: string } | undefined;
    seatWinner(api, {
      seatId,
      officeId,
      personId: null,
      identity: {
        givenName: drawn.givenName,
        familyName: drawn.familyName,
        gender: drawn.gender,
        birthDate: drawn.birthDate,
        homeState: lawChain(api).stateKey,
      },
      party,
      endDate: `${Number(api.state.date.slice(0, 4)) + 4}-01-20`,
      reached:
        seatId === "seat:US:president" && row.acting
          ? `acting president, ${row.acting} (amend. XX, § 3), ${row.year}`
          : row.contingent?.status === "decided"
            ? `chosen by Congress ${row.year}`
            : `elected ${row.year}`,
      resultId: rowId,
      title: office?.title ?? officeId,
      winnerId: key,
      news: true,
    });
  }
  if (api.state.modules.has(ELECTIONS_MODULE_ID))
    openNextCycle(api, "seat:US:president");
}
