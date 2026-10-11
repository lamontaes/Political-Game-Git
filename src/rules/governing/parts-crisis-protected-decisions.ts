// STOPGAP RULES3-GOV-035: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/notices.ts :: crisisProtectedDecisions.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 450: world.control.kind !== "person" */
export function crisisProtectedDecisionsRule1(facts: {
  readonly controlKind: string;
}) {
  return facts.controlKind !== "person";
}

/** Legacy line 455: record.sequence > afterSequence &&       record.kind === "health-episode" &&       record.personId === personId &&       ageOnDate(world.people[personId]!.birthDate, record.effectiveAt) >= 18 */
export function crisisProtectedDecisionsRule2(facts: {
  readonly recordSequence: number;
  readonly afterSequence: number;
  readonly recordKind: string;
  readonly recordPersonId: string;
  readonly personId: string;
  readonly ageOnDateWorldPeoplePersonIdBirthDateRecordEffectiveAt: number;
}) {
  return (
    facts.recordSequence > facts.afterSequence &&
    facts.recordKind === "health-episode" &&
    facts.recordPersonId === facts.personId &&
    facts.ageOnDateWorldPeoplePersonIdBirthDateRecordEffectiveAt >= 18
  );
}

/** Legacy line 468: pending.sequence > afterSequence */
export function crisisProtectedDecisionsRule3(facts: {
  readonly pendingSequence: number;
  readonly afterSequence: number;
}) {
  return facts.pendingSequence > facts.afterSequence;
}

/** Legacy line 473: pending.decision === "state-request"             ? "disaster-state-request"             : "disaster-federal-declaration" */
export function crisisProtectedDecisionsRule4(facts: {
  readonly pendingDecision: string;
}) {
  return facts.pendingDecision === "state-request"
    ? "disaster-state-request"
    : "disaster-federal-declaration";
}

/** Legacy line 479: pending.sequence > afterSequence */
export function crisisProtectedDecisionsRule5(facts: {
  readonly pendingSequence: number;
  readonly afterSequence: number;
}) {
  return facts.pendingSequence > facts.afterSequence;
}

/** Legacy line 487: death.sequence > afterSequence && death.personId === personId */
export function crisisProtectedDecisionsRule6(facts: {
  readonly deathSequence: number;
  readonly afterSequence: number;
  readonly deathPersonId: string;
  readonly personId: string;
}) {
  return (
    facts.deathSequence > facts.afterSequence &&
    facts.deathPersonId === facts.personId
  );
}
