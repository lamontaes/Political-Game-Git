/**
 * The economy engines acting on the wider population (shared seams on the
 * residents engine, for OPUS-CORE review). A counted worker's job can end or
 * begin through their employer's wage flow, and an engine can add a standing
 * flow (rent, a loan payment, spending that leaves town) at runtime.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import { residentsRuntime } from "./modules/residents";
import type { ResidentFlowInput } from "./residents";
import type { CoreState, JobInput } from "./types";
import { registerWorldMapPart } from "./snapshot";

type Runtime = NonNullable<ReturnType<typeof residentsRuntime>>;
type Flow = Runtime["flows"] extends Map<string, infer F> ? F : never;

function recompute(flow: Flow): void {
  let total = 0;
  for (const value of Object.values(flow.perDayMinorByJob ?? {}))
    total += value;
  flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
}

/** A counted worker's job ends today: their employer's wage flow drops exactly their pay. */
export function endCountedJob(
  core: CoreState,
  jobId: string,
): JobInput | undefined {
  const rt = residentsRuntime(core);
  const job = rt?.jobs.get(jobId),
    flow = rt?.wageFlowByJob.get(jobId);
  if (!rt || !job || !flow || flow.endedAt) return undefined;
  const perDay = { ...(flow.perDayMinorByJob ?? {}) };
  delete perDay[jobId];
  flow.perDayMinorByJob = perDay;
  flow.jobIds = (flow.jobIds ?? []).filter((id) => id !== jobId);
  recompute(flow);
  rt.wageFlowByJob.delete(jobId);
  const ended = { ...job, endsAt: makeIsoDate(core.date) };
  rt.jobs.set(jobId, ended);
  return ended;
}

/**
 * A counted person is hired: the employer's wage flow grows by their pay.
 * An employer with no counted workers yet (a new business) gets a wage flow
 * on the cadence of `templateJobId`'s; false when there is neither.
 */
export function addCountedJob(
  core: CoreState,
  job: JobInput,
  templateJobId?: string,
): boolean {
  const rt = residentsRuntime(core);
  if (!rt || (rt.jobs.has(job.id) && rt.jobs.get(job.id)!.endsAt === undefined))
    return false;
  const find = () =>
    [...rt.flows.values()].find(
      (row) =>
        row.kind === "wages" &&
        !row.endedAt &&
        row.organizationId === job.organizationId,
    );
  let flow = find();
  // The template's own wage flow, else any live wage flow in the place (its payday cadence is all that's copied).
  const placeId0 = core.organizations.get(job.organizationId)?.placeId;
  const live = (row: Flow | undefined) =>
    row && row.kind === "wages" && !row.endedAt ? row : undefined;
  const template =
    (templateJobId ? live(rt.wageFlowByJob.get(templateJobId)) : undefined) ??
    (flow
      ? undefined
      : [...rt.flows.values()].find(
          (row) => live(row) && row.placeId === placeId0,
        ));
  if (!flow && template && !template.endedAt) {
    const placeId = core.organizations.get(job.organizationId)?.placeId;
    const account =
      rt.input.accounts.find((row) => row.placeId === placeId)?.accountId ??
      template.payeeId;
    addResidentFlow(core, {
      id: `residents:wages:${job.organizationId}:${core.date}`,
      kind: "wages",
      financeKind: template.financeKind,
      payerId: job.organizationId,
      payeeId: account,
      residentsId: account,
      placeId: placeId ?? template.placeId,
      amountMinor: 0,
      firstAt: template.nextAt,
      cadence: template.cadence,
      salesReceipt: false,
      marketAdjusted: false,
      organizationId: job.organizationId,
      jobIds: [],
      perDayMinorByJob: {},
      ...(template.periodFactor !== undefined
        ? { periodFactor: template.periodFactor }
        : {}),
      source: job.source,
    });
    flow = find();
  }
  if (!flow) return false;
  flow.perDayMinorByJob = {
    ...(flow.perDayMinorByJob ?? {}),
    [job.id]: job.wageDailyMinor,
  };
  flow.jobIds = [...(flow.jobIds ?? []), job.id];
  recompute(flow);
  rt.jobs.set(job.id, job);
  rt.wageFlowByJob.set(job.id, flow);
  const index = jobIndexes.get(core);
  if (index?.date === core.date) {
    const set = index.byOrg.get(job.organizationId) ?? new Set<string>();
    set.add(job.id);
    index.byOrg.set(job.organizationId, set);
  }
  return true;
}

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

