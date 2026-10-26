/**
 * Part of what a household pays for living goes to someone in the town: a
 * public charge (a sewer and trash bill, a park or hospital fee, tuition at a
 * public school), or the subscription to a paper its people read. Part of
 * what a business pays outside the town for its costs is its advertising,
 * some of it in the town's outlets. The residents engine pays these bills;
 * the budgets and press modules say which part of each goes to whom instead
 * of the outside account, and hear what was paid. The residents engine knows
 * nothing of either, so they meet here.
 */
import type { CoreState } from "./types";

export interface LivingCostShare {
  /** Who is paid: a government's organization, an outlet. */
  readonly organizationId: string;
  /** The part of the payment that goes to it. */
  readonly share: number;
}

/**
 * One module's part of payments. `payerId` is the full person or business
 * paying, or the residents account where the counted households pay together.
 */
export interface LivingCostSplit {
  /** `total` is the payment being split. */
  shares(
    placeId: string,
    payerId?: string,
    total?: number,
  ): readonly LivingCostShare[];
  paid(
    placeId: string,
    organizationId: string,
    minor: number,
    payerId?: string,
  ): void;
}

const living = new WeakMap<object, Map<string, LivingCostSplit>>();
const outsideCosts = new WeakMap<object, Map<string, LivingCostSplit>>();

const register = (
  store: WeakMap<object, Map<string, LivingCostSplit>>,
  core: CoreState,
  key: string,
  split: LivingCostSplit,
) => {
  let splits = store.get(core);
  if (!splits) store.set(core, (splits = new Map()));
  splits.set(key, split);
};

/** A module's part of every household's living cost (`key` names the module). */
export function setLivingCostSplit(
  core: CoreState,
  split: LivingCostSplit,
  key = "budgets",
): void {
  register(living, core, key, split);
}

export function livingCostSplit(
  core: CoreState,
  key = "budgets",
): LivingCostSplit | undefined {
  return living.get(core)?.get(key);
}

/** A module's part of what a business pays outside the town for its costs. */
export function setOutsideCostSplit(
  core: CoreState,
  split: LivingCostSplit,
  key: string,
): void {
  register(outsideCosts, core, key, split);
}

/**
 * What a payment of `total` splits into: each payee's whole-minor part (never
 * more than the total between them), the rest left to the usual payee.
 */
function parts(
  splits: Map<string, LivingCostSplit> | undefined,
  placeId: string,
  total: number,
  payerId: string | undefined,
): { organizationId: string; minor: number }[] {
  if (!splits?.size || total <= 0) return [];
  const rows = [...splits.values()].flatMap((split) =>
    split.shares(placeId, payerId, total).map((row) => ({ split, row })),
  );
  const whole = rows.reduce((n, { row }) => n + row.share, 0);
  const scale = whole > 1 ? 1 / whole : 1;
  const out: { organizationId: string; minor: number }[] = [];
  let left = total;
  for (const { split, row } of rows) {
    const minor = Math.min(left, Math.floor(total * row.share * scale));
    if (minor <= 0) continue;
    left -= minor;
    out.push({ organizationId: row.organizationId, minor });
    split.paid(placeId, row.organizationId, minor, payerId);
  }
  return out;
}

/** A living-cost payment's parts. */
export function livingCostParts(
  core: CoreState,
  placeId: string,
  total: number,
  payerId?: string,
): { organizationId: string; minor: number }[] {
  return parts(living.get(core), placeId, total, payerId);
}

/** An outside-cost payment's parts, for the business `payerId`. */
export function outsideCostParts(
  core: CoreState,
  placeId: string,
  total: number,
  payerId: string,
): { organizationId: string; minor: number }[] {
  return parts(outsideCosts.get(core), placeId, total, payerId);
}
