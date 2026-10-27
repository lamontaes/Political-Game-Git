/**
 * A town opened at its Census scale has more customers and more workers than
 * the sample it was generated from, so its firms are sized to match: each
 * firm's yearly demand, capacity, payroll and outside costs, the supplier
 * budgets it pays and the cash it keeps against payroll are the sample's
 * times the place's scale, because a town opens at its real Census
 * size. Without it the weighted residents pay the same few firms the same
 * amount, spending beyond their capacity goes outside the town, and the firms
 * pay the weighted workers a wage bill their sales never planned for.
 */
import type { CoreInput } from "./types";

/** The input with every firm of one place sized to the place's scale; the input itself where the scale is one. */
export function scaleFirmsToCensus(
  input: CoreInput,
  placeId: string,
  scale: number,
): CoreInput {
  if (!Number.isFinite(scale) || scale <= 1 || !input.finance) return input;
  const firms = new Set(
    input.organizations
      .filter((row) => row.placeId === placeId)
      .map((row) => row.id),
  );
  const costContracts = new Set<string>();
  const businesses = input.finance.businesses.map((book) => {
    if (!firms.has(book.organizationId)) return book;
    for (const id of book.costContractIds) costContracts.add(id);
    return {
      ...book,
      annualPayrollMinor: Math.round(book.annualPayrollMinor * scale),
      annualDemandMinor: Math.round(book.annualDemandMinor * scale),
      annualOtherCostsMinor: Math.round(book.annualOtherCostsMinor * scale),
      openingTownIncomeMinor: Math.round(book.openingTownIncomeMinor * scale),
      capacityMinor: Math.round(book.capacityMinor * scale),
    };
  });
  return {
    ...input,
    organizations: input.organizations.map((row) =>
      firms.has(row.id) &&
      input.finance!.businesses.some((book) => book.organizationId === row.id)
        ? { ...row, liquidMinor: Math.round(row.liquidMinor * scale) }
        : row,
    ),
    finance: {
      ...input.finance,
      businesses,
      contracts: input.finance.contracts.map((row) =>
        costContracts.has(row.id)
          ? { ...row, amountMinor: Math.round(row.amountMinor * scale) }
          : row,
      ),
    },
  };
}