/** The counted workers of an employer, by job, from its live wage flows. */
export function countedJobsOf(
  core: CoreState,
  organizationId: string,
): JobInput[] {
  const rt = residentsRuntime(core);
  if (!rt) return [];
  const out: JobInput[] = [];
  for (const jobId of jobIndex(core).get(organizationId) ?? []) {
    const flow = rt.wageFlowByJob.get(jobId),
      job = rt.jobs.get(jobId);
    // The index can run ahead of fill-in and endings within a day: check each job is still counted and open.
    if (
      flow &&
      !flow.endedAt &&
      flow.organizationId === organizationId &&
      job &&
      job.endsAt === undefined
    )
      out.push(job);
  }
  return out;
}

/**
 * How many real jobs an employer's counted workers stand for: each counted
 * job is worth the weight of its worker's household (one unless the opening
 * gave households a weight). Readers that count heads read this; readers that
 * pick one worker keep the record from `countedJobsOf`.
 */
export function countedHeadcountOf(
  core: CoreState,
  organizationId: string,
): number {
  const store = residentsRuntime(core)?.store;
  if (!store) return 0;
  let heads = 0;
  for (const job of countedJobsOf(core, organizationId)) {
    const m = store.countedMember(job.personId);
    const home =
      m === undefined ? undefined : store.households[store.household[m]!];
    heads += home ? store.weightOf(home) : 1;
  }
  return heads;
}

/** Counted jobs by employer, rebuilt once a day and kept current by this file's hires. */
const jobIndexes = new WeakMap<
  CoreState,
  { date: string; byOrg: Map<string, Set<string>> }
>();
function jobIndex(core: CoreState): Map<string, Set<string>> {
  const cached = jobIndexes.get(core);
  if (cached && cached.date === core.date) return cached.byOrg;
  const byOrg = new Map<string, Set<string>>();
  for (const [jobId, flow] of residentsRuntime(core)?.wageFlowByJob ?? []) {
    if (!flow.organizationId) continue;
    const set = byOrg.get(flow.organizationId) ?? new Set<string>();
    set.add(jobId);
    byOrg.set(flow.organizationId, set);
  }
  jobIndexes.set(core, { date: core.date, byOrg });
  return byOrg;
}

const CUSTOMER_KINDS = new Set(["purchase", "outside-sales"]);
const DAYS_PER_YEAR = 365,
  MONTHS_PER_YEAR = 12;

/** A flow's payments a year at its cadence. */
function perYear(flow: Flow, amount: number): number {
  return flow.cadence.kind === "days"
    ? (amount * DAYS_PER_YEAR) / flow.cadence.every
    : (amount * MONTHS_PER_YEAR) / flow.cadence.every;
}

/** What `shiftPurchaseShare` would move a year, without moving it. */
export function purchaseShareOf(
  core: CoreState,
  incumbentIds: ReadonlySet<string>,
  share: number,
): number {
  const rt = residentsRuntime(core);
  if (!rt || !(share > 0) || share >= 1) return 0;
  let total = 0;
  for (const flow of rt.flows.values())
    if (
      CUSTOMER_KINDS.has(flow.kind) &&
      !flow.endedAt &&
      incumbentIds.has(flow.payeeId)
    )
      total += perYear(flow, Math.floor(flow.amountMinor * share));
  return Math.round(total);
}

/**
 * A new business wins customers: each household purchase flow and each
 * outside buyers' flow paying an incumbent of its kind gives up `share` of
 * its amount to an equal new flow paying the entrant. Money the buyers spend
 * is unchanged. Returns the entrant's customers' spending a year.
 */
/** Outside buyers' flows at the opening's prices and demand, and each place's latest factor (see scaleOutsideSales). */
const outsideBases = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-outside-bases", outsideBases);
const outsideFactors = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-outside-factors", outsideFactors);
/** A business's own limit on what it can sell outside (an operating limit under law), by organization. */
const outputLimits = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-output-limits", outputLimits);
const limitOf = (core: CoreState, organizationId: string) =>
  outputLimits.get(core)?.get(organizationId) ?? 1;

