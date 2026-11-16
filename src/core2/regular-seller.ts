/**
 * A buyer's regular seller. A household or a business buys a kind of thing
 * from one seller it goes to, not a slice from every seller in town (owner,
 * Nov 16: a town's stores sized from its people; Oct 29: a year must not slow).
 *
 * How near and how liked each seller is to each buyer is generated with the
 * world, once per pair, from the world's one seeded unit keyed by the buyer's
 * and the seller's ids (who lives near which store is generation of who
 * exists, like where they live). The buyer goes to the seller that stands
 * first for it once each seller's capacity is counted: a seller with twice the
 * capacity stands first for twice the buyers, in expectation. Because each
 * pair's standing is fixed, a closing moves only that seller's buyers, each to
 * its own next seller, and a new store wins exactly the buyers it now stands
 * first for; nobody else changes stores.
 */
import { seededUnit } from "./seeded";

export interface SellerCapacity {
  readonly id: string;
  /** Its capacity: payroll, sales capacity or demand, the same measure for every seller in the list. */
  readonly weight: number;
}

/** The seller the buyer goes to, of `sellers`; null when there is none. */
export function regularSeller(
  seed: string,
  buyerId: string,
  sellers: readonly SellerCapacity[],
): string | null {
  if (!sellers.length) return null;
  let total = 0,
    counted = 0;
  for (const row of sellers)
    if (row.weight > 0) {
      total += row.weight;
      counted++;
    }
  // A seller with no recorded capacity takes the average of those with it.
  const average = counted ? total / counted : 1;
  let best: string | null = null,
    bestStanding = Infinity;
  for (const row of sellers) {
    const weight = row.weight > 0 ? row.weight : average;
    // An exponential standing with rate equal to the capacity: the smallest
    // stands first, and each seller stands first with its capacity's share.
    const standing =
      -Math.log(1 - seededUnit(seed, `regular-seller:${buyerId}:${row.id}`)) /
      weight;
    if (
      standing < bestStanding ||
      (standing === bestStanding && best !== null && row.id < best)
    ) {
      best = row.id;
      bestStanding = standing;
    }
  }
  return best;
}
