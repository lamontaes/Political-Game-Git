/**
 * The world has a past (owner, Oct 14, 2026): the records of what happened
 * before day one, kept in one module so other engines read them by id.
 *
 * - `laws`: each law row's history (enactment, body, session, roll call,
 *   sponsor, signer, amendments), keyed `law-history:<law row id>`.
 * - `elections`: the election that seated each officeholder, with both
 *   candidates, the votes, turnout and the town's voter groups' split.
 * - `figures`: what the public knows about each public figure: office,
 *   positions, record, prior election and the reputation a public sees.
 * - `closures`: each business that closed in the year before day one, by the
 *   id its archive story cites.
 *
 * The votes themselves go to the record engine's table and the promises to
 * the campaigns engine's, where voting reads them; the archive goes to the
 * news engine's stories. Nothing here is decided in play: who existed and
 * what happened is generated once from the world's seed, and every choice in
 * it (a vote, a split) follows a person's or group's recorded lean.
 */
import { seededUnit } from "./seeded";
import rows from "./data/past/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import { coreAPI, registerModule } from "./state";
import type { CoreAPI, CoreState, IsoDate, PersonId } from "./types";
import type { ModuleRow } from "./module-data";
import { residenceOn } from "./past-moves";
import type { HistoryRecord, PreStartModule } from "./pre-start";
import type { PastClosureRow } from "./past-business";
import type {
  HistoryModule,
  HistoryRow,
  HistoryScope,
  HistorySource,
} from "./past-history";

