/** Shared names for adopted tax terms. These are field identities, not tax values. */
export const TAX_LAW_TERM_KEYS = {
  rateNumerator: "tax.rate-numerator",
  rateDenominator: "tax.rate-denominator",
  allowanceMinorUnits: "tax.occurrence-allowance",
  effectiveDelayDays: "tax.effective-delay",
  collectionLagDays: "tax.collection-lag",
  seriesKey: "tax.series",
  baseKey: "tax.base",
  exemptBaseKeys: "tax.exempt-bases",
  publicOrganizationId: "tax.recipient-organization",
  governmentKey: "tax.recipient-government",
} as const;

/** Units match the existing typed levy; an annual bracket is not an occurrence allowance. */
export const TAX_NUMERIC_LAW_TERMS = [
  {
    field: "rateNumerator",
    key: TAX_LAW_TERM_KEYS.rateNumerator,
    unit: "count",
  },
  {
    field: "rateDenominator",
    key: TAX_LAW_TERM_KEYS.rateDenominator,
    unit: "count",
  },
  {
    field: "allowanceMinorUnits",
    key: TAX_LAW_TERM_KEYS.allowanceMinorUnits,
    unit: "minor",
  },
  {
    field: "effectiveDelayDays",
    key: TAX_LAW_TERM_KEYS.effectiveDelayDays,
    unit: "days",
  },
  {
    field: "collectionLagDays",
    key: TAX_LAW_TERM_KEYS.collectionLagDays,
    unit: "days",
  },
] as const;

/** Categorical identities require adopted text and actual records, never numeric encodings. */
export const TAX_CATEGORICAL_LAW_TERMS = [
  TAX_LAW_TERM_KEYS.seriesKey,
  TAX_LAW_TERM_KEYS.baseKey,
  TAX_LAW_TERM_KEYS.exemptBaseKeys,
  TAX_LAW_TERM_KEYS.publicOrganizationId,
  TAX_LAW_TERM_KEYS.governmentKey,
] as const;
