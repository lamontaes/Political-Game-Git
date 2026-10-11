// STOPGAP RULES3-GOV-011: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/constituent-casework-routing.ts :: holdsPublicOffice.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 137: publicOfficesHeldBy(world, personId).length > 0 */
export function holdsPublicOfficeRule1(facts: {
  readonly publicOfficesHeldByWorldPersonIdLength: number;
}) {
  return facts.publicOfficesHeldByWorldPersonIdLength > 0;
}

/** Legacy line 141: participation.kind === "leadership:municipal-office" &&         state.roleKind !== null */
export function holdsPublicOfficeRule2(facts: {
  readonly participationKind: string;
  readonly stateRoleKind: string | null;
}) {
  return (
    facts.participationKind === "leadership:municipal-office" &&
    facts.stateRoleKind! !== null
  );
}
