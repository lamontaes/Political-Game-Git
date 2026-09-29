/**
 * Births per 1,000 women a year, by the mother's age, and the youngest age at
 * which anybody in the game becomes a parent. Both come from one table, so the
 * chance of a birth and the record of one can never disagree about who may be
 * a parent: the town birth draw (`living-world/town-families.ts`) reads the
 * rates, and the family writer (`people-family.ts`) refuses a parent younger
 * than the table's first age.
 *
 * CALIBRATION, approved by Claude CTO on 9/28/2026: NCHS "Births: Final Data
 * for 2024" (National Vital Statistics Reports vol. 75 no. 2), as quoted in
 * search excerpts; the report's table itself was not read. The same rates
 * serve every state and territory until state tables are read. The 45-49 rate
 * includes mothers 50 and over. NCHS also publishes a rate for ages 10 to 14;
 * the game does not carry that band, so its youngest parent is 15.
 */
export const BIRTH_RATES_BY_MOTHER_AGE: readonly (readonly [number, number])[] =
  [
    [15, 12.6],
    [20, 55.8],
    [25, 89.5],
    [30, 93.7],
    [35, 54.3],
    [40, 12.7],
    [45, 1.1],
    [50, 0],
  ];

/** The first age the birth table gives a rate above zero. */
export const YOUNGEST_AGE_AT_BIRTH: number = BIRTH_RATES_BY_MOTHER_AGE.find(
  ([, rate]) => rate > 0,
)![0];
