/**
 * Scenes from circumstance (owner, Oct 27, 2026, 01:30 Eastern: "if the
 * circumstances are right in the simulation, they should be callable, and
 * the English engine handles the words"). A record written anywhere in the
 * world can call a scene for the player when they are at a kind of place
 * that day and someone there has a reason from the record to bring it to
 * them: a resident who read about a vote the player cast stops them in the
 * street, a coworker brings up the national news, a colleague catches them
 * in the capitol's hallway after a committee hearing.
 *
 * The rows (`data/circumstances.json`) hold the structure and no sentence.
 * This file is pure over the core: it reads only the records written today
 * (each kept as it is recorded, `CircumstanceQueue`), never history or the
 * whole world, and casts the person with the highest score; the record id
 * breaks a tie, so nothing is drawn by chance. The ledger writes the moment
 * it returns and the ordinary scheduler stages the situation type whose
 * cause carries the row's label.
 */
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { NEWS_MODULE_ID, storyOfReadEvent } from "../core2/modules/news";
import { PRESS_MODULE_ID, outletsHere } from "../core2/modules/press";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type {
  CoreEventInput,
  CoreState,
  IsoDate,
  PersonId,
} from "../core2/types";
import rowsJson from "./data/circumstances.json" with { type: "json" };
import { civicFill } from "./civic-roles";
import { classmatesOf } from "./school";
import type { Moment, PersonLedger } from "./types";

const zero = P.zero;
const one = P.one;

export interface CircumstanceRow {
  id: string;
  /** Trigger record kinds ("job" is a job record started today). */
  recordKinds: readonly string[];
  /** Facts the record must carry. */
  recordFacts?: readonly string[];
  /** Facts the record must carry with one of the listed values. */
  recordFactEquals?: Readonly<Record<string, readonly string[]>>;
  /**
   * The record's id begins with this: one producer's records among a kind
   * several write (an interest group's lobbying case among the cases made).
   */
  recordIdPrefix?: string;
  /** For a story read: the tier of the outlet that printed it ("national"). */
  outletTier?: string;
  /**
   * The record may name the player (a meeting names every member): the
   * circumstance is what follows it, with someone else it names.
   */
  playerNamed?: boolean;
  /**
   * Days after the record that the circumstance comes (the morning after a
   * count): the record waits on the director's ledger until then, and the
   * week's spacing between scenes from circumstance does not hold it back,
   * as it follows one thing the player lived through.
   */
  afterDays?: number;
  /**
   * The row follows a record of the player's own life (their school year
   * ending): the week's spacing between scenes from circumstance does not
   * hold it back.
   */
  lived?: boolean;
  /** The kind of place it happens at: the situation type's setting. */
  place: string;
  pool: readonly string[];
  where: string;
  player: string;
  /** The cast rule, as the scene web reads it. */
  cast: string;
  typeKey: string;
  /** The record kind the scene writes back. */
  outcome: string;
  impactParameter: string;
  everyParameter: string;
}

export interface CircumstanceLibrary {
  version: string;
  rows: readonly CircumstanceRow[];
}

export const CIRCUMSTANCES = rowsJson as unknown as CircumstanceLibrary;

/** The label a circumstance moment carries, which the situation type's cause matches. */
export const circumstanceLabel = (rowId: string) => `circumstance:${rowId}`;

/** The rows by trigger record kind, so a record is checked only against its own. */
export function rowsByKind(
  library: CircumstanceLibrary = CIRCUMSTANCES,
): Map<string, CircumstanceRow[]> {
  const out = new Map<string, CircumstanceRow[]>();
  for (const row of library.rows)
    for (const kind of row.recordKinds) {
      const list = out.get(kind) ?? [];
      list.push(row);
      out.set(kind, list);
    }
  return out;
}

/** A record written today that some row could stage, kept as it was recorded. */
export interface QueuedRecord {
  id: string;
  kind: string;
  personIds: readonly PersonId[];
  witnessIds: readonly PersonId[];
  facts: Readonly<Record<string, string>>;
  /** Where the record happened, when it says. */
  placeId?: string;
  /**
   * A core record read directly (a job, a household's member), not a logged
   * event: it is cited by its own id.
   */
  direct?: true;
  /** Held from an earlier day for a row that comes days after its record. */
  later?: true;
  /** The day a held record comes: its own day and the row's days after. */
  dueOn?: IsoDate;
}

