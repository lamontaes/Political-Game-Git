/**
 * The counted population's purchase flows: adding, ending, reopening and
 * resizing a resident flow and its parts, and the flow parts maps this engine
 * may change in place. They are the residents engine's own writers of its
 * flows, moved here as written; residents-economy.ts and modules/residents.ts
 * re-export them.
 */
import { residentsRuntime } from "./residents-reads";
import type { CoreState } from "./types";
import type { ResidentFlowInput } from "./residents";
import { makeIsoDate, addDays } from "./kernel/dates";

/**
 * Merged maps the drift may edit in place: copied once (the opening input
 * stays as built), then edited without copying thousands of entries per move.
 */
const ownedMaps = new WeakSet<object>();

/**
 * A flow's parts map this module may change in place: copied once on the
 * first change (the opening's maps may be shared or frozen), then reused.
 * A merged flow holds a part for every counted household, so copying it on
 * every change was most of fill-in's cost.
 */
export function ownMap(
  map: Readonly<Record<string, number>>,
): Record<string, number> {
  if (ownedMaps.has(map)) return map as Record<string, number>;
  const copy = { ...map };
  ownedMaps.add(copy);
  return copy;
}

export type Runtime = NonNullable<ReturnType<typeof residentsRuntime>>;

export type Flow = Runtime["flows"] extends Map<string, infer F> ? F : never;

/** A standing flow begins mid-run, first due on its own date (never today). */
export function addResidentFlow(
  core: CoreState,
  input: ResidentFlowInput,
): void {
  const rt = residentsRuntime(core);
  if (!rt) throw new Error("No wider population to add a flow to.");
  if (rt.flows.has(input.id)) throw new Error(`Duplicate flow: ${input.id}`);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error(`Invalid flow amount: ${input.id}`);
  for (const id of [input.payerId, input.payeeId])
    if (!core.organizations.has(id) && !core.people.has(id))
      throw new Error(`Flow owner is not recorded: ${id}`);
  let nextAt = makeIsoDate(input.firstAt);
  if (nextAt <= core.date)
    nextAt = makeIsoDate(addDays(makeIsoDate(core.date), 1));
  const flow = { ...input, nextAt, arrearsMinor: 0 } as Flow;
  rt.flows.set(input.id, flow);
  const ids = rt.due.get(nextAt) ?? new Set<string>();
  ids.add(input.id);
  rt.due.set(nextAt, ids);
}

/** One household's part of a merged flow ends (a counted household's mortgage paid off). */
export function endFlowPart(
  core: CoreState,
  id: string,
  part: string,
): boolean {
  const flow = residentsRuntime(core)?.flows.get(id);
  const amount = flow?.amountByContract?.[part];
  if (!flow || flow.endedAt || amount === undefined) return false;
  const parts = ownMap(flow.amountByContract!);
  delete parts[part];
  flow.amountByContract = parts;
  flow.amountMinor = Math.max(0, flow.amountMinor - amount);
  return true;
}

/**
 * One household's part joins a merged flow (a counted household's new
 * mortgage): the flow pays its parts' sum from its next due date. False when
 * there is no such live merged flow; a part already there is an error.
 */
export function addFlowPart(
  core: CoreState,
  id: string,
  part: string,
  amountMinor: number,
): boolean {
  const flow = residentsRuntime(core)?.flows.get(id);
  if (!flow || flow.endedAt || !flow.amountByContract) return false;
  if (flow.amountByContract[part] !== undefined)
    throw new Error(`The flow already has the part: ${id} ${part}`);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    throw new Error(`Invalid part amount: ${id} ${part}`);
  const parts = ownMap(flow.amountByContract);
  parts[part] = amountMinor;
  flow.amountByContract = parts;
  flow.amountMinor += amountMinor;
  return true;
}

/**
 * A counted household's standing flow (its rent) pays a new amount from its
 * next due date: zero while the household is behind, its rent again once it
 * catches up. False when there is no such live flow.
 */
export function setResidentFlowAmount(
  core: CoreState,
  id: string,
  amountMinor: number,
): boolean {
  const flow = residentsRuntime(core)?.flows.get(id);
  if (!flow || flow.endedAt) return false;
  flow.amountMinor = Math.max(0, Math.round(amountMinor));
  return true;
}

/**
 * A counted household's standing flow, ended before (its rent, after a
 * removal), begins again under the same id: a new payee, amount and source,
 * first due on its own date (never today), with nothing owed. One that never
 * existed is added. Readers that look the flow up by id (`rent:<household>`)
 * find it again.
 */
export function reopenResidentFlow(
  core: CoreState,
  input: ResidentFlowInput,
): void {
  const rt = residentsRuntime(core);
  const flow = rt?.flows.get(input.id);
  if (!rt || !flow) return addResidentFlow(core, input);
  if (!flow.endedAt) throw new Error(`The flow is still running: ${input.id}`);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error(`Invalid flow amount: ${input.id}`);
  for (const id of [input.payerId, input.payeeId])
    if (!core.organizations.has(id) && !core.people.has(id))
      throw new Error(`Flow owner is not recorded: ${id}`);
  // Its last due date, if still ahead, would pay the new rent early.
  rt.due.get(flow.nextAt)?.delete(input.id);
  let nextAt = makeIsoDate(input.firstAt);
  if (nextAt <= core.date)
    nextAt = makeIsoDate(addDays(makeIsoDate(core.date), 1));
  delete flow.endedAt;
  delete flow.endedReason;
  Object.assign(flow, input, { nextAt, arrearsMinor: 0 });
  const ids = rt.due.get(nextAt) ?? new Set<string>();
  ids.add(input.id);
  rt.due.set(nextAt, ids);
}

/** A counted household's standing flow ends today (a lease ended by removal). */
export function endResidentFlow(
  core: CoreState,
  id: string,
  reason: string,
): boolean {
  const flow = residentsRuntime(core)?.flows.get(id);
  if (!flow || flow.endedAt) return false;
  flow.endedAt = makeIsoDate(core.date);
  flow.endedReason = reason;
  return true;
}
