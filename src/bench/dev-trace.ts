/**
 * Dev mode's trace tree (owner, Oct 14, 2026, relayed): from any record, the
 * records and reasons that produced it, one level per click, each child
 * labeled with the engine and the field or function that links it. "How they
 * learned of it" is its own kind. Read-only: it finds what the core and its
 * engines saved; it writes nothing and spends no time.
 */
import { coreAPI } from "../core2/state";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { LEGISLATURE_MODULE_ID, votesOn } from "../core2/modules/legislature";
import { residentsRuntime } from "../core2/modules/residents";
import { raceById, VOTING_MODULE_ID } from "../core2/modules/voting";

// The counted people's store and household, named through the residents entry
// rather than their own file; the accounts module's id as the budgets family
// states it (the guard keeps this file to the families' entries).
type CountedStore = NonNullable<ReturnType<typeof residentsRuntime>>["store"];
type CountedHousehold =
  ReturnType<CountedStore["liveHouseholds"]> extends Iterable<infer H>
    ? H
    : never;
const ACCOUNTS_MODULE_ID = "core2-accounts-v1";
import { preStartHistory, type HistoryRecord } from "../core2/past-module";
import { keepsWhy } from "../core2/why-kept";
import type { CoreState, PersonId, PlaceId } from "../core2/types";
import type { Director } from "../director/ledger";
import { whyPanels, type WhyPanel } from "./dev-why";

export type TraceKind = "record" | "reason" | "learned" | "person" | "missing";

export interface TraceChild {
  readonly id: string;
  readonly kind: TraceKind;
  /** The engine and field or function that links the child to its parent. */
  readonly via: string;
  /** A reason or a learned fact, shown in place (no record of its own). */
  readonly value?: unknown;
  /** The child came of the parent (a law's later events, a bill's laws): not one of its causes. */
  readonly effect?: true;
  /** Who or where the parent is about (its people, place, household, accounts): not one of its causes. */
  readonly about?: true;
}

/**
 * Why the record is there, in one word:
 *   - decided: a decision whose saved reasons are present (`kept` names them);
 *   - caused: no reasons, but it names the records behind it (`causes`);
 *   - circle-only: a decision by someone outside the player's circle, whose
 *     reasons the game does not keep, and no record behind it either;
 *   - opening: made at world creation or by the simulated past, naming no cause;
 *   - no-cause-kept: not dated at or before the start, not a decision, and its
 *     engine named no record behind it (the gap to file against that engine);
 *   - not-a-record: the id is kept nowhere and names no record.
 */
export type TraceAnswer =
  | "decided"
  | "caused"
  | "circle-only"
  | "opening"
  | "no-cause-kept"
  | "not-a-record";

export interface TraceCause {
  readonly id: string;
  readonly engine: string;
  readonly kind: string;
  readonly via: string;
}

export interface TraceNode {
  readonly id: string;
  /** Where the record lives: "core.log", a module id, "core.people", ... */
  readonly engine: string;
  readonly kind: string;
  readonly record: unknown;
  /** Other engine tables that keep a row of their own under the same id. */
  readonly alsoIn?: readonly string[];
  readonly resolver: unknown;
  readonly answer: TraceAnswer;
  /** With "decided": which saved reasons the record holds. */
  readonly kept?: readonly string[];
  /** The first-level records behind this one, each with where it lives and the link. */
  readonly causes?: readonly TraceCause[];
  /** A decision whose reasons were not kept: who decided, and how to keep the next ones. */
  readonly decider?: { readonly personId: string; readonly inCircle: boolean };
  /** With "opening" or "no-cause-kept": the record's own source line. */
  readonly source?: { readonly tag?: string; readonly citation?: string };
  /** What the game keeps no record of here, in plain words (as the why panels' gap lines). */
  readonly gap?: string;
  /** Why panels: the reasons, books, history or ledger behind this record. */
  readonly why: readonly WhyPanel[];
  readonly children: readonly TraceChild[];
}

export interface FoundRecord {
  readonly engine: string;
  readonly kind: string;
  readonly record: unknown;
  /** Other engine tables that keep a row of their own under the same id. */
  readonly alsoIn?: readonly string[];
}

/** Where the counted population's own records answer from. */
export const COUNTED_ENGINE = "core2-residents.counted";
/** A director's moment, kept in a person's book. */
export const MOMENT_ENGINE = "director.moments";
/** The simulated past's own history. */
export const HISTORY_ENGINE = "core2-pre-start.history";
/** A fact of the generated past kept on its person's record. */
export const PAST_FACT_ENGINE = "core.people.pastFacts";
/** A cash account, with its owner and what it holds. */
export const ACCOUNT_ENGINE = "core.cashJournal.accounts";
/** A place, as the core keys its people and records by it. */
export const PLACE_ENGINE = "core.places";
/** A payment the cash journal posted and no longer itemizes. */
export const FOLDED_ENGINE = "core.cashJournal.folded";
/** An outside race folded into its seat's newest race row (`foldOutsideRaces`). */
export const FOLDED_RACE_ENGINE = `${VOTING_MODULE_ID}.races.past`;
/** An id no store keeps, made by a view around the ids of records that are kept. */
export const ID_PARTS_ENGINE = "id-parts";