export function queuedOf(event: CoreEventInput): QueuedRecord {
  return {
    id: event.id,
    kind: event.kind,
    personIds: [...event.personIds],
    witnessIds: [...(event.witnessIds ?? [])],
    facts: { ...(event.facts ?? {}) },
    ...(event.placeId ? { placeId: event.placeId } : {}),
  };
}

/** What the producer weighs a cast with: the director's tagged parameters. */
export interface CastWeights {
  named: number;
  witnessed: number;
  tie: number;
  sociability: number;
  traitScale: number;
}

export interface CircumstancePick {
  row: CircumstanceRow;
  record: QueuedRecord;
  castId: PersonId;
  score: number;
  /** The player's tie to the cast, as the thread reads it, from 0 toward 1. */
  closeness: number;
}

/** The player's serving terms and filings, read once a day. */
interface PlayerStanding {
  officeIds: Set<string>;
  filed: boolean;
}

function standingOf(
  core: Readonly<CoreState>,
  playerId: PersonId,
): PlayerStanding {
  const api = coreAPI(core as CoreState);
  const officeIds = new Set<string>();
  if (api.state.modules.has(OFFICES_MODULE_ID))
    for (const term of api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [playerId]) as unknown as TermRow[])
      if (term.status === "serving") officeIds.add(term.officeId);
  return { officeIds, filed: openContests(core, playerId).length > zero };
}

/** The contests a person has filed in that are still ahead. */
function openContests(core: Readonly<CoreState>, personId: PersonId): string[] {
  const api = coreAPI(core as CoreState);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  return (
    elections.table("filings").query("byPerson", [personId]) as unknown as {
      contestId: string;
    }[]
  )
    .filter((filing) => {
      const contest = elections.table("contests").get(filing.contestId) as
        { electionDate?: string } | undefined;
      return !contest?.electionDate || contest.electionDate >= core.date;
    })
    .map((filing) => filing.contestId);
}

/** Both people are filed in the same contest still ahead: rivals. */
function sharesContest(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): boolean {
  const mine = new Set(openContests(core, playerId));
  return openContests(core, otherId).some((id) => mine.has(id));
}

/** The tier of the outlet that printed the story a read record is about. */
function outletTierOf(
  core: Readonly<CoreState>,
  record: QueuedRecord,
): string | undefined {
  const storyId = storyOfReadEvent(record.id);
  if (!storyId || !core.modules.has(NEWS_MODULE_ID)) return undefined;
  const api = coreAPI(core as CoreState);
  const story = api
    .moduleState(NEWS_MODULE_ID)
    .table("stories")
    .get(storyId) as { outletId?: string } | undefined;
  if (!story?.outletId || !core.modules.has(PRESS_MODULE_ID)) return undefined;
  // A story names its outlet's organization; the town follows a handful.
  const outlet = outletsHere(api).find(
    (row) => row.organizationId === story.outletId,
  );
  return outlet ? (outlet.tier ?? "local") : undefined;
}

/** The office a record's body is (a meeting's), or its bill's, or undefined. */
function bodyOfRecord(
  core: Readonly<CoreState>,
  record: QueuedRecord,
): string | undefined {
  if (record.facts.officeId && !record.facts.billId)
    return record.facts.officeId;
  const billId = record.facts.billId;
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const bill = coreAPI(core as CoreState)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as { bodyOfficeId?: string } | undefined;
  return bill?.bodyOfficeId;
}

