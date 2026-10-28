/**
 * A household's former home: the dwelling row an eviction, a foreclosure or
 * a sale leaves when the household no longer lives there. It keeps what the
 * household's own record last showed (the rent it paid, or the value its home
 * held, or the price it sold for) and how it held the home, so a reader of
 * the row (the home panel, a check of the town's homes) sees a truthful last
 * figure and how the household left. One shape for every way out.
 */
export interface FormerHomeRow {
  readonly id: string;
  readonly householdId: string;
  readonly tenure: "removed" | "sold";
  /** How the household held the home before it left. */
  readonly formerTenure: "own" | "rent";
  readonly kind: string;
  readonly valueMinor?: number;
  readonly rentMinor?: number;
  readonly since: string;
  readonly basis: "eviction" | "foreclosure" | "sale";
}

/** The row a household's way out leaves, from the dwelling row it had. */
export function formerHome(
  previous:
    | {
        readonly tenure?: string;
        readonly kind?: string;
        readonly valueMinor?: number;
        readonly rentMinor?: number;
      }
    | undefined,
  input: {
    readonly householdId: string;
    readonly tenure: FormerHomeRow["tenure"];
    readonly basis: FormerHomeRow["basis"];
    readonly date: string;
    /** The price a sale closed at: the home's latest recorded value. */
    readonly soldForMinor?: number;
  },
): FormerHomeRow {
  // A renter is evicted from a rented home; a home that is foreclosed or
  // sold was owned.
  const formerTenure: FormerHomeRow["formerTenure"] =
    previous?.tenure === "rent" ? "rent" : "own";
  const valueMinor = input.soldForMinor ?? previous?.valueMinor;
  return {
    id: `dwelling:${input.householdId}`,
    householdId: input.householdId,
    tenure: input.tenure,
    formerTenure,
    kind: previous?.kind ?? (formerTenure === "rent" ? "apartment" : "house"),
    ...(formerTenure === "own" && valueMinor !== undefined
      ? { valueMinor }
      : {}),
    ...(formerTenure === "rent" && previous?.rentMinor !== undefined
      ? { rentMinor: previous.rentMinor }
      : {}),
    since: input.date,
    basis: input.basis,
  };
}