export const PAST_MODULE_ID = "core2-past-v1";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A past parameter's value, registering its stopgap when it carries one. */
export function pastParameter(api: CoreAPI | null, key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown past parameter: ${key}`);
  if (row.stopgapId) api?.stopgap(row.stopgapId);
  return row.value;
}

/**
 * The races the town's own people lost before the start, kept from the
 * opening of the past until the pre-start run can write them: the past is
 * built before the run's window exists, and whether the loser lived in town
 * that day is known only once the people pass has written their moves.
 */
const racesLost = new WeakMap<CoreState, Omit<HistoryRecord, "moduleId">[]>();

/** Keeps a past race's lost-race rows for the pre-start run (past-elections.ts). */
export function keepPastRacesLost(
  core: CoreState,
  rows: readonly Omit<HistoryRecord, "moduleId">[],
): void {
  racesLost.set(core, [...(racesLost.get(core) ?? []), ...rows]);
}

/** How a law's history is keyed (`law-history:<law row id>`, src/core2/past-laws.ts). */
const LAW_HISTORY = "law-history:";
/** The record kind of a bill a body voted on before day one, as the one history reader tells it. */
export const PAST_BILL_VOTED = "past.bill-voted";
/** The record kind of a law's history before day one (who brought it, who signed it), as the reader tells it. */
export const PAST_LAW_ENACTED = "past.law-enacted";
/** The record kind of a business that closed in the year before day one, as the reader tells it. */
export const PAST_BUSINESS_CLOSED = "past.business-closed";
/** How the past names a business it closed before day one (src/core2/past-business.ts). */
const PAST_CLOSURE = "past-closure:";

/** A business that closed before day one: its kind, name, owner and staff. */
function closureHistory(row: PastClosureRow): HistoryRow {
  return {
    id: row.id,
    date: row.date as IsoDate,
    life: "business",
    what: "closed",
    record: PAST_BUSINESS_CLOSED,
    from: "past",
    personIds: [row.ownerId as PersonId],
    withIds: [row.ownerId as PersonId],
    placeId: row.placeId as HistoryRow["placeId"],
    facts: {
      kindId: row.kindId,
      name: row.name,
      ownerId: row.ownerId,
      cause: row.cause,
      workers: String(row.workers),
    },
    publicRecord: true,
  };
}

/** A bill's roll calls, one per body that voted, told once by the bill's id. */
function billHistory(rows: readonly PastBillRecord[]): HistoryRow {
  const first = rows[0]!;
  return {
    id: first.billId,
    date: first.date as IsoDate,
    life: "politics",
    what: "voted",
    record: PAST_BILL_VOTED,
    from: "past",
    personIds: [],
    withIds: [],
    facts: {
      officeId: first.officeId,
      officeIds: rows.map((row) => row.officeId).join(" "),
      question: first.question,
      position: String(first.position),
      passed: String(rows.every((row) => row.passed)),
      yes: rows.map((row) => row.yes).join(" "),
      no: rows.map((row) => row.no).join(" "),
    },
    publicRecord: true,
  };
}

/** A law's history: the day it was enacted, the body, who brought it and who signed it. */
function lawHistoryRow(row: LawHistoryRow): HistoryRow {
  const people = [row.sponsorId, row.signedBy].filter(
    (id): id is string => !!id,
  ) as PersonId[];
  return {
    id: row.id,
    date: row.enactedOn as IsoDate,
    life: "politics",
    what: "enacted",
    record: PAST_LAW_ENACTED,
    from: "past",
    personIds: [...new Set(people)],
    withIds: [...new Set(people)],
    facts: {
      lawId: row.lawId,
      series: row.series,
      jurisdiction: row.jurisdiction,
      level: row.level,
      body: row.body,
      billId: row.billId,
      effectiveDate: row.effectiveDate,
      ...(row.sponsorId ? { sponsorId: row.sponsorId } : {}),
      ...(row.signedBy ? { signedBy: row.signedBy } : {}),
    },
    publicRecord: true,
  };
}

/**
 * The past's bills that are no law's, grouped by bill. A law's own roll calls
 * (`billId` its history's id) are told with its history.
 */
function pastBills(api: CoreAPI): Map<string, PastBillRecord[]> {
  const out = new Map<string, PastBillRecord[]>();
  for (const row of pastTable(
    api,
    "bills",
  ).rows() as unknown as PastBillRecord[]) {
    if (row.billId.startsWith(LAW_HISTORY)) continue;
    const held = out.get(row.billId);
    if (held) held.push(row);
    else out.set(row.billId, [row]);
  }
  for (const rows of out.values())
    rows.sort((a, b) => a.officeId.localeCompare(b.officeId));
  return out;
}

/**
 * The past's bills and laws are history: the reader tells them by kind, a
 * person's (a law they brought or signed) or a place's, state's or the
 * nation's, where they were voted.
 */
const PAST_HISTORY: HistorySource = {
  id: PAST_MODULE_ID,
  *rows(core: CoreState, scope: HistoryScope, ask) {
    if (!core.modules.has(PAST_MODULE_ID) || !ask.kinds) return;
    if ("household" in scope || "employer" in scope) return;
    const api = coreAPI(core);
    if (ask.kinds.includes(PAST_LAW_ENACTED))
      for (const row of pastTable(
        api,
        "laws",
      ).rows() as unknown as LawHistoryRow[])
        if (
          !("person" in scope) ||
          row.sponsorId === scope.person ||
          row.signedBy === scope.person
        )
          yield lawHistoryRow(row);
    if (ask.kinds.includes(PAST_BILL_VOTED) && !("person" in scope))
      for (const rows of pastBills(api).values()) yield billHistory(rows);
    if (ask.kinds.includes(PAST_BUSINESS_CLOSED))
      for (const row of pastTable(
        api,
        "closures",
      ).rows() as unknown as PastClosureRow[])
        if (!("person" in scope) || row.ownerId === scope.person)
          yield closureHistory(row);
  },
  row(core, id) {
    if (!core.modules.has(PAST_MODULE_ID)) return undefined;
    const api = coreAPI(core);
    if (id.startsWith(PAST_CLOSURE)) {
      const row = pastTable(api, "closures").get(id) as unknown as
        PastClosureRow | undefined;
      return row ? closureHistory(row) : undefined;
    }
    if (id.startsWith(LAW_HISTORY)) {
      const row = pastTable(api, "laws").get(id) as unknown as
        LawHistoryRow | undefined;
      return row ? lawHistoryRow(row) : undefined;
    }
    const rows = pastBills(api).get(id);
    return rows ? billHistory(rows) : undefined;
  },
};

export const PAST_MODULE: PreStartModule & HistoryModule = {
  id: PAST_MODULE_ID,
  history: PAST_HISTORY,
  state: {
    schemaVersion: 1,
    tables: {
      laws: { indexes: { byLaw: { fields: ["lawId"] } } },
      bills: { indexes: { byOffice: { fields: ["officeId"] } } },
      figures: { indexes: { byPerson: { fields: ["personId"] } } },
      closures: {},
      loaded: {},
    },
  },
  // After the people pass (their moves into the county), with the rest of
  // the government's history: a race lost on the loser's own past, where
  // they lived in town on the race's day.
  preStart: {
    phase: "government",
    run(api, window, history) {
      const core = api.state as CoreState;
      for (const row of racesLost.get(core) ?? []) {
        const person = core.people.get(row.personIds?.[0] ?? ("" as never));
        if (!person || row.date < window.from || row.date > window.through)
          continue;
        if (residenceOn(core, person, row.date).placeId !== row.placeId)
          continue;
        history.record(row);
      }
      racesLost.delete(core);
    },
  },
};

export function openPastModule(core: CoreState): void {
  if (!core.modules.has(PAST_MODULE_ID)) registerModule(core, PAST_MODULE);
}

export function pastTable(api: CoreAPI, name: string) {
  return api.moduleState(PAST_MODULE_ID).table(name);
}

export function putPast(api: CoreAPI, name: string, row: object): void {
  pastTable(api, name).put(row as unknown as ModuleRow);
}

export {
  PAST_ARRESTED,
  PAST_CONVICTED,
  PAST_IMPRISONED,
  PAST_RELEASED,
  pastJusticeFor,
} from "./past-justice";
export { prisonTermOf } from "./past-work";
export { seededUnit } from "./seeded";

// The one history, for the engines that run or read it (light imports only:
// the engines load this entry while the core is still loading).
export {
  coarseSteps,
  ownWindowOf,
  pastForLater,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartModule,
  type PreStartWindow,
  wholePastOpened,
} from "./pre-start";
// The one history reader: what already happened, for a person, a household,
// an employer, a place, a state or the nation (src/core2/past-history.ts).
export {
  historyEvent,
  historyOf,
  historyOrder,
  openHistory,
  recordDate,
  recordOf,
  whereOf,
  type HistoryAsk,
  type HistoryEvent,
  type HistoryModule,
  type HistoryRow,
  type HistoryScope,
  type HistorySource,
  type HistoryWhere,
} from "./past-history";
export {
  PAST_WORK_OUT,
  PAST_WORK_SPELL,
  findPerQuarter,
  heldSinceRecord,
  pastWorkFor,
  pastWorkHistory,
  pastWorkOf,
} from "./past-work";
export {
  PERSON_MOVED_IN,
  PERSON_MOVED_WITHIN,
  bornIn,
  hasParentHere,
  pastMovesFor,
  pastMovesHistory,
  residenceOn,
  writeChildBirthplaces,
  type DepartureRate,
} from "./past-moves";
export { pastHealthFor } from "./past-health";
export { pastPartnersFor } from "./past-partners";
export {
  PAST_DISCHARGED,
  PAST_ENLISTED,
  pastServiceFor,
} from "./past-military";
export {
  COLLEGE_ENDED,
  COLLEGE_STARTED,
  SCHOOL_FINISHED,
  SCHOOL_STARTED,
  schoolHistory,
  schoolHistoryFor,
  schoolName,
  schoolOfPlace,
  schoolsAttended,
  type SchoolAttended,
} from "./past-school";

/** A value inside [low, high], fixed by the seed and key. */
export function seededBetween(
  seed: string,
  key: string,
  low: number,
  high: number,
): number {
  return low + (high - low) * seededUnit(seed, key);
}

export function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** A candidate in a past election: a person in the world, or a named identity. */
export interface PastCandidate {
  readonly personId: string | null;
  readonly name: string;
  readonly party: string | null;
  readonly lean: number;
  readonly votes: number;
  readonly share: number;
  readonly incumbent: boolean;
}

export interface PastElectionRow {
  readonly id: string;
  readonly seatId: string;
  readonly officeId: string;
  readonly date: string;
  readonly termId: string;
  readonly winnerId: string;
  readonly candidates: readonly PastCandidate[];
  readonly totalVotes: number;
  /**
   * The count this world's `totalVotes` was drawn around (the recorded total
   * where the corpus has the race, else the electorate's ballots times
   * turnout), whole votes: the world never prints it as its own. None for a
   * race the century counted (`centuryRecordId`), whose count is its own.
   */
  readonly sourceVotes?: number;
  /** The century's record of the race (`century:presidential:<year>`), where the century counted it. */
  readonly centuryRecordId?: string;
  /** The town's voter groups: their ballots and the winner's share of them. */
  readonly townGroups: readonly {
    readonly groupId: string;
    readonly ballots: number;
    readonly winnerShare: number;
  }[];
  readonly promiseIds: readonly string[];
  /** The questions those promises spoke to, in the same order. */
  readonly promiseQuestions: readonly string[];
  readonly source: { readonly tag: string; readonly citation: string };
}

export interface RollCall {
  readonly body: string;
  readonly yes: number;
  readonly no: number;
  /** Members of the world who voted, by person id. */
  readonly yesIds: readonly string[];
  readonly noIds: readonly string[];
  /** Seats then held by people who left before day one. */
  readonly predecessors: number;
}

/**
 * A prior-term bill's roll call as the world keeps it, by the body's office:
 * the whole count, the seats' earlier holders included. The member vote rows
 * (`record` votes) hold only those who still lived in the world, so a body
 * whose every member took their seat since the vote has the bill here and no
 * member rows; a screen reads the count here, never a count of those rows.
 */
export interface PastBillRecord {
  /** The record's own key: the bill and the body together (a law's one id spans its chambers). */
  readonly id: string;
  /** The bill's id as its member vote rows carry it (`billId`). */
  readonly billId: string;
  /** The office of the body that voted (the id its vote rows carry as `body`). */
  readonly officeId: string;
  readonly date: string;
  readonly question: string;
  /** Which way the bill moved the question: 1 for yes, -1 for no. */
  readonly position: number;
  readonly passed: boolean;
  readonly yes: number;
  readonly no: number;
}

export interface PastBillRow {
  readonly id: string;
  readonly body: string;
  readonly date: string;
  readonly question: string;
  readonly position: number;
  readonly sponsorId: string | null;
  readonly sponsorName: string;
  readonly rollCall: RollCall;
  readonly passed: boolean;
  /** The law row this bill enacted, where it is a law in force. */
  readonly lawIds: readonly string[];
}

export interface LawHistoryRow {
  readonly id: string;
  readonly lawId: string;
  readonly lawIds: readonly string[];
  readonly jurisdiction: string;
  readonly level: string;
  readonly series: string;
  readonly effectiveDate: string;
  readonly enactedOn: string;
  readonly enactedFrom: "effective-date" | "undated";
  readonly body: string;
  readonly session: Readonly<Record<string, string>>;
  readonly billId: string;
  readonly rollCalls: readonly RollCall[];
  readonly sponsorId: string | null;
  readonly sponsorName: string;
  readonly signedBy: string | null;
  readonly signerName: string;
  readonly amends: string | null;
  readonly amendedBy: string | null;
  readonly source: { readonly tag: string; readonly citation: string };
}

export interface PublicFigureRow {
  readonly id: string;
  readonly personId: string;
  readonly officeId: string;
  readonly seatId: string;
  /** Who would know: everyone, a state, or the town (a place id). */
  readonly scope: string;
  readonly party: string | null;
  readonly serviceStart: string;
  readonly positions: readonly { question: string; position: number }[];
  readonly reputation: readonly { trait: string; strength: number }[];
  readonly votesOnRecord: number;
  readonly lawsSponsored: number;
  readonly lawsSigned: number;
  readonly electionId: string | null;
  readonly promiseIds: readonly string[];
}

/** A body's prior-term bills with their whole roll calls, in no set order. */
export function pastBillsOf(
  api: CoreAPI,
  officeId: string,
): readonly PastBillRecord[] {
  if (!api.state.modules.has(PAST_MODULE_ID)) return [];
  return (
    (pastTable(api, "bills").query("byOffice", [officeId]) as unknown as
      PastBillRecord[] | undefined) ?? []
  );
}

/** A law row's history, by the law row's id. */
export function lawHistory(
  api: CoreAPI,
  lawId: string,
): LawHistoryRow | undefined {
  if (!api.state.modules.has(PAST_MODULE_ID)) return undefined;
  return (
    pastTable(api, "laws").query("byLaw", [lawId]) as unknown as
      LawHistoryRow[] | undefined
  )?.[0];
}
