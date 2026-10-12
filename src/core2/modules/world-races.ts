/**
 * State and federal races in the world (M2-10, first slice): every state and
 * federal seat the town only sees from afar is elected on the real general
 * election day, at the coarse level, and its winner is seated on the real
 * date. (Races covering the town run with named voters in `voting.ts`.)
 *
 * Each race is decided by the seat's electorate as a whole: its two-party
 * lean (the district's 2024 House vote, the state's 2024 presidential vote,
 * or for a state legislative district without a read result, the holder's
 * party at an estimated typical margin), the national environment from a
 * cause (in a midterm year, the president's party loses ground, as it has in
 * nearly every midterm since 1946), and the incumbent party's advantage.
 * Nothing is rolled: the same inputs always give the same winner, and every
 * race records its parts.
 */
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import senateClasses from "../../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-views";
import { partySide } from "../appointments";
import { lawChain } from "./laws";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { drawOfficialIdentity } from "../officials-identity";
import { novemberGeneralElectionDay } from "../../simulation/nationwide-world/town-election-calendar";

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
}

export const WORLD_RACES_MODULE: CoreModule = {
  id: WORLD_RACES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      races: { indexes: { byDate: { fields: ["date"] } } },
      /** Congress seats outside the town's state: who holds them now. */
      seats: {},
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
  let year = Number(core.date.slice(0, 4));
  if (year % 2) year += 1;
  if (novemberGeneralElectionDay(year) <= core.date) year += 2;
  scheduleElection(api, year);
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

const houseShare = new Map(
  (
    calibration as unknown as {
      house: {
        stateUsps: string;
        districtCode: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).house.map((h) => [
    `${h.stateUsps}-${h.districtCode}`,
    h.democraticTwoPartyShare,
  ]),
);
const stateShare = new Map(
  (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.democraticTwoPartyShare]),
);
const classes = (
  senateClasses as unknown as {
    states: Record<
      string,
      { class: number; party: string; nextElection: number }[]
    >;
  }
).states;
const congress = (
  partyCounts as unknown as {
    congress: Record<string, Record<string, string[]>>;
  }
).congress;

interface Race {
  readonly seatId: string;
  readonly office: string;
  readonly incumbentParty: string | null;
  readonly lean: number | null;
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
    scheduleElection(api, year + 2);
    for (const race of racesIn(api, year)) decide(api, race, year);
    return;
  }
  if (work.kind === "seat-winner") seat(api, work.sourceRecordIds[0]!);
}

/** The president's side, from the seated president. */
function presidentSide(api: CoreAPI): number {
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const term = (
    terms.query("bySeatStatus", [
      "seat:US:president",
      "serving",
    ]) as unknown as TermRow[]
  )[0];
  return partySide(term?.party ?? null);
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
    if (legislature && seat.electionYear !== year) continue;
    const holder = (
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
    )[0];
    const code = (seat.district ?? "00").padStart(2, "0");
    // A House district's 2024 vote; a state legislative seat with no
    // recorded holder party leans like its state.
    const dShare = house
      ? houseShare.get(`${stateKey.slice(3)}-${code}`)
      : holder?.party
        ? undefined
        : stateShare.get(stateKey.slice(3));
    races.push({
      seatId: seat.id,
      office: office.kind,
      incumbentParty: holder?.party ?? null,
      lean: dShare != null ? 1 - dShare : null,
      leanSource:
        dShare == null
          ? "holder's party at the typical margin"
          : house
            ? "2024 House vote in the district"
            : "2024 presidential vote in the state (no recorded holder)",
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
  // Congress outside the town's state.
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
      const dShare = houseShare.get(`${usps}-${code}`);
      races.push({
        seatId,
        office: "us-house",
        incumbentParty: currentParty(api, seatId, parties[0] ?? null),
        lean: dShare != null ? 1 - dShare : null,
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
      const dShare = stateShare.get(usps);
      races.push({
        seatId,
        office: "us-senate",
        incumbentParty: currentParty(api, seatId, cls.party),
        lean: dShare != null ? 1 - dShare : null,
        leanSource: "2024 presidential vote in the state",
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

function decide(api: CoreAPI, race: Race, year: number): void {
  const side =
    partySide(race.incumbentParty) ||
    (/independent/i.test(race.incumbentParty ?? "") ? -1 : 0);
  // stopgapId: SG-GOV-world-race-lean
  api.stopgap("SG-GOV-world-race-lean");
  const lean =
    race.lean ?? 0.5 + side * campaignParameter("legislativeSeatMargin");
  const midterm = year % 4 === 2;
  const environment = midterm
    ? -presidentSide(api) * campaignParameter("midtermSwing")
    : 0;
  const incumbency = side * campaignParameter("incumbencyShare");
  const share = lean + environment + incumbency;
  const winnerSide = share > 0.5 ? 1 : share < 0.5 ? -1 : side;
  const winnerParty =
    winnerSide === side && race.incumbentParty
      ? race.incumbentParty
      : winnerSide > 0
        ? "Republican"
        : "Democratic";
  const row: RaceRow = {
    id: `race:${race.seatId}:${year}`,
    seatId: race.seatId,
    office: race.office,
    date: api.state.date,
    incumbentParty: race.incumbentParty,
    lean,
    environment,
    incumbency,
    republicanShare: share,
    winnerParty,
    seatedOn: race.seatedOn,
    leanSource: race.leanSource,
  };
  table(api, "races").put({
    ...row,
    offices: race.offices ?? null,
  } as unknown as ModuleRow);
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
  return table(api, "races").rows() as unknown as RaceRow[];
}
