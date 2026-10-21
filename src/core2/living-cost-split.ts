/**
 * Part of what a household pays for living is a public charge: a sewer and
 * trash bill, a park or hospital fee, tuition at a public school. The
 * residents engine pays a household's living cost on the 1st; the budgets
 * module says which governments a part of it goes to instead of the outside
 * account, and hears what was paid. The residents engine knows nothing of
 * budgets, so the two meet here.
 */
import type { CoreState } from "./types";

export interface LivingCostShare {
  /** The government's organization. */
  readonly organizationId: string;
  /** The part of a household's living cost that government's charges are. */
  readonly share: number;
}

export interface LivingCostSplit {
  shares(placeId: string): readonly LivingCostShare[];
  paid(placeId: string, organizationId: string, minor: number): void;
}

const splits = new WeakMap<object, LivingCostSplit>();

export function setLivingCostSplit(
  core: CoreState,
  split: LivingCostSplit,
): void {
  splits.set(core, split);
}

export function livingCostSplit(core: CoreState): LivingCostSplit | undefined {
  return splits.get(core);
}

/**
 * What a payment of `total` splits into: each government's whole-minor part
 * (never more than the total between them), the rest left to the usual payee.
 */
export function livingCostParts(
  core: CoreState,
  placeId: string,
  total: number,
): { organizationId: string; minor: number }[] {
  const split = splits.get(core);
  if (!split || total <= 0) return [];
  const shares = split.shares(placeId);
  const whole = shares.reduce((n, row) => n + row.share, 0);
  const scale = whole > 1 ? 1 / whole : 1;
  const out: { organizationId: string; minor: number }[] = [];
  let left = total;
  for (const row of shares) {
    const minor = Math.min(left, Math.floor(total * row.share * scale));
    if (minor <= 0) continue;
    left -= minor;
    out.push({ organizationId: row.organizationId, minor });
    split.paid(placeId, row.organizationId, minor);
  }
  return out;
}
