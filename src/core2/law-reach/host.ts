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
const STANDING_BENEFITS: readonly string[] = ["snap-maximum"];

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
