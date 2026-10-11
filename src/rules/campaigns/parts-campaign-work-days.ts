// STOPGAP RULES3-CAM-016: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-managers.ts :: campaignWorkDays.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 43: !role */
export function campaignWorkDaysRule1(facts: { readonly role: unknown }) {
  return !facts.role;
}

/** Legacy line 45: row.status === "ended" && row.effectiveAt >= role.effectiveAt */
export function campaignWorkDaysRule2(facts: {
  readonly rowStatus: string;
  readonly rowEffectiveAt: string;
  readonly roleEffectiveAt: string;
}) {
  return (
    facts.rowStatus === "ended" && facts.rowEffectiveAt >= facts.roleEffectiveAt
  );
}

/** Legacy line 47: ended?.effectiveAt ?? world.currentDate */
export function campaignWorkDaysRule3(facts: {
  readonly endedEffectiveAt: string | undefined;
  readonly currentDate: string;
}) {
  return facts.endedEffectiveAt! ?? facts.currentDate;
}

/** Legacy line 48: end > role.effectiveAt */
export function campaignWorkDaysRule4(facts: {
  readonly end: string;
  readonly roleEffectiveAt: string;
}) {
  return facts.end > facts.roleEffectiveAt;
}

/** Legacy line 49: days += Math.floor(         (Date.parse(`${end}T00:00:00Z`) -           Date.parse(`${role.effectiveAt}T00:00:00Z`)) /           86_400_000,       ) */
export function campaignWorkDaysRule5(facts: {
  readonly days: number;
  readonly end: string;
  readonly roleEffectiveAt: string;
}) {
  return (
    facts.days +
    Math.floor(
      (Date.parse(`${facts.end}T00:00:00Z`) -
        Date.parse(`${facts.roleEffectiveAt}T00:00:00Z`)) /
        86400000,
    )
  );
}
