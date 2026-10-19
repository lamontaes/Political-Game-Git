/**
 * Apportioning the House by the method of equal proportions (2 U.S.C. 2a):
 * every state gets one seat, and each of the remaining seats goes to the state
 * with the highest priority value, population over the square root of
 * n(n-1) for the seat n it would take. The game's own census counts (the next
 * step of gov-redistricting-census-count) feed it.
 */

export interface StateCount {
  /** State key; any stable string. */
  readonly state: string;
  readonly population: number;
}

/**
 * Seats by state. Priority values are compared by cross-multiplying the
 * squares (p1² · n2(n2-1) against p2² · n1(n1-1)) in BigInt, so a tie falls
 * to the state key, never to rounding.
 */
export function apportionHouse(
  counts: readonly StateCount[],
  houseSize: number,
): Map<string, number> {
  if (!Number.isInteger(houseSize) || houseSize < counts.length)
    throw new Error("The House needs at least one seat for each state.");
  const seats = new Map(counts.map((row) => [row.state, 1]));
  const people = new Map(
    counts.map((row) => [row.state, BigInt(Math.round(row.population))]),
  );
  // Priority of the next seat n for a state: P / sqrt(n(n-1)); compare squares.
  const beats = (a: string, b: string) => {
    const na = BigInt(seats.get(a)! + 1),
      nb = BigInt(seats.get(b)! + 1);
    const left = people.get(a)! ** 2n * nb * (nb - 1n),
      right = people.get(b)! ** 2n * na * (na - 1n);
    return left !== right ? left > right : a.localeCompare(b) < 0;
  };
  for (let given = counts.length; given < houseSize; given += 1) {
    let top = counts[0]!.state;
    for (const row of counts) if (beats(row.state, top)) top = row.state;
    seats.set(top, seats.get(top)! + 1);
  }
  return seats;
}
