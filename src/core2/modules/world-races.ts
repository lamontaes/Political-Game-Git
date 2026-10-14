/**
 * State and federal races in the world (M2-10): every state and federal
 * seat the town only sees from afar is elected on the real general election
 * day, and its winner is seated on the real date. (Races covering the town
 * run with named voters in `voting.ts`.)
 *
 * Each race is counted in its blocks of simulated voters on the same engine
 * as the town's own races (`electorate-blocks.ts`): a House district's 2024
 * voters, a state's counties for the Senate and the presidency, a state
 * legislative district's share of its state. Each block's party groups turn
 * out and choose from the candidates' standing (the holder's incumbency),
 * the national economy since the opening, the midterm penalty and the
 * election laws in force. Nothing is rolled: the same inputs always give the
 * same winner, and every race keeps its votes by block and its reasons.
 */
import senateClasses from "../../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-views";
import { partySide } from "../appointments";
import { lawChain } from "./laws";
import { FEDERAL_HOUSE, members } from "./legislature";
import { ballot, ELECTIONS_MODULE_ID, type ContestRow } from "./elections";
import {
  electionCycle,
  openNextCycle,
  resultOf,
  VOTING_MODULE_ID,
} from "./voting";
import {
  countBlocks,
  houseBlock,
  legislativeBlock,
  stateBlocks,
  type Block,
  type CandidateInputs,
  type CandidateReasons,
  type ElectorateResult,
} from "../electorate-blocks";
import {
  candidateInputs,
  presidentSide,
  raceConditions,
  rememberOpeningElectorate,
} from "../electorate-inputs";
import electorsData from "../data/elections/electoral-votes.json" with { type: "json" };
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { drawOfficialIdentity } from "../officials-identity";
import { novemberGeneralElectionDay } from "../gov-rules/town-election-calendar";

export const WORLD_RACES_MODULE_ID = "core2-world-races-v1";

export interface RaceRow {
  readonly id: string;
  readonly seatId: string;
  readonly office: string;
  readonly date: string;
  readonly incumbentParty: string | null;
  /** The parts of the Republican two-party share. */
  readonly lean: number;
  readonly environment: number;
  readonly incumbency: number;
  readonly republicanShare: number;
  readonly winnerParty: string;
  readonly seatedOn: string;
  readonly leanSource: string;
  /** The blocks' votes for each major party. */
  readonly votes?: { readonly republican: number; readonly democratic: number };
  /** Each party's candidate's reasons, as vote shares in an evenly split electorate. */
  readonly reasons?: readonly CandidateReasons[];
  /** How many blocks counted it. */
  readonly blocks?: number;
}

export const WORLD_RACES_MODULE: CoreModule = {
  id: WORLD_RACES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      races: { indexes: { byDate: { fields: ["date"] } } },
      /** Congress seats outside the town's state: who holds them now. */
      seats: {},
      /** Each counted block's votes in a race, by party-identification group. */
      blocks: { indexes: { byRace: { fields: ["raceId"] } } },
    },
  },
  onCalendarWork: (api, work) => raceWork(api, work),
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(WORLD_RACES_MODULE_ID).table(name);

export function openWorldRaces(core: CoreState): void {
  if (!core.modules.has(WORLD_RACES_MODULE_ID))
    registerModule(core, WORLD_RACES_MODULE);
  const api = coreAPI(core);
  rememberOpeningElectorate(api);
  let year = Number(core.date.slice(0, 4));
  if (novemberGeneralElectionDay(year) <= core.date) year += 1;
  scheduleElection(api, nextRaceYear(api, year));
}

/**
 * The first general election from `from`: every even year, and an odd year
 * when a legislative seat in the town's state outside the town is up then
 * (New Jersey and Virginia elect their legislatures in odd years).
 */
function nextRaceYear(api: CoreAPI, from: number): number {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const legislative = new Set(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
        elected: boolean;
      }[]
    )
      .filter((o) => o.elected && o.kind.startsWith("legislature-"))
      .map((o) => o.id),
  );
  const oddYears = new Set(
    (
      offices.table("seats").rows() as unknown as {
        officeId: string;
        coversTown: boolean;
        electionYear?: number;
      }[]
    )
      .filter((s) => !s.coversTown && legislative.has(s.officeId))
      .map((s) => s.electionYear)
      .filter((y): y is number => y !== undefined && y % 2 === 1),
  );
  let year = from;
  while (year % 2 === 1 && !oddYears.has(year)) year += 1;
  return year;
}

