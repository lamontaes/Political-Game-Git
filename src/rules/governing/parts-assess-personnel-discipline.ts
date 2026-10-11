// STOPGAP RULES3-GOV-095: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/civil-personnel-actions.ts :: assessPersonnelDiscipline.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 685: incumbency     ? recordById(world, incumbency.positionId, "position")     : null */
export function assessPersonnelDisciplineRule1(facts: {
  readonly incumbency: unknown;
  readonly recordByIdWorldIncumbencyPositionIdPosition: unknown;
}) {
  return facts.incumbency
    ? facts.recordByIdWorldIncumbencyPositionIdPosition
    : null;
}

/** Legacy line 688: !incumbency || !position */
export function assessPersonnelDisciplineRule2(facts: {
  readonly incumbency: unknown;
  readonly position: unknown;
}) {
  return !facts.incumbency || !facts.position;
}

/** Legacy line 703: !authority.ok */
export function assessPersonnelDisciplineRule3(facts: {
  readonly authorityOk: boolean;
}) {
  return !facts.authorityOk;
}

/** Legacy line 705: !rule?.classifiedProcedureAvailable */
export function assessPersonnelDisciplineRule4(facts: {
  readonly ruleClassifiedProcedureAvailable: boolean | undefined;
}) {
  return !facts.ruleClassifiedProcedureAvailable!;
}

/** Legacy line 720: applicability.state === "UNKNOWN" */
export function assessPersonnelDisciplineRule5(facts: {
  readonly applicabilityState: string;
}) {
  return facts.applicabilityState === "UNKNOWN";
}

/** Legacy line 723: !incumbencyIsActive(world, incumbency) */
export function assessPersonnelDisciplineRule6(facts: {
  readonly incumbencyIsActiveWorldIncumbency: boolean;
}) {
  return !facts.incumbencyIsActiveWorldIncumbency;
}

/** Legacy line 728: incumbency.personId === actorPersonId */
export function assessPersonnelDisciplineRule7(facts: {
  readonly incumbencyPersonId: string;
  readonly actorPersonId: string;
}) {
  return facts.incumbencyPersonId === facts.actorPersonId;
}

/** Legacy line 733: position.civilClass !== "classified" */
export function assessPersonnelDisciplineRule8(facts: {
  readonly positionCivilClass: string;
}) {
  return facts.positionCivilClass !== "classified";
}

/** Legacy line 737: position.civilClass === "unknown"           ? "The position's civil-service class is not established."           : `Section 43A.33 protects classified employees; this position is ${position.civilClass}, and its removal authority is not established.` */
export function assessPersonnelDisciplineRule9(facts: {
  readonly positionCivilClass: string;
}) {
  return facts.positionCivilClass === "unknown"
    ? "The position's civil-service class is not established."
    : `Section 43A.33 protects classified employees; this position is ${facts.positionCivilClass}, and its removal authority is not established.`;
}

/** Legacy line 741: incumbency.tenure === "probationary" */
export function assessPersonnelDisciplineRule10(facts: {
  readonly incumbencyTenure: string;
}) {
  return facts.incumbencyTenure === "probationary";
}

/** Legacy line 746: incumbency.tenure !== "permanent" */
export function assessPersonnelDisciplineRule11(facts: {
  readonly incumbencyTenure: string;
}) {
  return facts.incumbencyTenure !== "permanent";
}

/** Legacy line 751: position.agreementCoverage === "covered" */
export function assessPersonnelDisciplineRule12(facts: {
  readonly positionAgreementCoverage: string;
}) {
  return facts.positionAgreementCoverage === "covered";
}

/** Legacy line 756: position.agreementCoverage !== "not-covered" */
export function assessPersonnelDisciplineRule13(facts: {
  readonly positionAgreementCoverage: string;
}) {
  return facts.positionAgreementCoverage !== "not-covered";
}

/** Legacy line 762: step === "discipline" && !unusedInformalAttempt(world, incumbency.id) */
export function assessPersonnelDisciplineRule14(facts: {
  readonly step: string;
  readonly unusedInformalAttemptWorldIncumbencyId: unknown;
}) {
  return (
    facts.step === "discipline" && !facts.unusedInformalAttemptWorldIncumbencyId
  );
}
