// STOPGAP RULES3-GOV-009: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/civil-personnel-actions.ts :: assessPersonnelReinstatement.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1504: !position */
export function assessPersonnelReinstatementRule1(facts: {
  readonly position: unknown;
}) {
  return !facts.position;
}

/** Legacy line 1517: !authority.ok */
export function assessPersonnelReinstatementRule2(facts: {
  readonly authorityOk: boolean;
}) {
  return !facts.authorityOk;
}

/** Legacy line 1518: personId === actorPersonId */
export function assessPersonnelReinstatementRule3(facts: {
  readonly personId: string;
  readonly actorPersonId: string;
}) {
  return facts.personId === facts.actorPersonId;
}

/** Legacy line 1524: !world.people[personId] ||     !isPersonAliveAt(world, personId, currentLifeCutoff(world)) */
export function assessPersonnelReinstatementRule4(facts: {
  readonly peoplePersonId: unknown;
  readonly isPersonAliveAtWorldPersonIdCurrentLifeCutoffWorld: boolean;
}) {
  return (
    !facts.peoplePersonId ||
    !facts.isPersonAliveAtWorldPersonIdCurrentLifeCutoffWorld
  );
}

/** Legacy line 1528: !positionIsVacant(world, position.id) */
export function assessPersonnelReinstatementRule5(facts: {
  readonly positionIsVacantWorldPositionId: boolean;
}) {
  return !facts.positionIsVacantWorldPositionId;
}

/** Legacy line 1533: i.personId !== personId || i.tenure === "unknown" */
export function assessPersonnelReinstatementRule6(facts: {
  readonly iPersonId: string;
  readonly personId: string;
  readonly iTenure: string;
}) {
  return facts.iPersonId !== facts.personId || facts.iTenure === "unknown";
}

/** Legacy line 1537: formerPosition?.classKey === position.classKey &&         formerPosition.jurisdictionKey === position.jurisdictionKey &&         separated !== null &&         world.currentDate <= yearsAfter(separated, limit) */
export function assessPersonnelReinstatementRule7(facts: {
  readonly formerPositionClassKey: string | undefined;
  readonly positionClassKey: string;
  readonly formerPositionJurisdictionKey: string;
  readonly positionJurisdictionKey: string;
  readonly separated: string | null;
  readonly currentDate: string;
  readonly yearsAfterSeparatedLimit: string;
}) {
  return (
    facts.formerPositionClassKey! === facts.positionClassKey &&
    facts.formerPositionJurisdictionKey === facts.positionJurisdictionKey &&
    facts.separated! !== null &&
    facts.currentDate <= facts.yearsAfterSeparatedLimit
  );
}

/** Legacy line 1543: -1 */
export function assessPersonnelReinstatementRule8() {
  return -1;
}

/** Legacy line 1544: !former */
export function assessPersonnelReinstatementRule9(facts: {
  readonly former: unknown;
}) {
  return !facts.former;
}

/** Legacy line 1552: o.personId === personId &&       recordById(world, o.positionId, "position")?.organizationId ===         position.organizationId */
export function assessPersonnelReinstatementRule10(facts: {
  readonly oPersonId: string;
  readonly personId: string;
  readonly recordByIdWorldOPositionIdPositionOrganizationId: string | undefined;
  readonly positionOrganizationId: string;
}) {
  return (
    facts.oPersonId === facts.personId &&
    facts.recordByIdWorldOPositionIdPositionOrganizationId! ===
      facts.positionOrganizationId
  );
}

/** Legacy line 1560: r.offerId === o.id && r.response === "declined" */
export function assessPersonnelReinstatementRule11(facts: {
  readonly rOfferId: string;
  readonly oId: string;
  readonly rResponse: string;
}) {
  return facts.rOfferId === facts.oId && facts.rResponse === "declined";
}

/** Legacy line 1572: formerPosition.organizationId !== position.organizationId */
export function assessPersonnelReinstatementRule12(facts: {
  readonly formerPositionOrganizationId: string;
  readonly positionOrganizationId: string;
}) {
  return facts.formerPositionOrganizationId !== facts.positionOrganizationId;
}