export function shiftPurchaseShare(
  core: CoreState,
  incumbentIds: ReadonlySet<string>,
  entrantId: string,
  share: number,
  /** Only flows that pass (the core's `enterMarket` splits counted households' purchases). */
  include: (flow: Flow) => boolean = () => true,
): number {
  const rt = residentsRuntime(core);
  if (!rt || !(share > 0) || share >= 1) return 0;
  // One entrant flow per payer and kind of spending, however many incumbents it is taken from.
  const groups = new Map<string, { flow: Flow; amount: number }>();
  let moved = 0;
  for (const flow of [...rt.flows.values()]) {
    if (
      !CUSTOMER_KINDS.has(flow.kind) ||
      !include(flow) ||
      flow.endedAt ||
      !incumbentIds.has(flow.payeeId)
    )
      continue;
    const amount = Math.floor(flow.amountMinor * share);
    if (amount <= 0) continue;
    flow.amountMinor -= amount;
    // An outside buyers' flow keeps its opening base in step, so next month's scaling doesn't give the share back.
    const bases = outsideBases.get(core);
    if (flow.kind === "outside-sales" && bases?.has(flow.id))
      bases.set(flow.id, bases.get(flow.id)! * (1 - share));
    // Households' own parts (fill-in takes them back) shrink in proportion.
    if (flow.amountByContract)
      flow.amountByContract = Object.fromEntries(
        Object.entries(flow.amountByContract).map(([id, value]) => [
          id,
          Math.floor(value * (1 - share)),
        ]),
      );
    const key = [
      flow.payerId,
      flow.kind,
      flow.financeKind,
      flow.residentsId,
      flow.placeId,
      JSON.stringify(flow.cadence),
      flow.salesReceipt,
      flow.marketAdjusted,
    ].join("|");
    const group = groups.get(key);
    if (group) {
      group.amount += amount;
      if (flow.nextAt < group.flow.nextAt) group.flow = flow;
    } else groups.set(key, { flow, amount });
    moved += perYear(flow, amount);
  }
  let n = 0;
  for (const { flow, amount } of groups.values()) {
    const id = `entrant:${entrantId}:${n++}`;
    // The entrant's outside buyers start at today's factor: their base is today's amount at opening terms.
    if (flow.kind === "outside-sales") {
      let bases = outsideBases.get(core);
      if (!bases) outsideBases.set(core, (bases = new Map()));
      bases.set(
        id,
        amount / (outsideFactors.get(core)?.get(flow.placeId) ?? 1),
      );
    }
    addResidentFlow(core, {
      id,
      kind: flow.kind,
      financeKind: flow.financeKind,
      payerId: flow.payerId,
      payeeId: entrantId,
      residentsId: flow.residentsId,
      placeId: flow.placeId,
      amountMinor: amount,
      firstAt: flow.nextAt,
      cadence: flow.cadence,
      salesReceipt: flow.salesReceipt,
      marketAdjusted: flow.marketAdjusted,
      source: flow.source,
    });
  }
  return Math.round(moved);
}

/**
 * Buyers outside the town follow the nation and region: each place's
 * `outside-sales` flow is its opening amount times `factor` (prices times
 * real demand against the opening month). Returns the flows changed.
 */
export function scaleOutsideSales(
  core: CoreState,
  placeId: string,
  factor: number,
): number {
  const rt = residentsRuntime(core);
  if (!rt || !(factor > 0)) return 0;
  let bases = outsideBases.get(core);
  if (!bases) outsideBases.set(core, (bases = new Map()));
  let factors = outsideFactors.get(core);
  if (!factors) outsideFactors.set(core, (factors = new Map()));
  const before = factors.get(placeId) ?? 1;
  factors.set(placeId, factor);
  let changed = 0;
  for (const flow of rt.flows.values()) {
    if (
      flow.kind !== "outside-sales" ||
      flow.endedAt ||
      flow.placeId !== placeId
    )
      continue;
    // First seen: its amount is at the last month's factor.
    if (!bases.has(flow.id))
      bases.set(
        flow.id,
        flow.amountMinor / (before * limitOf(core, flow.payeeId)),
      );
    flow.amountMinor = Math.round(
      bases.get(flow.id)! * factor * limitOf(core, flow.payeeId),
    );
    changed += 1;
  }
  return changed;
}

/**
 * A business sells outside the town at `limit` of what it could (1 is no
 * limit): its outside buyers' flows are rescaled now and at every month's
 * scaling. Returns the flows changed.
 */
