import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";

/**
 * What legal adult cannabis sales pay a state in taxes, per resident a year.
 *
 * The plain average of the ten states whose adult-use stores had been open
 * at least three full years by 2025, each state's 2025 cannabis excise and
 * state sales tax on cannabis over its population (Marijuana Policy Project,
 * "Cannabis Tax Revenue in States that Regulate Cannabis for Adult Use",
 * read September 29, 2026): Colorado $36.8, Washington $62.0, Oregon $34.2,
 * Nevada $49.3, California $26.7, Massachusetts $40.9, Michigan $50.2,
 * Illinois $43.5, Maine $31.0 and Arizona $32.5. Medical cannabis, license
 * fees and local cannabis taxes are left out, as the source leaves them out.
 */
/** Reference sample mean, not the applied amount. */
export const CANNABIS_TAX_PER_RESIDENT = 40.7;
/** Observed mature-market spread, not a confidence interval. */
export const CANNABIS_TAX_PER_RESIDENT_RANGE = [26.7, 62] as const;

/**
 * A stable world/state fiscal parameter, not a sampled actor outcome.
 * Recomputing the same keyed draw preserves it across months and save/reopen.
 * Older partial saves lacking a seed retain their world ID as the stable key.
 * The triangular shape is an authored spread choice; the source supplies bounds.
 */
export function cannabisTaxPerResident(
  world: Pick<World, "seed" | "id">,
  jurisdictionId: EntityId,
): number {
  const rng = new SeededRng(world.seed || world.id).fork(
    `cannabis-sales:annual-state-tax-per-resident:${jurisdictionId}`,
  );
  const middleLikely = (rng.next() + rng.next()) / 2;
  const [low, high] = CANNABIS_TAX_PER_RESIDENT_RANGE;
  return low + (high - low) * middleLikely;
}

/**
 * Months from a legalization law taking effect to its first store opening:
 * the average of Colorado 13, Washington 19, Michigan 12, Illinois 0, New
 * York 21 and Missouri 2 (Build 22's reading of each state's first sale). A
 * law that ends legal sales closes the stores the day it takes effect.
 */
export const CANNABIS_FIRST_SALE_LAG_MONTHS = 11;

export const CANNABIS_SALES_QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

export const CANNABIS_TAX_BASIS = `Legal adult cannabis sales pay the state a stable world/state amount inside $${CANNABIS_TAX_PER_RESIDENT_RANGE[0]}–$${CANNABIS_TAX_PER_RESIDENT_RANGE[1]} a resident a year in cannabis excise and sales tax, the observed 2025 spread of the ten states with stores open three years or more (Marijuana Policy Project), with the middle likelier than the ends (authored distribution, not an empirical confidence interval), from the first store opening ${CANNABIS_FIRST_SALE_LAG_MONTHS} months after the law takes effect; a law ending legal sales ends it the day it takes effect.`;