// A record names others by id; these fields are dates, amounts or labels.
// So are a source line's sentences: a word in one is not an id.
const SKIP = new Set([
  "date",
  "kind",
  "version",
  "status",
  "tag",
  "citation",
  "estimatedFrom",
  "summary",
  "name",
]);
// Fields that say who or where a record is about. The records they name open
// from the tree like any other, but they are not what caused the record.
const ABOUT = new Set([
  "placeId",
  "countyId",
  "personId",
  "personIds",
  "witnessIds",
  "counterpartIds",
  "topic",
  "actorId",
  "targetId",
  "voterId",
  "memberId",
  "memberIds",
  "countedMemberIds",
  "householdId",
  "ownerId",
  "focusOwnerIds",
  "accountId",
  "familyIds",
  "knownIds",
]);
// The stores of who and where: people, households, organizations, accounts, places.
const ENTITIES = new Set([
  "core.people",
  "core.husks",
  "core.organizations",
  "core.publicOrganizations",
  "core.households",
  COUNTED_ENGINE,
  ACCOUNT_ENGINE,
  PLACE_ENGINE,
]);
/** Whether a word could be an id: ids are pieces joined by these marks. */
const idLike = (word: string) => /[:_|]/.test(word);
const MAX_CHILDREN = 80;
const MAX_LEARNED = 40;
const MAX_ID_PARTS = 40;
const MAX_POSTINGS = 12;

type Stores = readonly (readonly [
  engine: string,
  kind: string | undefined,
  rows: (core: CoreState) => ReadonlyMap<string, unknown>,
])[];

/** The core's own records by id; a row without a kind here gives its own. */
const CORE_STORES: Stores = [
  ["core.log", undefined, (core) => core.durableLog],
  ["core.people", "person", (core) => core.people],
  ["core.organizations", undefined, (core) => core.organizations],
  [
    "core.publicOrganizations",
    "public-organization",
    (core) => core.publicOrganizations,
  ],
  ["core.jobs", "job", (core) => core.jobs],
  ["core.households", "household", (core) => core.households],
  ["core.relationships", "relationship", (core) => core.relationships],
  ["core.familyLinks", "family-link", (core) => core.familyLinks],
  ["core.memberships", "membership", (core) => core.memberships],
];

/**
 * After the counted people: a relative kept by name only (a husk) may still be
 * in the counts, and the counts hold their money, job and traits. Then the
 * work and finance engines' records and the quiet choices.
 */
const ENGINE_STORES: Stores = [
  ["core.husks", "person-husk", (core) => core.husks],
  ["core.cashJournal", "payment", (core) => core.cashJournal.detailedReceipts],
  ["core.quietChoices", "person.acted", (core) => core.quietChoices],
  ["core.work.commitments", "work.commitment", (core) => core.work.commitments],
  [
    "core.work.payrollCalendars",
    "work-payroll-calendar",
    (core) => core.work.payrollCalendars,
  ],
  [
    "core.work.earnedPayPeriods",
    "work-earned-pay-period",
    (core) => core.work.earnedPayPeriods,
  ],
  [
    "core.work.detailedPayroll",
    "work-payroll",
    (core) => core.work.detailedPayroll,
  ],
  [
    "core.work.payrollCashSources",
    "work-payroll",
    (core) => core.work.payrollCashSources,
  ],
  [
    "core.work.detailedResults",
    "work.result",
    (core) => core.work.detailedResults,
  ],
  ["core.work.cashSources", "work.result", (core) => core.work.cashSources],
  [
    "core.work.detailedAttendance",
    "work.attendance",
    (core) => core.work.detailedAttendance,
  ],
  [
    "core.work.cashActSelections",
    "person.acted",
    (core) => core.work.cashActSelections,
  ],
  [
    "core.finance.contracts",
    "finance.standing-terms",
    (core) => core.finance.contracts,
  ],
  [
    "core.finance.facilities",
    "finance.facility-terms",
    (core) => core.finance.facilities,
  ],
  [
    "core.finance.detailedReceipts",
    "finance.receipt",
    (core) => core.finance.detailedReceipts,
  ],
  [
    "core.finance.cashRequiredReceipts",
    "finance.receipt",
    (core) => core.finance.cashRequiredReceipts,
  ],
  [
    "core.finance.cashSources",
    "finance.source",
    (core) => core.finance.cashSources,
  ],
];

function inStores(
  core: CoreState,
  stores: Stores,
  id: string,
): FoundRecord | undefined {
  for (const [engine, kind, rows] of stores) {
    const row = rows(core).get(id);
    if (row !== undefined)
      return {
        engine,
        kind: kind ?? String((row as { kind?: unknown }).kind ?? engine),
        record: row,
      };
  }
  return undefined;
}

// MemberState's values (counted-groups.ts), in order.
const MEMBER_STATES = ["counted", "filled-in", "dead", "moved"] as const;

/** A counted household as the store keeps it: its place, group, money and members. */
function countedHouseholdView(store: CountedStore, home: CountedHousehold) {
  return {
    id: home.id,
    placeId: home.placeId,
    groupId: home.group >= 0 ? (store.groups[home.group]?.id ?? null) : null,
    tenure: home.tenure,
    ...(home.quarters ? { quarters: home.quarters } : {}),
    ...(home.district ? { district: home.district } : {}),
    ...(home.since ? { since: home.since } : {}),
    standsFor: store.weightOf(home),
    wagesMinorYear: home.wagesMinorYear,
    retirementMinorYear: home.retirementMinorYear,
    unplacedWorkers: home.unplacedWorkers,
    countedMemberIds: store.memberIdsOf(home),
    memberIds: home.members.map((member) => store.ids[member]!),
    jobIds: home.jobs.map((job) => job.id),
    ...(home.gone ? { gone: true } : {}),
    source: home.source,
  };
}

