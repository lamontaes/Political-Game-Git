/**
 * Law reach's host: what an enacted law does once it's law runs through the
 * handler each law-reach file registers for its policy key (a policy
 * question, a law series, or "budget-line:<line>"). The laws module
 * announces "law took effect" (and the budgets module a budget line's
 * change); this module calls the key's handlers with whether the law is now
 * in force for the town. The people and organizations a law reaches are
 * law-reach's own records (`reachOn`).
 *
 * Replaces the law-effects module (M3-04), whose five catalog effects
 * duplicated what law-reach already does for the same questions.
 */
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreEventInput, CoreModule, CoreState } from "../types";
import {
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  yesLevels,
} from "../modules/laws";
import type { LawRowInput } from "../laws-starting";
import { registerLawReach } from "./index";
import { REACH_A_MODULE_ID } from "./group-a-records";
import { REACH_B_MODULE_ID } from "./group-b-store";
import {
  appliedTo,
  endApplied,
  LAW_APPLIED_STATE,
  LAW_APPLIED_TABLE,
  type LawAppliedRow,
} from "./applied";
import type { ModuleRow } from "../module-data";

/** Kept from the module it replaces, so a world opened before still finds it. */
export const LAW_REACH_HOST_ID = "core2-law-effects-v1";

export const LAW_REACH_HOST: CoreModule = {
  id: LAW_REACH_HOST_ID,
  // Who each law reached as the engine applying it recorded it (applied.ts).
  state: { schemaVersion: 1, tables: LAW_APPLIED_STATE },
  eventKinds: ["law-took-effect", "budget-line-changed"],
  onEvent: (api, event) => runHandlers(api, event),
};

export function openLawReach(core: CoreState): void {
  registerLawReach();
  const first = !core.modules.has(LAW_REACH_HOST_ID);
  if (first) registerModule(core, LAW_REACH_HOST);
  // The policies already law at the opening reach people from the first day.
  if (first && core.modules.has(LAWS_MODULE_ID)) {
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const keys = new Set(policyHandlerKeys());
    const rows = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    )
      .filter(
        (r) =>
          r.effectiveDate <= core.date && r.value === 1 && keys.has(r.series),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const row of rows)
      runHandlers(api, {
        id: `law-in-force:${row.id}`,
        date: core.date,
        kind: "law-took-effect",
        personIds: [],
        placeId: town,
        source: {
          tag: row.estimate ? "ESTIMATED" : "SOURCED",
          citation: String(row.source),
          asOf: core.date,
          ...(row.estimate ? { estimatedFrom: String(row.source) } : {}),
        },
        facts: {
          lawId: row.id,
          series: row.series,
          level: row.level,
          jurisdiction: row.jurisdiction,
          value: String(row.value),
        },
      } as unknown as CoreEventInput);
    // A benefit the law pays whatever its amount is paid from the first day.
    for (const series of STANDING_BENEFITS)
      if (keys.has(series))
        runHandlers(api, {
          id: `law-in-force:${series}`,
          date: core.date,
          kind: "law-took-effect",
          personIds: [],
          placeId: town,
          source: {
            tag: "SOURCED",
            citation: `Law in force at the opening (${series})`,
            asOf: core.date,
          },
          facts: { lawId: "", series, level: "federal", jurisdiction: "" },
        } as unknown as CoreEventInput);
  }
}

/** Law series whose amount, not a yes or no, sets a benefit that is paid from the opening. */
const STANDING_BENEFITS: readonly string[] = [
  "snap-maximum",
  "child-care-income-limit",
  "ssi-federal-benefit-rate",
  "energy-assistance-income-limit",
];

/**
 * What a policy does once it's law: one handler per policy key, registered
 * by the law-reach files. Called whenever the law in force on that key may
 * have changed, with whether it's now in force for the town.
 */
