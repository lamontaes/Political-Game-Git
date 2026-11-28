/**
 * What buyers outside the town and new entrants do to a place's purchase and
 * outside-sales flows (moved as written out of residents-economy.ts so the
 * engines that read them need not import the residents engine): an entrant
 * wins customers (`shiftPurchaseShare`), outside buyers follow their seller's
 * sector (`scaleOutsideSales`) and divide by who can serve them, and a
 * business's operating limit scales what it sells outside (`limitOutsideSales`).
 * It imports only the flows' leaf and the residents' read door.
 */
import { registerWorldMapPart } from "./snapshot";
import { stopgap } from "./stopgaps";
import { residentsRuntime } from "./residents-reads";
import { type Flow, addResidentFlow } from "./resident-flows";
import type { CoreState } from "./types";

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
/** Outside buyers' flows at the opening's sales, and the latest factor each flow followed, by flow id (see scaleOutsideSales). */
const outsideBases = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-outside-bases", outsideBases);
const outsideFactors = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-outside-factors", outsideFactors);
const flowFactor = (core: CoreState, flowId: string) =>
  outsideFactors.get(core)?.get(flowId) ?? 1;
/** A business's own limit on what it can sell outside (an operating limit under law), by organization. */
const outputLimits = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-output-limits", outputLimits);
const limitOf = (core: CoreState, organizationId: string) =>
  outputLimits.get(core)?.get(organizationId) ?? 1;
/** The share of its kind's outside buyers a seller holds against its rivals' (1 at the opening), by outside-sales flow id. */
const outsideShares = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-outside-shares", outsideShares);
const shareOfFlow = (core: CoreState, flowId: string) =>
  outsideShares.get(core)?.get(flowId) ?? 1;

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
    if (flow.kind === "outside-sales") {
      // Outside buyers move by the opening base: the entrant's part is reserved
      // in it now, and they go on paying this seller until the monthly scaling
      // divides them by who can serve them (the entrant, once it has staff).
      let bases = outsideBases.get(core);
      if (!bases) outsideBases.set(core, (bases = new Map()));
      const base =
        bases.get(flow.id) ??
        flow.amountMinor /
          (flowFactor(core, flow.id) *
            limitOf(core, flow.payeeId) *
            shareOfFlow(core, flow.id));
      bases.set(flow.id, base * (1 - share));
    } else flow.amountMinor -= amount;
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
    // It has nobody working yet, so they pay it nothing until its staff can serve them (the monthly scaling reads its service level).
    const opening = flow.kind === "outside-sales" ? 0 : amount;
    if (flow.kind === "outside-sales") {
      let bases = outsideBases.get(core);
      if (!bases) outsideBases.set(core, (bases = new Map()));
      const factor = flowFactor(core, flow.id);
      bases.set(id, amount / factor);
      let factors = outsideFactors.get(core);
      if (!factors) outsideFactors.set(core, (factors = new Map()));
      factors.set(id, factor);
    }
    addResidentFlow(core, {
      id,
      kind: flow.kind,
      financeKind: flow.financeKind,
      payerId: flow.payerId,
      payeeId: entrantId,
      residentsId: flow.residentsId,
      placeId: flow.placeId,
      amountMinor: opening,
      firstAt: flow.nextAt,
      cadence: flow.cadence,
      salesReceipt: flow.salesReceipt,
      marketAdjusted: flow.marketAdjusted,
      source: flow.source,
    });
  }
  return Math.round(moved);
}

const OUTSIDE_NOTE = "Since the opening its outside buyers follow ";

/** What one seller's outside buyers do this month: its sector's sales against the opening month's, and the records it read. */
export interface OutsideSectorFactor {
  factor: number;
  /** The sector and the records the factor read, by id (the state's row and the nation's), as a source line says it. */
  followed: string;
}

/**
 * Buyers outside the town follow the sales of the seller's own sector: each
 * `outside-sales` flow of the place is its opening amount times its seller's
 * sector's factor this month (the macro module reads it once a month per
 * sector from the country tier and gives it here by seller). Returns the
 * flows changed.
 */
