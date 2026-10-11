// STOPGAP RULES3-GOV-082: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/office-salary.ts :: annualPay.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 139: inForce.annualDollars * 100 */
export function annualPayRule1(facts: {
  readonly inForceAnnualDollars: number;
}) {
  return facts.inForceAnnualDollars * 100;
}

/** Legacy line 146: !inForce */
export function annualPayRule2(facts: { readonly inForce: unknown }) {
  return !facts.inForce;
}

/** Legacy line 148: role?.occupationClassification ?? null */
export function annualPayRule3(facts: {
  readonly roleOccupationClassification: string | null | undefined;
}) {
  return facts.roleOccupationClassification! ?? null;
}

/** Legacy line 150: role?.locationJurisdictionId ?? null */
export function annualPayRule4(facts: {
  readonly roleLocationJurisdictionId: string | null | undefined;
}) {
  return facts.roleLocationJurisdictionId! ?? null;
}

/** Legacy line 151: role ? weeklyHoursOf(role) : 0 */
export function annualPayRule5(facts: {
  readonly role: unknown;
  readonly weeklyHoursOfRole: number;
}) {
  return facts.role ? facts.weeklyHoursOfRole : 0;
}

/** Legacy line 156: !role?.locationJurisdictionId */
export function annualPayRule6(facts: {
  readonly roleLocationJurisdictionId: string | null | undefined;
}) {
  return !facts.roleLocationJurisdictionId!;
}

/** Legacy line 157: Math.max(0, daysBetween(work.startedAt, onDate) / 365.25) */
export function annualPayRule7(facts: {
  readonly daysBetweenWorkStartedAtOnDate: number;
}) {
  return Math.max(0, facts.daysBetweenWorkStartedAtOnDate / 365.25);
}

/** Legacy line 167: !rate || hours <= 0 */
export function annualPayRule8(facts: {
  readonly rate: unknown;
  readonly hours: number;
}) {
  return !facts.rate || facts.hours <= 0;
}

/** Legacy line 169: Math.round(rate.hourlyMinor * hours * 52) */
export function annualPayRule9(facts: {
  readonly rateHourlyMinor: number;
  readonly hours: number;
}) {
  return Math.round(facts.rateHourlyMinor * facts.hours * 52);
}

/** Legacy line 170: rate.hourlyMinor / 100 */
export function annualPayRule10(facts: { readonly rateHourlyMinor: number }) {
  return facts.rateHourlyMinor / 100;
}

/** Legacy line 170: Math.round(rate.percentile) */
export function annualPayRule11(facts: { readonly ratePercentile: number }) {
  return Math.round(facts.ratePercentile);
}

/** Legacy line 173: inForce     ? {         annualMinor: inForce.annualDollars * 100,         note:           inForce.estimatedBecause ??           `Salary for this office, published (The Book of the States 2023; Congressional Research Service 97-1011 for Congress).`,   */
export function annualPayRule12(facts: {
  readonly inForce: unknown;
  readonly annualMinorInForceAnnualDollars100NoteInForceEstimatedBecaus: unknown;
}) {
  return facts.inForce
    ? facts.annualMinorInForceAnnualDollars100NoteInForceEstimatedBecaus
    : null;
}