export type PolicyHandler = (
  api: CoreAPI,
  change: {
    readonly key: string;
    readonly lawId: string;
    readonly inForce: boolean;
    readonly level: string;
    readonly value: number | null;
    readonly placeId: string;
    /** The treasury read the standing law at its close: only the budget line follows, not the people's records. */
    readonly standing?: boolean;
    /** The law was already in force when the world opened (no change happened today). */
    readonly opening?: boolean;
  },
) => void;
/** The id prefix of the event the treasury raises when it reads a standing law. */
const STANDING_EVENT = "law-standing:";
const handlers = new Map<string, PolicyHandler[]>();
export function registerPolicyHandler(
  key: string,
  handler: PolicyHandler,
): void {
  const list = handlers.get(key) ?? [];
  if (!list.includes(handler)) list.push(handler);
  handlers.set(key, list);
}
export function policyHandlerKeys(): readonly string[] {
  return [...handlers.keys()].sort();
}

function runHandlers(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  // Another state's act is a national event, not the town's law: no handler
  // of the town's effects runs for it.
  if (String(event.placeId).startsWith("national:")) return;
  const facts = event.facts ?? {};
  const key =
    event.kind === "budget-line-changed"
      ? `budget-line:${facts.line}`
      : (facts.series ?? "");
  const value = facts.value === undefined ? null : Number(facts.value);
  const inForce =
    event.kind === "budget-line-changed"
      ? true
      : key.includes(":")
        ? yesLevels(api, key).length > 0
        : true;
  if (event.kind === "law-took-effect") endReplaced(api, key, inForce);
  const list = handlers.get(key);
  if (!list) return;
  for (const handler of list)
    handler(api, {
      key,
      lawId: facts.lawId ?? facts.measureId ?? "",
      inForce,
      level: facts.level ?? "",
      value: Number.isFinite(value) ? value : null,
      placeId: event.placeId,
      standing: event.id.startsWith(STANDING_EVENT),
      ...(event.id.startsWith("law-in-force:") ? { opening: true } : {}),
    });
}

/**
 * The laws that set a budget line's level are read again by the treasury each
 * month it closes and each year a budget is adopted: every level of the town's
 * chain whose latest row says yes runs the key's handlers once more, so a new
 * fiscal year's budget carries what the law in force sets, and a law that has
 * since been repealed is read as such. The handlers keep no duplicate of
 * what they already did.
 */
export function reassertStandingLaws(
  api: CoreAPI,
  keys: readonly string[],
): void {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  const date = api.state.date;
  const town = lawChain(api).townPlaceId;
  for (const key of keys)
    for (const { level, jurisdiction, row: latest } of yesLevels(api, key)) {
      runHandlers(api, {
        id: `${STANDING_EVENT}${latest.id}:${date}`,
        date,
        kind: "law-took-effect",
        personIds: [],
        placeId: town,
        source: {
          tag: "SOURCED",
          citation: `${String(latest.source)} (read by the treasury at its close)`,
          asOf: date,
        },
        facts: {
          lawId: latest.id,
          series: key,
          level,
          jurisdiction,
          value: String(latest.value),
        },
      } as unknown as CoreEventInput);
    }
}

/**
 * A law taking effect ends the applied rows it replaces: every row on the key
 * when the policy is no longer law here; for an amount, the rows citing a row
 * no level holds in force any more (the engines record the new one the next
 * time they apply it). A policy question enacted again at another level while it
 * is already law replaces nothing.
 */
function endReplaced(api: CoreAPI, key: string, inForce: boolean): void {
  if (!key) return;
  if (!inForce) {
    endApplied(api, key);
    return;
  }
  if (key.includes(":")) return;
  const inForceRows = new Set(
    lawInForce(api, key)
      .levels.map((l) => l.row?.id)
      .filter((id): id is string => id !== undefined),
  );
  const table = api.moduleState(LAW_REACH_HOST_ID).table(LAW_APPLIED_TABLE);
  for (const row of table.query("byKey", [
    key,
    null,
  ]) as unknown as LawAppliedRow[])
    if (!inForceRows.has(row.lawId))
      table.put({ ...row, endedOn: api.state.date } as unknown as ModuleRow);
}

/** One law's reach on one person: what it does to them, since when, and whether it has ended. */
export interface ReachOnPerson {
  readonly id: string;
  /** The policy key (a question, a series, or "budget-line:<line>"). */
  readonly key: string;
  readonly lawId: string;
  readonly kind: string;
  readonly what: string;
  readonly since: string;
  readonly endedOn: string | null;
}