export function scaleOutsideSales(
  core: CoreState,
  placeId: string,
  /** The factor a seller's sector follows this month, by the seller's organization id. */
  factorOf: (sellerId: string) => OutsideSectorFactor | undefined,
  /** A seller's service level now (staff against what its demand needs, 0 to 1), where the jobs engine keeps one. */
  serviceLevel?: (organizationId: string) => number | undefined,
): number {
  const rt = residentsRuntime(core);
  if (!rt) return 0;
  let bases = outsideBases.get(core);
  if (!bases) outsideBases.set(core, (bases = new Map()));
  let factors = outsideFactors.get(core);
  if (!factors) outsideFactors.set(core, (factors = new Map()));
  let shares = outsideShares.get(core);
  if (!shares) outsideShares.set(core, (shares = new Map()));
  let changed = 0;
  // Each seller's outside spending before the division, by its kind.
  const kinds = serviceLevel
    ? new Map<string, { flow: Flow; raw: number; level: number }[]>()
    : undefined;
  for (const flow of rt.flows.values()) {
    if (
      flow.kind !== "outside-sales" ||
      flow.endedAt ||
      flow.placeId !== placeId
    )
      continue;
    const own = factorOf(flow.payeeId);
    if (!own || !(own.factor > 0))
      throw new Error(
        `Outside buyers' flow ${flow.id} has no sector to follow (seller ${flow.payeeId}).`,
      );
    // First seen: its amount is at the factor it last followed.
    if (!bases.has(flow.id))
      bases.set(
        flow.id,
        flow.amountMinor /
          (flowFactor(core, flow.id) *
            limitOf(core, flow.payeeId) *
            shareOfFlow(core, flow.id)),
      );
    factors.set(flow.id, own.factor);
    // The flow's source names the sector's records it follows, so a trace of its payments reads them.
    const note = `${OUTSIDE_NOTE}${own.followed}.`;
    if (!flow.source.estimatedFrom?.endsWith(note)) {
      // One note: a later sector or state replaces the one before, never stacks beside it.
      const was = flow.source.estimatedFrom ?? "";
      const cut = was.indexOf(OUTSIDE_NOTE);
      const kept = (cut < 0 ? was : was.slice(0, cut)).trimEnd();
      flow.source = {
        ...flow.source,
        estimatedFrom: kept ? `${kept} ${note}` : note,
      };
    }
    const raw = bases.get(flow.id)! * own.factor * limitOf(core, flow.payeeId);
    flow.amountMinor = Math.round(raw * shareOfFlow(core, flow.id));
    changed += 1;
    const level = kinds && serviceLevel!(flow.payeeId);
    const book =
      kinds && level !== undefined
        ? core.finance.businesses.get(flow.payeeId)
        : undefined;
    if (kinds && book && level !== undefined && !book.closedAt) {
      const group = kinds.get(book.kindId) ?? [];
      group.push({ flow, raw, level });
      kinds.set(book.kindId, group);
    }
  }
  if (kinds) divideOutsideSales(core, kinds, shares);
  return changed;
}

/**
 * Buyers outside the town divide their spending among the sellers of one kind
 * by how much of it each can serve (SG-CORE-outside-share-service-level): a
 * seller whose staff falls short of what its demand needs serves that share of
 * its customers, and the rest go to its rivals. The kind's total is unchanged,
 * so one seller's loss is its rivals' gain; a lone seller keeps all of it.
 */
function divideOutsideSales(
  core: CoreState,
  kinds: ReadonlyMap<string, { flow: Flow; raw: number; level: number }[]>,
  shares: Map<string, number>,
): void {
  stopgap("SG-CORE-outside-share-service-level", core);
  for (const group of kinds.values()) {
    const total = group.reduce((n, row) => n + row.raw, 0);
    const served = group.reduce((n, row) => n + row.raw * row.level, 0);
    if (group.length < 2 || !(total > 0) || !(served > 0)) {
      for (const row of group) shares.set(row.flow.id, 1);
      continue;
    }
    for (const row of group) {
      const share = row.raw > 0 ? (row.level * total) / served : 1;
      shares.set(row.flow.id, share);
      row.flow.amountMinor = Math.round(row.raw * share);
    }
  }
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
        flow.amountMinor /
          (flowFactor(core, flow.id) * before * shareOfFlow(core, flow.id)),
      );
    flow.amountMinor = Math.round(
      bases.get(flow.id)! *
        flowFactor(core, flow.id) *
        limit *
        shareOfFlow(core, flow.id),
    );
    changed += 1;
  }
  return changed;
}

/**
 * What a business's operating limit costs it in outside sales a year: each
 * outside buyers' flow at the amount it would pay without the limit, less
 * what it pays now.
 */
export function outputLostPerYear(
  core: CoreState,
  organizationId: string,
): number {
  const rt = residentsRuntime(core);
  const limit = limitOf(core, organizationId);
  if (!rt || !(limit > 0) || limit >= 1) return 0;
  let lost = 0;
  for (const flow of rt.flows.values())
    if (
      flow.kind === "outside-sales" &&
      !flow.endedAt &&
      flow.payeeId === organizationId
    )
      lost += perYear(flow, (flow.amountMinor * (1 - limit)) / limit);
  return Math.round(lost);
}
