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
      held.what === input.what &&
      amount === 0
    )
      return;
    table.put({
      ...held,
      count,
      what: input.what,
      lastOn: date,
      times: held.times + (held.lastOn === date ? 0 : 1),
      amountMinor: held.amountMinor + amount,
    } as unknown as ModuleRow);
    return;
  }
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