/** Every law's reach on one person's record, current and ended, from both law-reach stores. */
export function reachOn(
  api: CoreAPI,
  personId: string,
): readonly ReachOnPerson[] {
  const out: ReachOnPerson[] = [];
  if (api.state.modules.has(REACH_A_MODULE_ID))
    for (const row of api
      .moduleState(REACH_A_MODULE_ID)
      .table("reach")
      .query("byTarget", [personId]) as unknown as {
      id: string;
      key: string;
      lawId: string;
      kind: string;
      what: string;
      since: string;
      endedOn: string | null;
    }[])
      out.push({
        id: row.id,
        key: row.key,
        lawId: row.lawId,
        kind: row.kind,
        what: row.what,
        since: row.since,
        endedOn: row.endedOn,
      });
  if (api.state.modules.has(REACH_B_MODULE_ID))
    for (const row of api
      .moduleState(REACH_B_MODULE_ID)
      .table("people")
      .query("byPerson", [personId]) as unknown as {
      id: string;
      key: string;
      lawId: string;
      kind: string;
      effect: string;
      since: string;
      endedOn: string | null;
    }[])
      out.push({
        id: row.id,
        key: row.key,
        lawId: row.lawId,
        kind: row.kind,
        what: row.effect,
        since: row.since,
        endedOn: row.endedOn,
      });
  for (const row of appliedTo(api, personId))
    out.push({
      id: row.id,
      key: row.key,
      lawId: row.lawId,
      kind: row.engine,
      what: row.what,
      since: row.since,
      endedOn: row.endedOn,
    });
  return out.sort(
    (a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id),
  );
}

/** The people one law reached on a policy key, from both law-reach stores, still in effect. */
export function reachedBy(
  api: CoreAPI,
  key: string,
  lawId: string,
): readonly { readonly personId: string; readonly what: string }[] {
  const out: { personId: string; what: string }[] = [];
  if (api.state.modules.has(REACH_A_MODULE_ID))
    for (const row of api
      .moduleState(REACH_A_MODULE_ID)
      .table("reach")
      .query("byKey", [key, null]) as unknown as {
      lawId: string;
      targetId: string;
      what: string;
    }[])
      if (row.lawId === lawId && api.state.people.has(row.targetId))
        out.push({ personId: row.targetId, what: row.what });
  if (api.state.modules.has(REACH_B_MODULE_ID))
    for (const row of api
      .moduleState(REACH_B_MODULE_ID)
      .table("people")
      .query("byKey", [key, null]) as unknown as {
      lawId: string;
      personId: string;
      effect: string;
    }[])
      if (row.lawId === lawId)
        out.push({ personId: row.personId, what: row.effect });
  if (api.state.modules.has(LAW_REACH_HOST_ID))
    for (const row of api
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .query("byKey", [key, null]) as unknown as LawAppliedRow[])
      if (row.lawId === lawId && api.state.people.has(row.targetId))
        out.push({ personId: row.targetId, what: row.what });
  return out.sort((a, b) => a.personId.localeCompare(b.personId));
}

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
  readonly by: readonly LawReachSide[];
  /** Each full person it reached, the most money first. */
  readonly people: readonly {
    readonly personId: string;
    readonly inTown: boolean;
    readonly what: string;
    readonly amountMinor: number;
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
 * this law do"; `reachedBy` above stays the indexed read of who a key still
 * reaches. It walks the stores, so it is for a screen or a tool, never for a
 * step of play. (Fable audit, Nov 9, 2026: dev mode's count read three
 * modules for a `personId` and missed the applied table, so a property tax
 * and a wage raise read zero, and the crew's harness counted the members who
 * voted.)
 */
export function lawReach(api: CoreAPI, lawId: string): LawReach {
  const core = api.state;
  const town = core.modules.has(LAWS_MODULE_ID)
    ? lawChain(api).townPlaceId
    : "";
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
  const perPerson = new Map<string, { amountMinor: number; what: string }>();
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
    if (held) held.amountMinor += amount;
    else perPerson.set(id, { amountMinor: amount, what: into.what });
    return true;
  };
  const stores: readonly (readonly [string, readonly string[]])[] = [
    [LAW_REACH_HOST_ID, [LAW_APPLIED_TABLE]],
    [REACH_A_MODULE_ID, ["reach", "premiums"]],
    [REACH_B_MODULE_ID, ["people", "organizations", "groups"]],
    [LAWS_MODULE_ID, ["raises"]],
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
