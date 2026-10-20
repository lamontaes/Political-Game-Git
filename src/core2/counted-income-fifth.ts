import COUNTED_ROWS from "./data/counted/parameters.json" with { type: "json" };

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;
const CENTS_PER_DOLLAR = 100;
const FIFTH_LIMITS = [1, 2, 3, 4].map(
  (i) =>
    COUNTED[`countedIncomeFifthLimit${i}Dollars`]!.value * CENTS_PER_DOLLAR,
);

/** The national household-income fifth a yearly income (in minor units) falls in, 0 to 4. */
export function incomeBandOf(incomeMinorYear: number): number {
  let band = 0;
  FIFTH_LIMITS.forEach((limit, at) => {
    if (incomeMinorYear > limit) band = at + 1;
  });
  return band;
}