function scheduleElection(api: CoreAPI, year: number): void {
  const date = novemberGeneralElectionDay(year);
  api.moduleCalendar(WORLD_RACES_MODULE_ID).schedule({
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

const classes = (
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
const congress = (
  partyCounts as unknown as {
    congress: Record<string, Record<string, string[]>>;
  }
).congress;

interface Race {
  readonly seatId: string;
  readonly office: string;
  readonly usps: string;
  /** A House district's two-digit code. */
  readonly code: string;
  readonly incumbentParty: string | null;
  readonly leanSource: string;
  readonly seatedOn: string;
  readonly offices?: {
    readonly seatId: string;
    readonly officeId: string;
    readonly termYears: number | null;
  };
}

function raceWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "general-election") {
    const year = Number(work.sourceRecordIds[0]);
    scheduleElection(api, nextRaceYear(api, year + 1));
    for (const race of racesIn(api, year)) decide(api, race, year);
    if (year % 4 === 0)
      api.moduleCalendar(WORLD_RACES_MODULE_ID).schedule({
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
  if (work.kind === "seat-winner") seat(api, work.sourceRecordIds[0]!);
  if (work.kind === "electors-meet")
    electoralCollege(api, Number(work.sourceRecordIds[0]));
  if (work.kind === "inauguration") inaugurate(api, work.sourceRecordIds[0]!);
}

/** The first Tuesday after the second Wednesday in December. */
export function electorsMeet(year: number): string {
  let wednesdays = 0;
  for (let day = 1; day <= 31; day += 1) {
    const d = new Date(Date.UTC(year, 11, day));
    if (d.getUTCDay() === 3) wednesdays += 1;
    if (wednesdays === 2 && d.getUTCDay() === 3) {
      for (let next = day + 1; next <= day + 7; next += 1) {
        const t = new Date(Date.UTC(year, 11, next));
        if (t.getUTCDay() === 2) return t.toISOString().slice(0, 10);
      }
    }
  }
  throw new Error(`No electors' day in ${year}`);
}

export interface PresidentialRow {
  readonly id: string;
  readonly year: number;
  readonly states: readonly {
    readonly stateKey: string;
    readonly electors: number;
    readonly republicanShare: number;
    readonly winnerSide: number;
    readonly from: string;
  }[];
  readonly electoral: {
    readonly republican: number;
    readonly democratic: number;
  };
  readonly winnerParty: string;
  readonly winnerId: string;
  readonly inauguration: string;
}

/**
 * The electors vote: each state's electors go to its statewide winner. The
 * town's state is its own popular vote, counted from named voters and the
 * state's blocks (voting.ts); every other state is counted in its own
 * counties' blocks on the same engine, with the same candidates where the
 * town's ballot names them. A majority of electors (270) wins; a tie goes to
 * the House, voting by state delegation (U.S. Const. amend. XII).
 */
function electoralCollege(api: CoreAPI, year: number): void {
  const { stateKey } = lawChain(api);
  const town = townPresidentialVote(api, year);
  const date = api.state.date;
  const conditions = raceConditions(api, {
    date,
    federal: true,
    family: "president",
    cycle: "presidential",
    cycleShare: cycleShare("presidential"),
    townsState: false,
    town: null,
  });
  const holder = presidentSide(api);
  const states = Object.entries(electors.states).map(([key, count]) => {
    const own = key === stateKey && town ? town.republicanShare : null;
    const blocks = own === null ? stateBlocks(key.slice(3)) : [];
    const votes = blocks.reduce((s, b) => s + b.votes, 0);
    const lean = votes
      ? blocks.reduce((s, b) => s + b.votes * b.target, 0) / votes
      : 0.5;
    const field = town?.inputs.length
      ? town.inputs
      : [-1, 1].map((side) =>
          candidateInputs(api, {
            id: `party:${side > 0 ? "R" : "D"}`,
            party: side > 0 ? "Republican" : "Democratic",
            filingId: null,
            incumbent: false,
            seatParty: null,
            raceLean: 2 * lean - 1,
            side,
            seatSide: holder,
          }),
        );
    let share = own;
    if (share === null) {
      const counted = countBlocks(blocks, field, conditions);
      let r = 0,
        d = 0;
      for (const c of field) {
        if (c.side > 0) r += counted.votes[c.id] ?? 0;
        if (c.side < 0) d += counted.votes[c.id] ?? 0;
      }
      share = r + d ? r / (r + d) : lean;
      recordBlocks(api, `presidential:${year}:${key}`, counted);
    }
    return {
      stateKey: key,
      electors: count,
      republicanShare: share,
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
  let side =
    republican >= electors.toWin ? 1 : democratic >= electors.toWin ? -1 : 0;
  if (side === 0) side = houseDelegationsSide(api);
  const winnerParty = side > 0 ? "Republican" : "Democratic";
  const winnerId =
    town?.candidates.find((c) => partySide(c.party) === side)?.personId ??
    `official:president:${year}:${winnerParty}`;
  const row: PresidentialRow = {
    id: `presidential:${year}`,
    year,
    states,
    electoral: { republican, democratic },
    winnerParty,
    winnerId,
    inauguration: `${year + 1}-01-20`,
  };
  table(api, "races").put({
    ...row,
    seatId: "seat:US:president",
    office: "president",
    date: api.state.date,
  } as unknown as ModuleRow);
  api.moduleCalendar(WORLD_RACES_MODULE_ID).schedule({
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
}

/** The town's state's count of the presidential race, where the town voted on it. */
function townPresidentialVote(
  api: CoreAPI,
  year: number,
): {
  republicanShare: number;
  candidates: { personId: string; party: string | null }[];
  /** The same candidates as every other state's blocks see them. */
  inputs: CandidateInputs[];
} | null {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return null;
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
    if (r + d > 0) return { republicanShare: r / (r + d), candidates, inputs };
  }
  return null;
}

/** A House contingent election: each state's delegation casts one vote by its majority. */
function houseDelegationsSide(api: CoreAPI): number {
  const byState = new Map<string, number>();
  for (const m of members(api, FEDERAL_HOUSE)) {
    const state = m.seatId.split(":")[1] ?? "";
    byState.set(state, (byState.get(state) ?? 0) + partySide(m.party));
  }
  let sum = 0;
  for (const v of byState.values()) sum += Math.sign(v);
  return sum >= 0 ? 1 : -1;
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
  for (const [seatId, officeId, key] of [
    ["seat:US:president", "office:US:president", row.winnerId],
    [
      "seat:US:vice-president",
      "office:US:vice-president",
      `running-mate:${row.winnerId}`,
    ],
  ] as const) {
    for (const term of terms.query("bySeatStatus", [
      seatId,
      "serving",
    ]) as unknown as TermRow[])
      terms.put({
        ...term,
        status: "ended",
        endDate: api.state.date,
        endEstimated: false,
        endedBy: "term ended",
      } as unknown as ModuleRow);
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
    terms.put({
      id: `term:${seatId}:${api.state.date}:elected`,
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
      party: row.winnerParty,
      startDate: api.state.date,
      endDate: `${Number(api.state.date.slice(0, 4)) + 4}-01-20`,
      endEstimated: false,
      reached: `elected ${row.year}`,
      status: "serving",
    } as unknown as ModuleRow);
  }
  if (api.state.modules.has(VOTING_MODULE_ID))
    openNextCycle(api, "seat:US:president");
}

/** Every race this year the town's named voters don't decide. */
function racesIn(api: CoreAPI, year: number): readonly Race[] {
  const races: Race[] = [];
  const stateKey = lawChain(api).stateKey;
  const congressStart = `${year + 1}-01-03`;
  // Seats in the town's own state the town doesn't vote for.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const officeRows = new Map(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
        termYears: number | null;
        elected: boolean;
      }[]
    ).map((o) => [o.id, o]),
  );
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
    if (!house && !legislature) continue;
    // Congress is elected in even years only.
    if (house && year % 2) continue;
    if (legislature && seat.electionYear !== year) continue;
    const holder = (
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
    )[0];
    const code = (seat.district ?? "00").padStart(2, "0");
    races.push({
      seatId: seat.id,
      office: office.kind,
      usps: stateKey.slice(3),
      code,
      incumbentParty: holder?.party ?? null,
      leanSource: house
        ? "2024 House vote in the district"
        : "the state's 2024 two-party vote over its districts, the holder's party at the typical margin",
      seatedOn: house
        ? congressStart
        : (holder?.endDate ?? `${year + 1}-01-01`),
      offices: {
        seatId: seat.id,
        officeId: seat.officeId,
        termYears: office.termYears,
      },
    });
  }
  // Congress outside the town's state, in even years.
  if (year % 2) return races.sort((a, b) => a.seatId.localeCompare(b.seatId));
  for (const [state, seats] of Object.entries(congress)) {
    if (state === stateKey) continue;
    const usps = state.slice(3);
    for (const [district, parties] of Object.entries(seats)) {
      if (district === "senate") continue;
      if (
        ["US-DC", "US-PR", "US-GU", "US-VI", "US-AS", "US-MP"].includes(state)
      )
        continue;
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
    // Senate seats whose class is up this year.
    const sorted = seats.senate ?? [];
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
        incumbentParty: currentParty(api, seatId, cls.party),
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

/** A race's blocks: the House district's, the state's counties, or the legislative district's. */
function raceBlocks(api: CoreAPI, race: Race): readonly Block[] {
  const usps = race.usps;
  if (race.office === "us-house") {
    const block = houseBlock(usps, race.code);
    return block ? [block] : [];
  }
  if (race.office === "us-senate") return stateBlocks(usps);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const districts = new Set(
    (
      offices
        .table("seats")
        .query("byOffice", [race.offices!.officeId]) as unknown as {
        district: string | null;
      }[]
    ).map((s) => s.district),
  ).size;
  const block = legislativeBlock(
    usps,
    race.seatId,
    districts,
    sideOf(race.incumbentParty),
    null,
  );
  return block ? [block] : [];
}

/** Independents in Congress caucus with the Democrats. */
const sideOf = (party: string | null) =>
  partySide(party) || (/independent/i.test(party ?? "") ? -1 : 0);

/**
 * Decide a race the town doesn't vote in: its blocks count it on the same
 * engine as the town's own races. The seat's holder stands for their party
 * (an incumbent official the world doesn't name, with the typical
 * campaign); the other major party fields a typical challenger.
 */
function decide(api: CoreAPI, race: Race, year: number): void {
  const side = sideOf(race.incumbentParty);
  // stopgapId: SG-GOV-world-race-lean
  api.stopgap("SG-GOV-world-race-lean");
  const blocks = raceBlocks(api, race);
  const date = api.state.date;
  const votesAt2024 = blocks.reduce((s, b) => s + b.votes, 0);
  const lean = votesAt2024
    ? blocks.reduce((s, b) => s + b.votes * b.target, 0) / votesAt2024
    : 0.5 + side * campaignParameter("legislativeSeatMargin");
  const cycle = electionCycle(date);
  const conditions = raceConditions(api, {
    date,
    federal: race.office.startsWith("us-"),
    family:
      race.office === "us-house"
        ? "usHouse"
        : race.office === "us-senate"
          ? "statewideExecutive"
          : "stateLegislative",
    cycle,
    cycleShare: cycleShare(cycle),
    townsState: `US-${race.usps}` === lawChain(api).stateKey,
    town: null,
  });
  const parties =
    side === 0
      ? [
          { party: "Democratic", side: -1, incumbent: false },
          { party: "Republican", side: 1, incumbent: false },
        ]
      : [
          { party: race.incumbentParty!, side, incumbent: true },
          {
            party: side > 0 ? "Democratic" : "Republican",
            side: -side,
            incumbent: false,
          },
        ];
  const candidates = parties.map((c) =>
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
  const counted = countBlocks(blocks, candidates, conditions);
  const rep = counted.votes["party:R"] ?? 0,
    dem = counted.votes["party:D"] ?? 0;
  const share = rep + dem ? rep / (rep + dem) : lean;
  const winnerSide = share > 0.5 ? 1 : share < 0.5 ? -1 : side;
  const winnerParty =
    winnerSide === side && race.incumbentParty
      ? race.incumbentParty
      : winnerSide > 0
        ? "Republican"
        : "Democratic";
  const reasonsOf = (s: number) => counted.candidates.find((c) => c.side === s);
  const r = reasonsOf(1),
    d = reasonsOf(-1);
  const environment =
    (r ? r.economy + r.midterm : 0) - (d ? d.economy + d.midterm : 0);
  const incumbency =
    (r ? r.incumbency + r.experience : 0) -
    (d ? d.incumbency + d.experience : 0);
  const row: RaceRow = {
    id: `race:${race.seatId}:${year}`,
    seatId: race.seatId,
    office: race.office,
    date,
    incumbentParty: race.incumbentParty,
    lean,
    environment,
    incumbency,
    republicanShare: share,
    winnerParty,
    seatedOn: race.seatedOn,
    leanSource: race.leanSource,
    votes: { republican: rep, democratic: dem },
    reasons: counted.candidates,
    blocks: counted.blocks.length,
  };
  table(api, "races").put({
    ...row,
    offices: race.offices ?? null,
  } as unknown as ModuleRow);
  recordBlocks(api, row.id, counted);
  api.moduleCalendar(WORLD_RACES_MODULE_ID).schedule({
    key: `seat:${row.id}`,
    date: race.seatedOn > api.state.date ? race.seatedOn : api.state.date,
    kind: "seat-winner",
    source: {
      tag: "SOURCED",
      citation: `Result of ${row.id}`,
      asOf: api.state.date,
    },
    sourceRecordIds: [row.id],
  });
}

/** The cycle's turnout against a presidential year's. */
function cycleShare(cycle: ReturnType<typeof electionCycle>): number {
  return cycle === "presidential"
    ? 1
    : cycle === "midterm"
      ? campaignParameter("midtermShareOfPresidential")
      : campaignParameter("offCycleShareOfPresidential");
}

/** Keep each block's votes by group under its race. */
function recordBlocks(
  api: CoreAPI,
  raceId: string,
  counted: ElectorateResult,
): void {
  const rows = table(api, "blocks");
  for (const block of counted.blocks)
    rows.put({
      ...block,
      id: `block:${raceId}:${block.id}`,
      blockId: block.id,
      raceId,
    } as unknown as ModuleRow);
}

/** Each counted block's votes in a race (a seat's, or a state's presidential vote). */
export function raceBlocksOf(
  api: CoreAPI,
  raceId: string,
): readonly (ElectorateResult["blocks"][number] & { blockId: string })[] {
  return table(api, "blocks").query("byRace", [
    raceId,
  ]) as unknown as (ElectorateResult["blocks"][number] & {
    blockId: string;
  })[];
}

/** Seat the winner on the term's first day. */
function seat(api: CoreAPI, raceId: string): void {
  const race = table(api, "races").get(raceId) as unknown as
    (RaceRow & { offices: Race["offices"] | null }) | undefined;
  if (!race) return;
  if (!race.offices) {
    table(api, "seats").put({
      id: race.seatId,
      party: race.winnerParty,
      since: api.state.date,
      raceId,
    } as unknown as ModuleRow);
    return;
  }
  // A seat the offices engine holds: end the term and start the winner's.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const terms = offices.table("terms");
  const serving = terms.query("bySeatStatus", [
    race.seatId,
    "serving",
  ]) as unknown as TermRow[];
  const reelected = serving[0] && serving[0].party === race.winnerParty;
  for (const term of serving)
    terms.put({
      ...term,
      status: "ended",
      endDate: api.state.date,
      endEstimated: false,
      endedBy: "term ended",
    } as unknown as ModuleRow);
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const identity = reelected
    ? serving[0]!.identity
    : (() => {
        const drawn = drawOfficialIdentity({
          worldSeed: loaded.worldSeed,
          seatKey: raceId,
          stateUsps: lawChain(api).stateKey.slice(3),
          role: "state-executive-challenger",
          referenceDate: api.state.date,
        });
        return {
          givenName: drawn.givenName,
          familyName: drawn.familyName,
          gender: drawn.gender,
          birthDate: drawn.birthDate,
          homeState: lawChain(api).stateKey,
        };
      })();
  const years = race.offices.termYears;
  terms.put({
    id: `term:${race.seatId}:${api.state.date}:elected`,
    seatId: race.seatId,
    officeId: race.offices.officeId,
    personId: reelected ? serving[0]!.personId : null,
    identity,
    party: race.winnerParty,
    startDate: api.state.date,
    endDate: years
      ? `${Number(api.state.date.slice(0, 4)) + years}${api.state.date.slice(4)}`
      : null,
    endEstimated: false,
    reached: `elected ${race.date}`,
    status: "serving",
  } as unknown as ModuleRow);
  const seatRow = offices.table("seats").get(race.seatId) as unknown as
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