export function limitOutsideSales(
  core: CoreState,
  organizationId: string,
  limit: number,
): number {
  const rt = residentsRuntime(core);
  if (!rt || !(limit > 0)) return 0;
  let limits = outputLimits.get(core);
  if (!limits) outputLimits.set(core, (limits = new Map()));
  const before = limitOf(core, organizationId);
  limits.set(organizationId, limit);
  let bases = outsideBases.get(core);
  if (!bases) outsideBases.set(core, (bases = new Map()));
  const placeFactor = (placeId: string) =>
    outsideFactors.get(core)?.get(placeId) ?? 1;
  let changed = 0;
  for (const flow of rt.flows.values()) {
    if (
      flow.kind !== "outside-sales" ||
      flow.endedAt ||
      flow.payeeId !== organizationId
    )
      continue;
    if (!bases.has(flow.id))
      bases.set(
        flow.id,
        flow.amountMinor / (placeFactor(flow.placeId) * before),
      );
    flow.amountMinor = Math.round(
      bases.get(flow.id)! * placeFactor(flow.placeId) * limit,
    );
    changed += 1;
  }
  return changed;
}

/**
 * New hourly pay for many counted workers at once: each employer's wage flow
 * is recomputed once, not once per worker (the core's `rerateCountedJob`
 * scans every flow per call). Returns the jobs changed.
 */
export function rerateCountedJobs(
  core: CoreState,
  hourlyByJob: ReadonlyMap<string, number>,
): number {
  const rt = residentsRuntime(core);
  if (!rt) return 0;
  const touched = new Set<Flow>();
  let changed = 0;
  for (const [jobId, hourlyMinor] of hourlyByJob) {
    const job = rt.jobs.get(jobId),
      flow = rt.wageFlowByJob.get(jobId);
    if (!job || !flow || flow.endedAt || !job.hourlyMinor) continue;
    const perDay = flow.perDayMinorByJob?.[jobId];
    if (perDay === undefined) continue;
    const ratio = hourlyMinor / job.hourlyMinor;
    if (!touched.has(flow)) {
      flow.perDayMinorByJob = { ...flow.perDayMinorByJob };
      touched.add(flow);
    }
    (flow.perDayMinorByJob as Record<string, number>)[jobId] = perDay * ratio;
    rt.jobs.set(jobId, {
      ...job,
      hourlyMinor,
      wageDailyMinor: Math.round(job.wageDailyMinor * ratio),
    });
    changed += 1;
  }
  for (const flow of touched) recompute(flow);
  return changed;
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
  const parts = { ...flow.amountByContract };
  delete parts[part];
  flow.amountByContract = parts;
  flow.amountMinor = Math.max(0, flow.amountMinor - amount);
  return true;
}

/**
 * A counted worker retires: their place's retirees' income (Social Security
 * and pensions, paid from outside the town) gains them, at the average the
 * place's opening retirees draw. One flow per place carries every retiree
 * added during play, a part each.
 */
export function addCountedRetiree(
  core: CoreState,
  placeId: string,
  personId: string,
): number {
  const rt = residentsRuntime(core);
  if (!rt) return 0;
  const opening = [...rt.flows.values()].filter(
    (flow) =>
      flow.kind === "retirement" &&
      !flow.endedAt &&
      flow.placeId === placeId &&
      !flow.id.startsWith(RETIREES_ADDED),
  );
  const parts = opening.reduce(
    (n, flow) => n + Object.keys(flow.amountByContract ?? {}).length,
    0,
  );
  const template = opening[0];
  if (!template || !parts) return 0;
  const monthly = Math.round(
    opening.reduce((n, flow) => n + flow.amountMinor, 0) / parts,
  );
  const id = `${RETIREES_ADDED}${placeId}`;
  const flow = rt.flows.get(id);
  const key = `retiree:${personId}`;
  if (flow) {
    if (flow.amountByContract?.[key] !== undefined) return 0;
    flow.amountByContract = {
      ...(flow.amountByContract ?? {}),
      [key]: monthly,
    };
    flow.amountMinor += monthly;
  } else
    addResidentFlow(core, {
      id,
      kind: "retirement",
      financeKind: template.financeKind,
      payerId: template.payerId,
      payeeId: template.payeeId,
      residentsId: template.residentsId,
      placeId,
      amountMinor: monthly,
      firstAt: template.nextAt,
      cadence: template.cadence,
      salesReceipt: false,
      marketAdjusted: false,
      amountByContract: { [key]: monthly },
      source: template.source,
    });
  return monthly;
}
const RETIREES_ADDED = "residents:retirement:added:";

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