function playerHolds(
  rule: string,
  core: Readonly<CoreState>,
  playerId: PersonId,
  standing: PlayerStanding,
  record: QueuedRecord,
): boolean {
  const serving = standing.officeIds.size > zero;
  switch (rule) {
    case "anyone":
      return true;
    case "resident":
      return !serving && !standing.filed;
    case "public-figure":
      return serving || standing.filed;
    case "serving":
      return serving;
    case "working-or-public": {
      // Someone who could put in a word: they work somewhere, or hold or seek office.
      const job = core.people.get(playerId)?.jobId;
      return (
        serving ||
        standing.filed ||
        (!!job && core.jobs.get(job)?.endsAt === undefined)
      );
    }
    case "heard-it":
      // The player is among those who saw or heard the record (a case made to them).
      return record.witnessIds.includes(playerId);
    case "voted-on-it": {
      const source = record.facts.sourceRecordId;
      return (
        !!source &&
        core.durableLog.get(source)?.personIds.includes(playerId) === true
      );
    }
    case "ran-in-it": {
      // The player filed in the contest the record settled.
      const contestId = record.facts.contestId;
      if (!contestId || !core.modules.has(ELECTIONS_MODULE_ID)) return false;
      return (
        coreAPI(core as CoreState)
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .query("byPerson", [playerId]) as unknown as { contestId: string }[]
      ).some((filing) => filing.contestId === contestId);
    }
    case "named-in-it":
      // The record is the player's own (their school year's end).
      return record.personIds.includes(playerId);
    case "same-body": {
      const body = bodyOfRecord(core, record);
      return !!body && standing.officeIds.has(body);
    }
    default:
      if (rule.startsWith("listed:"))
        // The record's fact lists the player (the members an override's
        // sponsor could still move).
        return (record.facts[rule.slice("listed:".length)] ?? "")
          .split(",")
          .includes(playerId);
      throw new Error(`Unknown circumstance player rule: ${rule}`);
  }
}

/** Who has a reason from the record to be there, before where is checked. */
function poolOf(
  source: string,
  core: Readonly<CoreState>,
  playerId: PersonId,
  record: QueuedRecord,
): { id: PersonId; named: boolean }[] {
  if (source === "named")
    return record.personIds.map((id) => ({ id, named: true }));
  if (source === "witnessed")
    return record.witnessIds.map((id) => ({ id, named: false }));
  if (source === "own-household") {
    // The people the player lives with.
    const player = core.people.get(playerId);
    return [
      ...(core.households.get(player?.householdId ?? "")?.memberIds ?? []),
    ]
      .filter((id) => id !== playerId)
      .sort()
      .map((id) => ({ id, named: false }));
  }
  if (source === "household-of-named") {
    const first = core.people.get(record.personIds[zero] ?? ("" as PersonId));
    return [...(core.households.get(first?.householdId ?? "")?.memberIds ?? [])]
      .filter((id) => id !== first?.id)
      .map((id) => ({ id, named: false }));
  }
  if (source === "ties-of-named") {
    // The people tied to the first person the record names (whom a death is
    // about): their family on record, their household, the people they knew.
    const first = core.people.get(record.personIds[zero] ?? ("" as PersonId));
    if (!first) return [];
    return [
      ...new Set([
        ...first.familyIds,
        ...(core.households.get(first.householdId)?.memberIds ?? []),
        ...first.knownIds,
      ]),
    ]
      .filter((id) => id !== first.id)
      .sort()
      .map((id) => ({ id, named: false }));
  }
  if (source === "ties-of-each-named") {
    // The people tied to anyone the record names (each candidate a count
    // settled): their family on record, their household, the people they knew.
    const ids = new Set<PersonId>();
    for (const namedId of record.personIds) {
      const named = core.people.get(namedId);
      if (!named) continue;
      for (const id of [
        namedId,
        ...named.familyIds,
        ...(core.households.get(named.householdId)?.memberIds ?? []),
        ...named.knownIds,
      ])
        ids.add(id);
    }
    return [...ids].sort().map((id) => ({
      id,
      named: record.personIds.includes(id),
    }));
  }
  if (source === "classmates")
    // The others at the player's school that year.
    return classmatesOf(core, playerId).map((id) => ({ id, named: false }));
  if (source === "new-coworker")
    return record.personIds.map((id) => ({ id, named: true }));
  if (source.startsWith("fact:")) {
    // The person a fact of the record names (a message's candidate).
    const id = record.facts[source.slice("fact:".length)];
    return id && core.people.has(id as PersonId)
      ? [{ id: id as PersonId, named: true }]
      : [];
  }
  if (source.startsWith("civic:")) {
    // A civic role the record's bill or body names (the press corps that
    // covers the body): the role's own fill, read as for any scene.
    const moment = {
      personId: playerId,
      causeId: record.id,
      date: core.date,
    } as unknown as Moment;
    return civicFill(
      source.slice("civic:".length),
      core,
      moment,
      new Set(),
    ).map((id) => ({ id, named: false }));
  }
  throw new Error(`Unknown circumstance pool: ${source}`);
}