/** A counted person read from the store's columns; no person record is built. */
function countedMemberView(store: CountedStore, member: number) {
  const jobId = store.jobId[member];
  const home = store.households[store.household[member]!];
  return {
    id: store.ids[member]!,
    givenName: store.given[member]!,
    familyName: store.family[member]!,
    birthDate: store.born[member]!,
    placeId: store.text(store.placeIx[member]!) ?? null,
    householdId: home?.id ?? null,
    ...(jobId ? { jobId } : {}),
    liquidMinor: store.liquid[member]!,
    livingCostDailyMinor: store.living[member]!,
    state: MEMBER_STATES[store.state[member]!] ?? "counted",
    traits: store.traitRecord(member),
    // In the opening's counts: generated with their household, whose source says how.
    ...(member < store.openingMembers && home ? { source: home.source } : {}),
  };
}

/** A household, a person or a group still in the counts (or one that left them and has no full record). */
function countedRecord(core: CoreState, id: string): FoundRecord | undefined {
  const rt = residentsRuntime(core);
  const store = rt?.store;
  if (!rt || !store) return undefined;
  const homeIx = store.householdOf.get(id);
  const home = homeIx === undefined ? undefined : store.households[homeIx];
  if (home)
    return {
      engine: COUNTED_ENGINE,
      kind: home.gone ? "counted-household-left" : "counted-household",
      record: countedHouseholdView(store, home),
    };
  const member = store.memberOf.get(id as PersonId);
  const named = core.husks.has(id as PersonId);
  // Someone who left the counts and is kept by name answers from that record.
  if (member !== undefined && (store.isCounted(member) || !named))
    return {
      engine: COUNTED_ENGINE,
      kind: store.isCounted(member) ? "counted-person" : "counted-person-left",
      record: countedMemberView(store, member),
      ...(named ? { alsoIn: ["core.husks"] } : {}),
    };
  const groupIx = store.groupOf.get(id);
  const group = groupIx === undefined ? undefined : store.groups[groupIx];
  if (group) {
    const { households, ...key } = group;
    return {
      engine: COUNTED_ENGINE,
      kind: "counted-group",
      record: {
        ...key,
        households: households.size,
        fundAccountId: rt.funds.get(group.index) ?? null,
      },
    };
  }
  return undefined;
}

/** A place has no record of its own; the core keys its people and public bodies by it. */
function place(core: CoreState, id: string): FoundRecord | undefined {
  const people = core.peopleByPlace.get(id as PlaceId);
  const focus = core.focusPlaceIds.has(id as PlaceId);
  const visible = core.visiblePlaceIds.has(id as PlaceId);
  const bodies = core.publicOrganizationsByPlace.get(id as PlaceId);
  if (!people && !focus && !visible && !bodies) return undefined;
  return {
    engine: PLACE_ENGINE,
    kind: "place",
    record: {
      id,
      fullPeople: people?.size ?? 0,
      publicOrganizations: bodies?.size ?? 0,
      focus,
      visible,
    },
  };
}

/** A cash account by id: its owner, what it holds and its latest payment. */
function cashAccount(core: CoreState, id: string): FoundRecord | undefined {
  const journal = core.cashJournal;
  const account = journal.accounts.get(id);
  if (!account) return undefined;
  let balanceMinor: number | null = null;
  if (core.modules.has(ACCOUNTS_MODULE_ID))
    try {
      balanceMinor = coreAPI(core).accounts().balance(id);
    } catch {
      balanceMinor = null;
    }
  const totals = journal.totalsByAccount.get(id);
  const latest = journal.latestByAccount.get(id);
  return {
    engine: ACCOUNT_ENGINE,
    kind: "cash-account",
    record: {
      ...account,
      balanceMinor,
      ...(totals
        ? {
            postings: totals.count,
            grossDebitMinor: String(totals.grossDebitMinor),
            grossCreditMinor: String(totals.grossCreditMinor),
          }
        : {}),
      ...(latest
        ? { latestReceiptId: latest.id, latestSourceId: latest.sourceRef.id }
        : {}),
    },
  };
}

/** A standing payment the accounts engine settles on its dates. */
function obligation(core: CoreState, id: string): FoundRecord | undefined {
  if (!core.modules.has(ACCOUNTS_MODULE_ID)) return undefined;
  const row = coreAPI(core).accounts().obligation(id);
  return row
    ? {
        engine: `${ACCOUNTS_MODULE_ID}.obligations`,
        kind: "obligation",
        record: row,
      }
    : undefined;
}

