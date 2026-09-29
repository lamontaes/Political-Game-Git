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
export const CANNABIS_TAX_PER_RESIDENT = 40.7;

/**
 * Months from a legalization law taking effect to its first store opening:
 * the average of Colorado 13, Washington 19, Michigan 12, Illinois 0, New
 * York 21 and Missouri 2 (Build 22's reading of each state's first sale). A
 * law that ends legal sales closes the stores the day it takes effect.
 */
export const CANNABIS_FIRST_SALE_LAG_MONTHS = 11;

export const CANNABIS_SALES_QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

export const CANNABIS_TAX_BASIS = `Legal adult cannabis sales pay the state $${CANNABIS_TAX_PER_RESIDENT} a resident a year in cannabis excise and sales tax, the 2025 average of the ten states with stores open three years or more (Marijuana Policy Project), from the first store opening ${CANNABIS_FIRST_SALE_LAG_MONTHS} months after the law takes effect; a law ending legal sales ends it the day it takes effect.`;
