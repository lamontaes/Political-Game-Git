/** The literal constants of group-b-store.ts, kept in a file that imports nothing so a file that only needs the name never loads the module (map row 1, the load-order failures). */
export const REACH_B_MODULE_ID = "core2-law-reach-b-v1";

/**
 * The benefits paid from the opening whose amount or income limit is the
 * law's own value: each is a program of its own that the treasury's monthly
 * close runs (group-b.ts), as the law reach host opens them (host.ts).
 */
export const STANDING_BENEFIT_PROGRAMS: readonly string[] = [
  "child-care-income-limit",
  "ssi-federal-benefit-rate",
  "energy-assistance-income-limit",
];

/** The federal budget line veterans' benefits are paid from, and its law-reach key. */
export const VETERANS_LINE = "veterans";
export const VETERANS_KEY = `budget-line:${VETERANS_LINE}`;

/** The reach's `taken` records of each household's month of veterans' benefits and of welfare assistance. */
export const VETERANS_INCOME_ROW = `veterans|${VETERANS_KEY}`;
export const ASSISTANCE_INCOME_ROW = "assist|budget-line:welfareAndMedicaid";
