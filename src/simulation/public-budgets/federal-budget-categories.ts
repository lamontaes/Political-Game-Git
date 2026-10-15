/** Canonical existing federal receipt/outlay order, shared without treasury import cycles. */
export const FEDERAL_RECEIPTS = [
  "individualIncomeTax",
  "payrollTaxes",
  "corporateIncomeTax",
  "customsDuties",
  "exciseTaxes",
  "estateAndGiftTaxes",
  "miscellaneousReceipts",
] as const;
export type FederalReceipt = (typeof FEDERAL_RECEIPTS)[number];

export const FEDERAL_OUTLAYS = [
  "socialSecurity",
  "medicare",
  /** Medicaid and other health programs. */
  "health",
  "incomeSecurity",
  "nationalDefense",
  "veterans",
  "netInterest",
  /** Foreign aid and the State Department. */
  "internationalAffairs",
  /** Farm programs. */
  "agriculture",
  /** Includes FEMA disaster relief. */
  "communityAndRegionalDevelopment",
  "transportation",
  "education",
  "otherPrograms",
] as const;
export type FederalOutlay = (typeof FEDERAL_OUTLAYS)[number];