function placedWith(
  rule: string,
  core: Readonly<CoreState>,
  playerId: PersonId,
  id: PersonId,
): boolean {
  const player = core.people.get(playerId)!;
  const other = core.people.get(id);
  if (!other) return false;
  switch (rule) {
    case "pool":
      return true;
    case "same-town":
      return other.placeId === player.placeId;
    case "same-household":
      return other.householdId === player.householdId;
    case "same-employer": {
      const mine = player.jobId ? core.jobs.get(player.jobId) : undefined;
      const theirs = other.jobId ? core.jobs.get(other.jobId) : undefined;
      return (
        !!mine &&
        !!theirs &&
        mine.endsAt === undefined &&
        theirs.endsAt === undefined &&
        mine.organizationId === theirs.organizationId
      );
    }
    case "known":
      return player.knownIds.has(id);
    case "rival":
      return sharesContest(core, playerId, id);
    default:
      throw new Error(`Unknown circumstance place rule: ${rule}`);
  }
}

/**
 * Today's best cast for each row, at most one scene per row, for the player
 * whose ledger this is. `importance` is the director's thread importance;
 * `staged` holds the records that already gave the player a moment today (a
 * record that names them is met the ordinary way, not twice). `due` says
 * whether the row's spacing allows a scene today.
 */
export function circumstancePicks(
  core: Readonly<CoreState>,
  book: PersonLedger,
  queue: readonly QueuedRecord[],
  weights: CastWeights,
  options: {
    importance: (otherId: PersonId) => number;
    staged: ReadonlySet<string>;
    due: (row: CircumstanceRow) => boolean;
    /** Whether a person may be cast today (not cast again inside the repeat window). */
    castDue?: (id: PersonId) => boolean;
    byKind?: Map<string, CircumstanceRow[]>;
  },
): CircumstancePick[] {
  const playerId = book.personId;
  const player = core.people.get(playerId);
  if (!player?.alive || !queue.length) return [];
  const byKind = options.byKind ?? rowsByKind();
  let standing: PlayerStanding | undefined;
  const best = new Map<string, CircumstancePick>();
  for (const record of queue) {
    if (options.staged.has(record.id)) continue;
    // A scene cites its cause: an event the log does not keep cannot call one.
    if (!record.direct && !core.durableLog.has(record.id)) continue;
    const namesPlayer = record.personIds.includes(playerId);
    for (const row of byKind.get(record.kind) ?? []) {
      // A record held for later calls only the rows that wait for it.
      if (!!row.afterDays !== !!record.later) continue;
      if (namesPlayer && !row.playerNamed) continue;
      if (!options.due(row)) continue;
      if (row.recordIdPrefix && !record.id.startsWith(row.recordIdPrefix))
        continue;
      if (row.recordFacts?.some((key) => !record.facts[key])) continue;
      if (
        Object.entries(row.recordFactEquals ?? {}).some(
          ([key, values]) => !values.includes(record.facts[key] ?? ""),
        )
      )
        continue;
      if (row.outletTier && outletTierOf(core, record) !== row.outletTier)
        continue;
      standing ??= standingOf(core, playerId);
      if (!playerHolds(row.player, core, playerId, standing, record)) continue;
      for (const source of row.pool)
        for (const { id, named } of poolOf(source, core, playerId, record)) {
          if (id === playerId || core.people.get(id)?.alive !== true) continue;
          if (options.castDue && !options.castDue(id)) continue;
          if (!placedWith(row.where, core, playerId, id)) continue;
          const importance = options.importance(id);
          const closeness = importance / (one + importance);
          const sociability =
            core.people.get(id)!.traits["people-mind-v1:sociability"];
          const social =
            sociability === undefined
              ? zero
              : Math.min(
                  one,
                  Math.max(P.negativeOne, sociability / weights.traitScale),
                );
          const score =
            (named ? weights.named : weights.witnessed) +
            weights.tie * closeness +
            weights.sociability * social;
          const held = best.get(row.id);
          if (
            !held ||
            score > held.score ||
            (score === held.score &&
              (record.id < held.record.id ||
                (record.id === held.record.id && id < held.castId)))
          )
            best.set(row.id, { row, record, castId: id, score, closeness });
        }
    }
  }
  return [...best.values()].sort((a, b) => a.row.id.localeCompare(b.row.id));
}

/** Whether a row's spacing allows a scene on `date`, from the day it last staged one. */
export function spacingAllows(
  last: IsoDate | undefined,
  everyDays: number,
  date: IsoDate,
): boolean {
  return !last || addDays(makeIsoDate(last), everyDays) <= date;
}
