/**
 * Who a law reached, as the engine that applies it records it: when an
 * engine reads a law at the moment it decides or pays (a price at
 * settlement, a lease at renewal, a loan at quotation, a case at a hearing),
 * it records here whom it applied the law to and what it changed. One row
 * per law and target, kept current: the first day it applied, the last, how
 * many times and the money it moved. A repeal ends every open row for the
 * law's key (host.ts). Counted groups are targets like full people, with the
 * people the group stands for as their count.
 */
import type { ModuleRow } from "../module-data";
import type { CoreAPI } from "../types";

export const LAW_APPLIED_TABLE = "applied";

export type AppliedTarget =
  "person" | "household" | "group" | "organization" | "government";

export interface LawAppliedRow {
  readonly id: string;
  /** The policy key (a question, a series, or "budget-line:<line>"). */
  readonly key: string;
  readonly lawId: string;
  /** Whom: a person, household or organization by id, or a counted group by its own id, the id its fund is named by (so the journal's postings on the fund are the group's own money). */
  readonly targetId: string;
  readonly target: AppliedTarget;
  /** The people a counted group stands for; 1 for anyone else. */
  readonly count: number;
  /** The engine that applied it (its module id). */
  readonly engine: string;
  /** What it changed, as a key the English engine words. */
  readonly what: string;
  readonly since: string;
  readonly lastOn: string;
  readonly times: number;
  /** Money the law moved for this target, in minor units (signed: paid in is positive). */
  readonly amountMinor: number;
  readonly endedOn: string | null;
}

/** The host module's id (host.ts); kept here so engines import no host code. */
const HOST_ID = "core2-law-effects-v1";
/** The other stores that record a law applied to someone, by module id (group-a-records.ts, group-b-store.ts, modules/laws.ts). */
const REACH_A_ID = "core2-law-reach-a-v1";
const REACH_B_ID = "core2-law-reach-b-v1";
const LAWS_ID = "core2-laws-v1";

/** Whether the world runs the law reach (laws are applied to people in it). */
export function lawReachRuns(core: {
  readonly modules: ReadonlyMap<string, unknown>;
}): boolean {
  return core.modules.has(HOST_ID);
}

/**
 * Record that an engine applied a law to a target today. A no-op in a world
 * with no law-reach host (a unit test's small world).
 */
export function lawApplied(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly targetId: string;
    readonly target: AppliedTarget;
    readonly engine: string;
    readonly what: string;
    readonly count?: number;
    readonly amountMinor?: number;
  },
): void {
  if (!api.state.modules.has(HOST_ID)) return;
  const table = api.moduleState(HOST_ID).table(LAW_APPLIED_TABLE);
  const id = `applied|${input.key}|${input.targetId}`;
  const date = api.state.date;
  const held = table.get(id) as unknown as LawAppliedRow | undefined;
  const count = input.count ?? 1;
  const amount = Math.round(input.amountMinor ?? 0);
  if (held && !held.endedOn && held.lawId === input.lawId) {
    if (
      held.lastOn === date &&
      held.count === count &&
      held.target === input.target &&
      held.what === input.what &&
      amount === 0
    )
      return;
    // The target's tier follows the record: a counted household filled in as a full one (same id) is a household from then on, and the row says so.
    table.put({
      ...held,
      target: input.target,
      count,
      what: input.what,
      lastOn: date,
      times: held.times + (held.lastOn === date ? 0 : 1),
      amountMinor: held.amountMinor + amount,
    } as unknown as ModuleRow);
    return;
  }
  // Another law's row on this target (ended by the law that replaced it, or
  // still open) is kept under its own law's id, ended, so a replaced or
  // repealed law's reach stays readable (play-what-this-law-did-page: the new
  // law's first payment wrote over the old law's row).
  if (held && held.lawId !== input.lawId)
    table.put({
      ...held,
      id: `${id}|${held.lawId}`,
      endedOn: held.endedOn ?? date,
    } as unknown as ModuleRow);
  const row: LawAppliedRow = {
    id,
    key: input.key,
    lawId: input.lawId,
    targetId: input.targetId,
    target: input.target,
    count,
    engine: input.engine,
    what: input.what,
    since: date,
    lastOn: date,
    times: 1,
    amountMinor: amount,
    endedOn: null,
  };
  table.put(row as unknown as ModuleRow);
}

/** End a target's open row: the engine stopped applying the law to it (moved away, closed). */
export function lawNoLongerApplies(
  api: CoreAPI,
  key: string,
  targetId: string,
): void {
  if (!api.state.modules.has(HOST_ID)) return;
  const table = api.moduleState(HOST_ID).table(LAW_APPLIED_TABLE);
  const held = table.get(`applied|${key}|${targetId}`) as unknown as
    LawAppliedRow | undefined;
  if (held && !held.endedOn)
    table.put({ ...held, endedOn: api.state.date } as unknown as ModuleRow);
}

