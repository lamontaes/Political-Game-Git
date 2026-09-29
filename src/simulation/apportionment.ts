import census2020 from "../../data/research/apportionment/apportionment-2020.json" with { type: "json" };

/**
 * House apportionment by the method of equal proportions, the rule 2 U.S.C.
 * §§ 2a and 2b set for every census since 1940. Each state first gets the one
 * seat the Constitution guarantees (Art. I, § 2). Every further seat goes, one
 * at a time, to the state with the highest priority value, its population
 * divided by the geometric mean of its current and next seat count:
 * P / sqrt(n(n + 1)). Nothing is drawn: the same populations always give the
 * same seats.
 */

export const APPORTIONMENT_METHOD_VERSION = "equal-proportions-v1" as const;

/** 2 U.S.C. § 2a: the House has 435 seats until Congress changes the law. */
export const HOUSE_SIZE = 435;

export interface ApportionmentInput {
  readonly state: string;
  readonly apportionmentPopulation: number;
}

/**
 * True when state a's claim on its next seat beats state b's. Compared in
 * exact integers: Pa² · nb(nb + 1) against Pb² · na(na + 1). An exact tie,
 * which no census has produced, goes to the state key that sorts first.
 */
function outranks(
  a: { state: string; population: bigint; seats: bigint },
  b: { state: string; population: bigint; seats: bigint },
): boolean {
  const left = a.population * a.population * b.seats * (b.seats + 1n);
  const right = b.population * b.population * a.seats * (a.seats + 1n);
  if (left !== right) return left > right;
  return a.state.localeCompare(b.state) < 0;
}

export function apportionHouse(
  states: readonly ApportionmentInput[],
  houseSize: number = HOUSE_SIZE,
): Readonly<Record<string, number>> {
  if (!Number.isSafeInteger(houseSize) || houseSize < states.length) {
    throw new Error(
      `A House of ${houseSize} seats cannot give each of ${states.length} states its one seat.`,
    );
  }
  const seen = new Set<string>();
  const claims = states.map((entry) => {
    if (seen.has(entry.state)) {
      throw new Error(`State ${entry.state} is listed twice.`);
    }
    seen.add(entry.state);
    if (
      !Number.isSafeInteger(entry.apportionmentPopulation) ||
      entry.apportionmentPopulation < 1
    ) {
      throw new Error(
        `State ${entry.state} has no usable apportionment population.`,
      );
    }
    return {
      state: entry.state,
      population: BigInt(entry.apportionmentPopulation),
      seats: 1n,
    };
  });
  for (let seat = claims.length; seat < houseSize; seat += 1) {
    let best = claims[0]!;
    for (const claim of claims) {
      if (outranks(claim, best)) best = claim;
    }
    best.seats += 1n;
  }
  return Object.freeze(
    Object.fromEntries(
      claims
        .map((claim) => [claim.state, Number(claim.seats)] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/**
 * Electors per state: its House seats plus its two senators (Art. II, § 1).
 * The District of Columbia gets as many as the least populous state, which is
 * three (Twenty-third Amendment).
 */
export function electoralVotesFromSeats(
  seats: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const states = Object.entries(seats);
  const fewest = Math.min(...states.map(([, count]) => count + 2));
  return Object.freeze(
    Object.fromEntries(
      [
        ...states.map(([state, count]) => [state, count + 2] as const),
        ["DC", fewest] as const,
      ].sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/** The Census Bureau's 2020 apportionment counts and the seats they gave. */
export const CENSUS_2020_APPORTIONMENT: readonly (ApportionmentInput & {
  readonly representatives: number;
})[] = census2020.states;