/** An id's pieces and the marks between them: `a:b|c` is a, :, b, |, c. */
const piecesOf = (id: string) => id.split(/([:|@#])/);

/** A fact of the generated past, kept on the record of the person its id names. */
function pastFact(core: CoreState, id: string): FoundRecord | undefined {
  // A fact whose id is a hash (a birth date, a birthplace) names no person: its owner is found by the fact.
  if (id.startsWith("fact_"))
    for (const person of core.people.values()) {
      const fact = person.pastFacts?.find((row) => row.id === id);
      if (fact)
        return {
          engine: PAST_FACT_ENGINE,
          kind: fact.kind,
          record: { ...fact, personId: person.id },
        };
    }
  const pieces = piecesOf(id);
  if (pieces.length < 3 || pieces.length > 2 * MAX_ID_PARTS) return undefined;
  const tried = new Set<string>();
  const owned = (personId: string): FoundRecord | undefined => {
    if (tried.has(personId)) return undefined;
    tried.add(personId);
    const fact = core.people
      .get(personId as PersonId)
      ?.pastFacts?.find((row) => row.id === id);
    return fact
      ? {
          engine: PAST_FACT_ENGINE,
          kind: fact.kind,
          record: { ...fact, personId },
        }
      : undefined;
  };
  // The person is one piece (person_...), or the id's opening or closing run of pieces (official:term:...).
  for (let at = 0; at < pieces.length; at += 2) {
    const found =
      owned(pieces[at]!) ??
      owned(pieces.slice(0, at + 1).join("")) ??
      owned(pieces.slice(at).join(""));
    if (found) return found;
  }
  return undefined;
}

const JOURNAL_ID = /^journal:(\d{4})-\d{2}-\d{2}:(\d+)$/;

/**
 * A payment the journal posted and no longer itemizes: folded into its
 * owners' yearly totals, or never itemized because nobody followed them. The
 * year's folded totals are shown; which owners it moved is not kept.
 */
function foldedReceipt(core: CoreState, id: string): FoundRecord | undefined {
  const match = JOURNAL_ID.exec(id);
  const journal = core.cashJournal;
  if (!match || Number(match[2]) >= journal.nextSequence) return undefined;
  if (id.slice(8, 18) > core.date) return undefined;
  const year = Number(match[1]);
  const totals: unknown[] = [];
  for (const rows of journal.foldedByOwner.values())
    for (const row of rows.values())
      if (row.year === year && totals.length < MAX_CHILDREN) totals.push(row);
  return {
    engine: FOLDED_ENGINE,
    kind: "payment-folded",
    record: {
      id,
      date: id.slice(8, 18),
      sequence: Number(match[2]),
      itemized: false,
      foldedTotals: totals,
    },
  };
}

/** A folded outside race, found by its id inside its seat's newest race row. */
function foldedRace(core: CoreState, id: string): FoundRecord | undefined {
  if (!id.startsWith("race:") || !core.modules.has(VOTING_MODULE_ID))
    return undefined;
  const race = raceById(coreAPI(core), id);
  return race
    ? { engine: FOLDED_RACE_ENGINE, kind: "race-folded", record: race }
    : undefined;
}

/**
 * One lookup's memory: a trace asks about the same ids many times (a
 * payment's postings share their opening pieces), so each id is looked up once.
 */
class Lookup {
  /** The past's rows by id, built on the first ask for one. */
  private historyById?: Map<string, HistoryRecord>;
  private readonly memo = new Map<string, FoundRecord | null>();
  constructor(
    readonly core: CoreState,
    readonly director: Director | undefined,
  ) {}

  /** A record some store keeps under exactly this id. */
  stored(id: string): FoundRecord | undefined {
    const held = this.memo.get(id);
    if (held !== undefined) return held ?? undefined;
    const found = this.find(id);
    this.memo.set(id, found ?? null);
    return found;
  }

  private find(id: string): FoundRecord | undefined {
    const core = this.core;
    return (
      inStores(core, CORE_STORES, id) ??
      // Before the engines' tables: several keep a row of their own under a
      // place's id, or a counted person's or household's.
      place(core, id) ??
      countedRecord(core, id) ??
      inStores(core, ENGINE_STORES, id) ??
      this.moduleRow(id) ??
      this.moment(id) ??
      cashAccount(core, id) ??
      obligation(core, id) ??
      this.history(id) ??
      pastFact(core, id) ??
      foldedReceipt(core, id) ??
      foldedRace(core, id)
    );
  }

  /**
   * The engine table that keeps a row under this id. Where several do (the
   * outcome web keeps a row of its own under a law's id), the record is the
   * one in the table named for the id's first piece (a `law:` id in `laws`),
   * in the engine named for it; the others are listed.
   */
  private moduleRow(id: string): FoundRecord | undefined {
    const api = coreAPI(this.core);
    const first = piecesOf(id)[0]!;
    let best: (FoundRecord & { fit: number }) | undefined;
    const all: string[] = [];
    for (const [moduleId, module] of this.core.modules) {
      const tables = module.state?.tables;
      if (!tables) continue;
      const state = api.moduleState(moduleId);
      for (const name of Object.keys(tables)) {
        const row = state.table(name).get(id);
        if (!row) continue;
        const engine = `${moduleId}.${name}`;
        all.push(engine);
        const fit =
          (name.startsWith(first) ? 2 : 0) + (moduleId.includes(first) ? 1 : 0);
        if (!best || fit > best.fit)
          best = { engine, kind: name, record: row, fit };
      }
    }
    if (!best) return undefined;
    const { engine, kind, record } = best;
    const others = all.filter((other) => other !== engine);
    return {
      engine,
      kind,
      record,
      ...(others.length ? { alsoIn: others } : {}),
    };
  }

  /** A director's moment, from the book of whoever lived it. */
  private moment(id: string): FoundRecord | undefined {
    for (const book of this.director?.ledger.people.values() ?? []) {
      const moment = book.momentsById.get(id);
      if (moment)
        return {
          engine: MOMENT_ENGINE,
          kind: "director-moment",
          record: moment,
        };
    }
    return undefined;
  }

  private history(id: string): FoundRecord | undefined {
    this.historyById ??= new Map(
      preStartHistory(this.core).map((row: HistoryRecord) => [row.id, row]),
    );
    const row = this.historyById.get(id);
    return row
      ? { engine: HISTORY_ENGINE, kind: row.kind, record: row }
      : undefined;
  }

  /**
   * The records an id carries inside it, longest first: a printed story's id
   * ends in the record it tells, a vote's holds its bill and member, a
   * journal moment's holds the record that caused it. Pieces already inside a
   * found record are not asked again.
   */
  parts(id: string): { id: string; found: FoundRecord }[] {
    const pieces = piecesOf(id);
    const count = (pieces.length + 1) / 2;
    if (count < 2 || count > MAX_ID_PARTS) return [];
    const taken = new Array<boolean>(count).fill(false);
    const out: { at: number; id: string; found: FoundRecord }[] = [];
    for (let length = count - 1; length >= 1; length -= 1)
      for (let at = 0; at + length <= count; at += 1) {
        if (taken.slice(at, at + length).some(Boolean)) continue;
        const part = pieces.slice(2 * at, 2 * (at + length) - 1).join("");
        if (part.length <= 6) continue;
        const found = this.stored(part);
        if (!found) continue;
        taken.fill(true, at, at + length);
        out.push({ at, id: part, found });
      }
    return out
      .sort((a, b) => a.at - b.at)
      .map((row) => ({ id: row.id, found: row.found }));
  }

  /** The record under this id; or, for an id no store keeps, the records it names. */
  record(id: string): FoundRecord | undefined {
    const stored = this.stored(id);
    if (stored) return stored;
    const parts = this.parts(id);
    return parts.length
      ? {
          engine: ID_PARTS_ENGINE,
          kind: "composed-id",
          record: {
            id,
            names: parts.map((part) => ({
              id: part.id,
              engine: part.found.engine,
              kind: part.found.kind,
            })),
          },
        }
      : undefined;
  }
}

/**
 * Find a record anywhere the game keeps one: the core's own stores, the
 * counted population, every engine's tables, the director's moments, the cash
 * accounts, the simulated past. An id none of them keeps still answers when
 * it is made of ids they do keep (`id-parts`).
 */
export function findRecord(
  core: CoreState,
  id: string,
  director?: Director,
): FoundRecord | undefined {
  return new Lookup(core, director).record(id);
}

interface Named {
  readonly path: string;
  /** Named only by fields that say who or where the record is about. */
  readonly about: boolean;
}

/** Ids a record names, anywhere in its fields, that resolve to a record. */
function namedIds(
  lookup: Lookup,
  value: unknown,
  path: string,
  out: Map<string, Named>,
  field = "",
  depth = 0,
) {
  if (depth > 4 || out.size > MAX_CHILDREN) return;
  if (typeof value === "string") {
    const about = ABOUT.has(field);
    const held = out.get(value);
    // A field that says more than who or where wins: the id is then a cause.
    if (held ? !held.about || about : value.length <= 6) return;
    if (lookup.stored(value)) out.set(value, { path, about });
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value instanceof Map) {
    for (const [k, v] of value)
      namedIds(lookup, v, `${path}.${k}`, out, field, depth + 1);
    return;
  }
  const list = Array.isArray(value);
  for (const [k, v] of Object.entries(value)) {
    if (SKIP.has(k)) continue;
    const next = list ? field : k;
    // A space-separated id list (dev mode's recordIds) names each id.
    if (typeof v === "string" && v.includes(" ")) {
      for (const part of v.split(" "))
        if (idLike(part))
          namedIds(lookup, part, `${path}.${k}`, out, next, depth + 1);
    } else namedIds(lookup, v, path ? `${path}.${k}` : k, out, next, depth + 1);
  }
}

const rowsOf = (core: CoreState, moduleId: string, table: string) =>
  core.modules.get(moduleId)?.state
    ? (coreAPI(core)
        .moduleState(moduleId)
        .table(table)
        .rows() as unknown as Record<string, unknown>[])
    : [];

/** The records that link back to this one: what it produced or who decided it. */
function reverseLinks(
  core: CoreState,
  id: string,
  found: FoundRecord,
): TraceChild[] {
  const out: TraceChild[] = [];
  const record = found.record as Record<string, unknown>;
  // A law in play: the bill that enacted it, or the dev-mode change that set it.
  if (found.engine === `${LAWS_MODULE_ID}.laws`) {
    const measure = (record.terms as Record<string, unknown> | undefined)
      ?.enactedBy;
    if (typeof measure === "string") {
      for (const bill of rowsOf(core, LEGISLATURE_MODULE_ID, "bills"))
        if (bill.number === measure)
          out.push({
            id: String(bill.id),
            kind: "record",
            via: "core2-legislature-v1.enact",
          });
      for (const row of core.durableLog.values())
        if (
          row.kind === "dev-mode-change" &&
          String(row.facts?.recordIds ?? "")
            .split(" ")
            .includes(id)
        )
          out.push({ id: row.id, kind: "record", via: "dev-mode.setLaw" });
    }
    for (const row of core.durableLog.values())
      if (row.facts?.lawId === id)
        out.push({
          id: row.id,
          kind: "record",
          via: `${row.kind}.lawId`,
          effect: true,
        });
  }
  // A bill: each member's vote with its reasons, and the provisions' laws.
  if (found.engine === `${LEGISLATURE_MODULE_ID}.bills`) {
    for (const vote of votesOn(coreAPI(core), id))
      out.push({
        id: `vote:${id}:${vote.memberId}`,
        kind: "record",
        via: "core2-legislature-v1.chamberVote",
      });
    for (const law of rowsOf(core, LAWS_MODULE_ID, "laws"))
      if (
        (law.terms as Record<string, unknown> | undefined)?.enactedBy ===
        record.number
      )
        out.push({
          id: String(law.id),
          kind: "record",
          via: "core2-laws-v1.enactLaw",
          effect: true,
        });
  }
  // A member's vote: the reasons that summed to it, then the member.
  if (found.engine === `${LEGISLATURE_MODULE_ID}.votes`) {
    out.push({
      id: `${id}#position`,
      kind: "reason",
      via: "core2-legislature-v1.memberPosition",
      value: record.position,
    });
    if (typeof record.memberId === "string")
      for (const stance of rowsOf(core, "views", "stances"))
        if (stance.personId === record.memberId)
          out.push({
            id: String(stance.id),
            kind: "record",
            via: "views.stances",
          });
  }
  // A person: their views, job, household and the director's moments.
  if (found.kind === "person") {
    for (const stance of rowsOf(core, "views", "stances"))
      if (stance.personId === id)
        out.push({
          id: String(stance.id),
          kind: "record",
          via: "views.stances",
        });
  }
  return out;
}

/** People who learned of a record, and how (the core's observed facts). */
function learnedOf(core: CoreState, id: string): TraceChild[] {
  const out: TraceChild[] = [];
  for (const [personId, facts] of core.knowledgeByPerson) {
    for (const [key, fact] of facts)
      if (fact.sourceId === id) {
        out.push({
          id: personId,
          kind: "learned",
          via: `core.observe.${fact.access}`,
          value: { key, learnedAt: fact.learnedAt, access: fact.access },
        });
        break;
      }
    if (out.length >= MAX_LEARNED) break;
  }
  return out;
}

/**
 * What a payment names beyond its fields: the law rows its source line cites
 * (a tax's rate) and the records inside its transfer's and postings' ids (the
 * household, the payer, the law row), so a tax payment opens the law that set it.
 */
function paymentLinks(lookup: Lookup, record: unknown): TraceChild[] {
  const receipt = record as {
    source?: { citation?: unknown };
    sourceRef?: { id?: unknown };
    postings?: readonly { id?: unknown }[];
  };
  const out: TraceChild[] = [];
  const citation = receipt.source?.citation;
  if (typeof citation === "string")
    for (const word of citation.split(/[\s;,()]+/)) {
      const cited = word.replace(/[:.]+$/, "");
      if (cited.length > 6 && idLike(cited) && lookup.stored(cited))
        out.push({
          id: cited,
          kind: "record",
          via: "core.cashJournal.source.citation",
        });
    }
  const within = (text: unknown, via: string) => {
    if (typeof text !== "string") return;
    if (lookup.stored(text)) out.push({ id: text, kind: "record", via });
    else
      for (const part of lookup.parts(text))
        out.push({ id: part.id, kind: "record", via });
  };
  within(receipt.sourceRef?.id, "core.cashJournal.sourceRef.id");
  for (const posting of (receipt.postings ?? []).slice(0, MAX_POSTINGS))
    within(posting.id, "core.cashJournal.postings.id");
  return out;
}

// A row holds its saved reasons under one of these names, or any name ending in "Reasons".
const REASON_FIELDS = [
  "reasons",
  "reasonTerms",
  "scores",
  "compactChoice",
  "reasonKey",
] as const;
// The fields a decision row names its decider by, where it holds the choice made.
const DECIDER_FIELDS = ["actorId", "voterId", "memberId", "personId"] as const;
const CHOICE_FIELDS = [
  "actionId",
  "choice",
  "vote",
  "decision",
  "decidedAs",
  "decidedBy",
] as const;

const filled = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

/** Which saved reasons a record holds: the resolver's, and the row's own fields. */
function keptReasons(resolver: unknown, record: unknown): string[] {
  const kept = new Set<string>();
  const saved = (resolver ?? {}) as Record<string, unknown>;
  for (const name of REASON_FIELDS) if (filled(saved[name])) kept.add(name);
  if (record && typeof record === "object") {
    const row = record as Record<string, unknown>;
    for (const [name, value] of Object.entries(row))
      if (
        filled(value) &&
        ((REASON_FIELDS as readonly string[]).includes(name) ||
          name.endsWith("Reasons"))
      )
        kept.add(name);
    // A member's vote keeps the terms that summed to it as its position.
    if ("vote" in row && row.position && typeof row.position === "object")
      kept.add("position");
    // An act keeps its chooser's result: every option's score, or the chosen one's reasons.
    const decision = row.decision as
      { scores?: unknown[]; selectedReasons?: unknown } | undefined;
    if (decision && typeof decision === "object") {
      if (decision.scores?.length) kept.add("scores");
      if (decision.selectedReasons) kept.add("reasons");
    }
  }
  return [...kept];
}

/** Who decided, where the record is a decision: it holds a choice and names a person as its chooser. */
function deciderOf(lookup: Lookup, record: unknown): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const row = record as Record<string, unknown>;
  if (!CHOICE_FIELDS.some((name) => filled(row[name]))) return undefined;
  for (const name of DECIDER_FIELDS) {
    const id = row[name];
    if (typeof id !== "string") continue;
    const who = lookup.stored(id);
    if (who?.kind === "person" || who?.kind === "counted-person") return id;
  }
  return undefined;
}

// The fields a record dates itself by, in the order they are read.
const MADE_ON = [
  "date",
  "since",
  "introduced",
  "startedAt",
  "startsAt",
  "joinedAt",
  "effectiveDate",
] as const;

/** The day a record says it is from: its own date, else its source line's. */
function madeOn(record: unknown): string | undefined {
  const row = (record ?? {}) as Record<string, unknown>;
  for (const name of MADE_ON)
    if (typeof row[name] === "string") return row[name] as string;
  const asOf = (row.source as { asOf?: unknown } | undefined)?.asOf;
  return typeof asOf === "string" ? asOf : undefined;
}

function sourceOf(record: unknown): TraceNode["source"] {
  const source = (record as { source?: unknown } | null)?.source;
  // A law row's source is its citation, or a list of them.
  if (typeof source === "string") return { citation: source };
  if (Array.isArray(source)) return { citation: source.join(" ; ") };
  if (!source || typeof source !== "object") return undefined;
  const { tag, citation } = source as { tag?: unknown; citation?: unknown };
  return {
    ...(typeof tag === "string" ? { tag } : {}),
    ...(typeof citation === "string" ? { citation } : {}),
  };
}

const GAPS = {
  outsideCircle:
    "The game keeps reasons only for the player's circle and followed people (why-kept), and this person is neither. Follow them and each decision from then on keeps every option's reasons; this one stays without.",
  insideCircle:
    "This decision holds no reasons although its decider is one whose reasons the game keeps.",
  folded:
    "The cash journal posted this payment and no longer itemizes it: it was folded into its owners' yearly totals, or its owners were never followed. Which owners it moved is not kept.",
  noCause: (engine: string) =>
    `${engine} names no record behind this one: only who and where it is about, and its source line.`,
} as const;

/** The one-word answer and what backs it. */
function answerOf(
  lookup: Lookup,
  found: FoundRecord | undefined,
  resolver: unknown,
  children: readonly TraceChild[],
): Pick<
  TraceNode,
  "answer" | "kept" | "causes" | "decider" | "source" | "gap"
> {
  if (!found) return { answer: "not-a-record" };
  const core = lookup.core;
  const kept = keptReasons(resolver, found.record);
  const deciderId = deciderOf(lookup, found.record);
  // The records behind this one: not what came of it, not who or where it is
  // about, and not the person who decided it.
  const causes: TraceCause[] = [];
  for (const child of children) {
    if (child.kind !== "record" || child.effect || child.about) continue;
    if (child.id === deciderId) continue;
    // A source the resolver vouches for may sit in a row no store keeps by this id.
    const record = lookup.record(child.id);
    causes.push({
      id: child.id,
      engine: record?.engine ?? "saved-trace",
      kind: record?.kind ?? "record",
      via: child.via,
    });
  }
  const behind = causes.length ? { causes } : {};
  if (kept.length) return { answer: "decided", kept, ...behind };
  const inCircle = deciderId ? keepsWhy(core, deciderId) : false;
  const decided = deciderId
    ? {
        decider: { personId: deciderId, inCircle },
        gap: inCircle ? GAPS.insideCircle : GAPS.outsideCircle,
      }
    : {};
  if (causes.length) return { answer: "caused", causes, ...decided };
  if (deciderId && !inCircle) return { answer: "circle-only", ...decided };
  const source = sourceOf(found.record);
  const from = source ? { source } : {};
  const date = madeOn(found.record);
  if (
    found.engine === HISTORY_ENGINE ||
    found.engine === PAST_FACT_ENGINE ||
    (date !== undefined && date <= core.startedAt)
  )
    return { answer: "opening", ...from };
  return {
    answer: "no-cause-kept",
    ...decided,
    ...from,
    gap:
      found.engine === FOLDED_ENGINE
        ? GAPS.folded
        : deciderId
          ? GAPS.insideCircle
          : GAPS.noCause(found.engine),
  };
}

/** One node of the tree: the record, the answer, the resolver's own reading and its children. */
export function traceNode(
  core: CoreState,
  director: Director | undefined,
  id: string,
): TraceNode {
  const lookup = new Lookup(core, director);
  // A reason or a learned fact has no record of its own; its parent shows it.
  let found = lookup.record(id);
  let resolver:
    | ReturnType<typeof resolveSavedTraceV1>
    | { status: "refused"; error: string; savedSources: readonly never[] };
  try {
    resolver = resolveSavedTraceV1(core, id);
  } catch (error) {
    // The resolver refuses a record whose saved evidence disagrees; the tree still opens.
    resolver = {
      status: "refused",
      error: error instanceof Error ? error.message : String(error),
      savedSources: [],
    };
  }
  // The resolver reads a few rows no table keeps by this id (a job's current attendance).
  if (!found && "recordKind" in resolver)
    found = { engine: "saved-trace", kind: resolver.recordKind, record: null };
  const children: TraceChild[] = [];
  if ("reasons" in resolver && resolver.reasons)
    children.push({
      id: `${id}#reasons`,
      kind: "reason",
      via: "core2.chooser.reasons",
      value: resolver.reasons,
    });
  if ("reasonTerms" in resolver && resolver.reasonTerms)
    children.push({
      id: `${id}#reasonTerms`,
      kind: "reason",
      via: "core2.chooser.reasonTerms",
      value: resolver.reasonTerms,
    });
  for (const source of resolver.savedSources)
    children.push({
      id: source.recordedRef.id,
      kind: source.status === "resolved-saved-record" ? "record" : "missing",
      via: `saved-trace.${source.recordedRef.kind}`,
    });
  if ("paymentCause" in resolver && resolver.paymentCause)
    children.push({
      id: resolver.paymentCause.receiptId,
      kind: "record",
      via: `saved-trace.${resolver.paymentCause.mechanism}`,
    });
  if (found) {
    // A director moment names the record that caused it.
    if (found.engine === MOMENT_ENGINE) {
      const moment = found.record as { causeId: string; personId: string };
      children.push({
        id: moment.causeId,
        kind: lookup.record(moment.causeId) ? "record" : "missing",
        via: "director.moment.causeId",
        // A moment from the recorded past cites its own person's record and
        // names the fact inside it (`causeFactId`, among the named ids below).
        ...(moment.causeId === moment.personId ? { about: true as const } : {}),
      });
    }
    children.push(...reverseLinks(core, id, found));
    if (found.kind === "payment")
      children.push(...paymentLinks(lookup, found.record));
    const named = new Map<string, Named>();
    namedIds(lookup, found.record, "", named);
    named.delete(id);
    // The records the id itself carries: a printed story's item, a vote's
    // bill. One the record's fields give only as who or where it is about
    // stays that.
    const composed = found.engine === ID_PARTS_ENGINE;
    for (const part of lookup.parts(id)) {
      const field = named.get(part.id);
      // In a kept record's id, a person, a household, an organization, an
      // account or a place is who or where it is about, never what caused it.
      // An id no store keeps is nothing but the records it names.
      const about =
        !composed && (ENTITIES.has(part.found.engine) || field?.about === true);
      children.push({
        id: part.id,
        kind: "record",
        via: "id.names",
        ...(about ? { about: true as const } : {}),
      });
    }
    for (const [childId, { path, about }] of named)
      children.push({
        id: childId,
        kind: "record",
        via: `${found.engine}.${path}`,
        // A person, a household, an organization, an account or a place is
        // who or where, whatever field names it: following one never ends at
        // a decision, a law or a dated cause.
        ...(about || ENTITIES.has(lookup.stored(childId)?.engine ?? "")
          ? { about: true as const }
          : {}),
      });
    children.push(...learnedOf(core, id));
  }
  const seen = new Set<string>();
  const shown = children
    .filter((child) => {
      const key = `${child.kind}|${child.id}`;
      if (child.id === id || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CHILDREN);
  return {
    id,
    engine: found?.engine ?? "none",
    kind: found?.kind ?? "missing",
    // The answer first: the client's tree shows a node's fields in this order.
    ...answerOf(lookup, found, resolver, shown),
    ...(found?.alsoIn ? { alsoIn: found.alsoIn } : {}),
    record: found?.record ?? null,
    resolver,
    why: whyPanels(core, id, found?.record ? found : undefined),
    children: shown,
  };
}

/** The clicked chain as plain text: one line per step, record ids and reasons. */
export function traceReport(
  core: CoreState,
  director: Director | undefined,
  chain: readonly { id: string; via?: string; value?: unknown }[],
): string {
  const lines = [
    `trace report · seed ${core.seed} · place ${core.placeMetadata.placeKey ?? ""} · date ${core.date}`,
  ];
  chain.forEach((step, depth) => {
    const node = findRecord(core, step.id, director);
    const resolver = node ? resolveSavedTraceV1(core, step.id) : undefined;
    const reasons =
      resolver && "reasonKey" in resolver && resolver.reasonKey
        ? ` reasonKey=${resolver.reasonKey}`
        : "";
    const facts = (node?.record as { facts?: Record<string, string> } | null)
      ?.facts;
    lines.push(
      `${"  ".repeat(depth)}${depth ? "<- " : ""}${step.id} [${node?.engine ?? "reason"}${node ? ` ${node.kind}` : ""}]${step.via ? ` via ${step.via}` : ""}${reasons}`,
    );
    if (facts)
      lines.push(
        `${"  ".repeat(depth)}   facts ${Object.entries(facts)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")}`,
      );
    if (step.value !== undefined)
      lines.push(`${"  ".repeat(depth)}   value ${JSON.stringify(step.value)}`);
  });
  return `${lines.join("\n")}\n`;
}