/** Every open applied row on a key (all targets), oldest first. */
export function appliedOn(api: CoreAPI, key: string): readonly LawAppliedRow[] {
  if (!api.state.modules.has(HOST_ID)) return [];
  return (
    api
      .moduleState(HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .query("byKey", [key, null]) as unknown as LawAppliedRow[]
  )
    .slice()
    .sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
}

/** Every applied row on a key, open and ended (a repeal ends rows, it keeps them), oldest first. */
export function appliedEver(
  api: CoreAPI,
  key: string,
): readonly LawAppliedRow[] {
  if (!api.state.modules.has(HOST_ID)) return [];
  return (
    api
      .moduleState(HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[]
  )
    .filter((r) => r.key === key)
    .sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
}

/** Every applied row naming one target, current and ended. */
export function appliedTo(
  api: CoreAPI,
  targetId: string,
): readonly LawAppliedRow[] {
  if (!api.state.modules.has(HOST_ID)) return [];
  return api
    .moduleState(HOST_ID)
    .table(LAW_APPLIED_TABLE)
    .query("byTarget", [targetId]) as unknown as LawAppliedRow[];
}

/** A repeal: end every open row on the key. */
export function endApplied(api: CoreAPI, key: string): void {
  if (!api.state.modules.has(HOST_ID)) return;
  const table = api.moduleState(HOST_ID).table(LAW_APPLIED_TABLE);
  for (const row of table.query("byKey", [
    key,
    null,
  ]) as unknown as LawAppliedRow[])
    table.put({ ...row, endedOn: api.state.date } as unknown as ModuleRow);
}

export const LAW_APPLIED_STATE = {
  [LAW_APPLIED_TABLE]: {
    indexes: {
      byKey: { fields: ["key", "endedOn"] },
      byTarget: { fields: ["targetId"] },
    },
  },
} as const;

/** One engine's part of a law's reach: what it did, to how many, and the money it moved. */
export interface LawReachSide {
  /** The engine that applied the law (its module id), or the law-reach store that holds the row. */
  readonly engine: string;
  /** What it changed, as the key the English engine words. */
  readonly what: string;
  readonly records: number;
  readonly fullPeople: number;
  /** People still in the counts that its groups, households and counted rows stand for. */
  readonly counted: number;
  readonly organizations: number;
  readonly governments: number;
  /** Money the law moved for these targets, minor units (signed: paid in is positive). */
  readonly amountMinor: number;
}

export interface LawReach {
  readonly lawId: string;
  readonly records: number;
  readonly fullPeople: number;
  /** Full people it reached who live in the played town, and those who live anywhere else. */
  readonly fullPeopleInTown: number;
  readonly fullPeopleElsewhere: number;
  readonly counted: number;
  readonly organizations: number;
  readonly governments: number;
  readonly amountMinor: number;
  readonly amountInTownMinor: number;
  readonly amountElsewhereMinor: number;
  /** Money the law moved for the people still in the counts (counted households, groups and counted rows). */
  readonly amountCountedMinor: number;
  readonly by: readonly LawReachSide[];
  /** Each full person it reached, the most money first. */
  readonly people: readonly {
    readonly personId: string;
    readonly inTown: boolean;
    readonly what: string;
    readonly amountMinor: number;
    /** The day the law stopped applying to them (a repeal, a move), or null while any of their rows is open. */
    readonly endedOn: string | null;
  }[];
}

/**
 * Everyone one law row reached, from every store that records a law applied
 * to someone: the applied table each engine writes when it reads the law at
 * the moment it decides or pays (applied.ts), both law-reach stores, and the
 * wage raises. Full people are named, with where they live; counted people
 * are the numbers their groups stand for; the money is what the engines
 * recorded moving. Ended rows count too: a repealed law reached people while
 * it was law. This is the reader for a check or a page that asks "what did
 * this law do"; `reachedBy` (host.ts) stays the indexed read of who a key
 * still reaches. It walks the stores, so it is for a screen or a tool, never for a
 * step of play. (Fable audit, Nov 9, 2026: dev mode's count read three
 * modules for a `personId` and missed the applied table, so a property tax
 * and a wage raise read zero, and the crew's harness counted the members who
 * voted.)
 */
export function lawReach(
  api: CoreAPI,
  lawId: string,
  /** The played town's place id: full people are split by whether they live there. */
  townPlaceId: string,
): LawReach {
  const core = api.state;
  const town = townPlaceId;
  type Side = {
    engine: string;
    what: string;
    records: number;
    people: Set<string>;
    counted: number;
    organizations: Set<string>;
    governments: Set<string>;
    amountMinor: number;
  };
  const sides = new Map<string, Side>();
  const perPerson = new Map<
    string,
    { amountMinor: number; what: string; endedOn: string | null }
  >();
  let countedMinor = 0;
  // The row being read: its end, for the person it names.
  let rowEnded: string | null = null;
  const side = (engine: string, what: string) => {
    const key = `${engine}|${what}`;
    let held = sides.get(key);
    if (!held)
      sides.set(
        key,
        (held = {
          engine,
          what,
          records: 0,
          people: new Set(),
          counted: 0,
          organizations: new Set(),
          governments: new Set(),
          amountMinor: 0,
        }),
      );
    return held;
  };
  const num = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const person = (into: Side, id: string, amount: number) => {
    if (!core.people.has(id)) return false;
    into.people.add(id);
    const held = perPerson.get(id);
    if (held) {
      held.amountMinor += amount;
      // Open while any row is open; else the latest end.
      held.endedOn =
        held.endedOn === null || rowEnded === null
          ? null
          : held.endedOn > rowEnded
            ? held.endedOn
            : rowEnded;
    } else
      perPerson.set(id, {
        amountMinor: amount,
        what: into.what,
        endedOn: rowEnded,
      });
    return true;
  };
  const stores: readonly (readonly [string, readonly string[]])[] = [
    [HOST_ID, [LAW_APPLIED_TABLE]],
    [REACH_A_ID, ["reach", "premiums"]],
    [REACH_B_ID, ["people", "organizations", "groups"]],
    [LAWS_ID, ["raises"]],
  ];
  for (const [moduleId, tables] of stores) {
    if (!core.modules.has(moduleId)) continue;
    const state = api.moduleState(moduleId);
    const declared = core.modules.get(moduleId)?.state?.tables ?? {};
    for (const name of tables) {
      if (!(name in declared)) continue;
      for (const row of state.table(name).rows() as unknown as Readonly<
        Record<string, unknown>
      >[]) {
        if (row.lawId !== lawId) continue;
        const into = side(
          text(row.engine) || moduleId,
          text(row.what) || text(row.effect) || text(row.key) || name,
        );
        into.records += 1;
        const amount =
          num(row.amountMinor) ||
          // A wage raise: the hourly pay it added, as the raise row keeps it.
          (name === "raises" ? num(row.toMinor) - num(row.fromMinor) : 0);
        into.amountMinor += amount;
        rowEnded = text(row.endedOn) || null;
        const counted = into.counted;
        const target = text(row.target);
        const targetId = text(row.targetId);
        const count = num(row.count) || 1;
        if (typeof row.personId === "string") {
          if (!person(into, row.personId, amount)) into.counted += 1;
        } else if (typeof row.organizationId === "string")
          into.organizations.add(row.organizationId);
        else if (typeof row.reached === "number") into.counted += row.reached;
        else if (target === "organization") into.organizations.add(targetId);
        else if (target === "government") into.governments.add(targetId);
        else if (target === "household") {
          // A full household's members are full people; one still in the counts stands for its count.
          const full = (core.households.get(targetId)?.memberIds ?? []).filter(
            (id) => core.people.has(id),
          );
          if (full.length)
            full.forEach((id, at) => person(into, id, at === 0 ? amount : 0));
          else into.counted += count;
        } else if (target === "group") into.counted += count;
        else if (targetId) {
          // A person by id, or a counted target named by a key of its own ("counted:<spec>").
          if (!person(into, targetId, amount)) into.counted += count;
        }
        // A row read as counted people: its money is theirs.
        if (into.counted > counted) countedMinor += amount;
      }
    }
  }
  const everyone = new Set<string>();
  const organizations = new Set<string>();
  const governments = new Set<string>();
  let records = 0;
  let counted = 0;
  let amountMinor = 0;
  for (const s of sides.values()) {
    records += s.records;
    counted += s.counted;
    amountMinor += s.amountMinor;
    for (const id of s.people) everyone.add(id);
    for (const id of s.organizations) organizations.add(id);
    for (const id of s.governments) governments.add(id);
  }
  const people = [...perPerson]
    .map(([personId, held]) => ({
      personId,
      inTown: core.people.get(personId)?.placeId === town,
      what: held.what,
      amountMinor: held.amountMinor,
      endedOn: held.endedOn,
    }))
    .sort(
      (a, b) =>
        Math.abs(b.amountMinor) - Math.abs(a.amountMinor) ||
        a.personId.localeCompare(b.personId),
    );
  const sum = (rows: readonly { amountMinor: number }[]) =>
    rows.reduce((total, row) => total + row.amountMinor, 0);
  return {
    lawId,
    records,
    fullPeople: everyone.size,
    fullPeopleInTown: people.filter((p) => p.inTown).length,
    fullPeopleElsewhere: people.filter((p) => !p.inTown).length,
    counted,
    organizations: organizations.size,
    governments: governments.size,
    amountMinor,
    amountInTownMinor: sum(people.filter((p) => p.inTown)),
    amountElsewhereMinor: sum(people.filter((p) => !p.inTown)),
    amountCountedMinor: countedMinor,
    by: [...sides.values()]
      .map((s) => ({
        engine: s.engine,
        what: s.what,
        records: s.records,
        fullPeople: s.people.size,
        counted: s.counted,
        organizations: s.organizations.size,
        governments: s.governments.size,
        amountMinor: s.amountMinor,
      }))
      .sort(
        (a, b) =>
          Math.abs(b.amountMinor) - Math.abs(a.amountMinor) ||
          b.records - a.records ||
          `${a.engine}|${a.what}`.localeCompare(`${b.engine}|${b.what}`),
      ),
    people,
  };
}
