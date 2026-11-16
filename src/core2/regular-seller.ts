/**
 * A buyer's regular seller, at the opening and for a price law's sale. A
 * household or a business buys a kind of thing from one seller it goes to,
 * not a slice from every seller in town: the buyers of a place are dealt to
 * its sellers so each seller's share of the purchases follows its capacity.
 * Each buyer goes to the seller furthest below its share, then by id. Nothing
 * is drawn, and a town with more sellers holds no more contracts (owner,
 * Nov 16: a town's stores sized from its people; Oct 29: a year must not
 * slow).
 */
export class RegularSellers {
  private readonly dealt = new Map<string, Map<string, number>>();

  /**
   * The seller a buyer of `amount` in market `market` (a place and a kind of
   * purchase) goes to, of `sellers` with their capacities. Records the
   * purchase against it.
   */
  pick(
    market: string,
    sellers: readonly { readonly id: string; readonly weight: number }[],
    amount: number,
  ): string | null {
    if (!sellers.length) return null;
    const dealt = this.dealt.get(market) ?? new Map<string, number>();
    this.dealt.set(market, dealt);
    const positive = sellers.filter((row) => row.weight > 0);
    // A seller with no recorded capacity takes the average of those with it.
    const average = positive.length
      ? positive.reduce((sum, row) => sum + row.weight, 0) / positive.length
      : 1;
    const weightOf = (row: { readonly weight: number }) =>
      row.weight > 0 ? row.weight : average;
    const total = sellers.reduce((sum, row) => sum + weightOf(row), 0);
    let dealtTotal = 0;
    for (const value of dealt.values()) dealtTotal += value;
    let best: { readonly id: string; readonly weight: number } | null = null;
    let bestBelow = -Infinity;
    for (const row of sellers) {
      const below =
        (weightOf(row) / total) * (dealtTotal + amount) -
        (dealt.get(row.id) ?? 0);
      if (
        below > bestBelow ||
        (below === bestBelow && best !== null && row.id < best.id)
      ) {
        best = row;
        bestBelow = below;
      }
    }
    dealt.set(best!.id, (dealt.get(best!.id) ?? 0) + amount);
    return best!.id;
  }
}
