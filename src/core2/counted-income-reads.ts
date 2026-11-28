/**
 * The counted households' income reads: the fifth of the income distribution a
 * household's income falls in, and the wage index since the opening, cached
 * once a day. They import only the counted parameter table and the tax index,
 * both outside every ring; counted-income-fifth.ts re-exports each one.
 */
import COUNTED_ROWS from "./data/counted/parameters.json" with { type: "json" };
import { sinceOpeningIndex } from "./tax-index";
import type { CoreAPI } from "./types";

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;

const CENTS_PER_DOLLAR = 100;

const FIFTH_LIMITS = [1, 2, 3, 4].map(
  (i) =>
    COUNTED[`countedIncomeFifthLimit${i}Dollars`]!.value * CENTS_PER_DOLLAR,
);

/**
 * The national household-income fifth a yearly income (in minor units) falls
 * in, 0 to 4. The limits are written in the source year's dollars; `wageIndex`
 * is how far this world's own average pay has moved since it opened
 * (`sinceOpeningIndex`, read once per pass), 1 on day one.
 * stopgapId: SG-WORLD-tax-index-january
 */
export function incomeBandOf(
  incomeMinorYear: number,
  wageIndex: number,
): number {
  let band = 0;
  FIFTH_LIMITS.forEach((limit, at) => {
    if (incomeMinorYear > limit * wageIndex) band = at + 1;
  });
  return band;
}

/** This world's average pay since it opened, read once a day for every reader of the fifths. */
const wageIndexReads = new WeakMap<object, { date: string; index: number }>();

export function wageIndexToday(api: CoreAPI): number {
  const core = api.state;
  let read = wageIndexReads.get(core);
  if (!read || read.date !== core.date)
    wageIndexReads.set(
      core,
      (read = { date: core.date, index: sinceOpeningIndex(api, "wages") }),
    );
  return read.index;
}

/** The national fifth a yearly income falls in today, in this world's own dollars: the one rule every engine reads. */
export function incomeBandOn(api: CoreAPI, incomeMinorYear: number): number {
  return incomeBandOf(incomeMinorYear, wageIndexToday(api));
}
