// STOPGAP RULES3-GOV-015: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: schoolDecisions.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 508: event.type === EPIDEMIC_EVENT_TYPES.schoolClosed */
export function schoolDecisionsRule1(facts: {
  readonly eventType: string;
  readonly EPIDEMIC_EVENT_TYPESSchoolClosed: string;
}) {
  return facts.eventType === facts.EPIDEMIC_EVENT_TYPESSchoolClosed;
}

/** Legacy line 515: index.studentsByOrg.get(orgId) ?? [] */
export function schoolDecisionsRule2(facts: {
  readonly indexStudentsByOrgGetOrgId: unknown;
}) {
  return facts.indexStudentsByOrgGetOrgId ?? [];
}

/** Legacy line 516: index.workersByOrg.get(orgId) ?? [] */
export function schoolDecisionsRule3(facts: {
  readonly indexWorkersByOrgGetOrgId: unknown;
}) {
  return facts.indexWorkersByOrgGetOrgId ?? [];
}

/** Legacy line 521: !isClosed && out < U.minimumSickToDecide */
export function schoolDecisionsRule4(facts: {
  readonly isClosed: boolean;
  readonly out: number;
  readonly UMinimumSickToDecide: number;
}) {
  return !facts.isClosed && facts.out < facts.UMinimumSickToDecide;
}

/** Legacy line 522: index.studentsByOrg.has(orgId)       ? principalOf(next, orgId, index)       : null */
export function schoolDecisionsRule5(facts: {
  readonly indexStudentsByOrgHasOrgId: boolean;
  readonly principalOfNextOrgIdIndex: string | null;
}) {
  return facts.indexStudentsByOrgHasOrgId
    ? facts.principalOfNextOrgIdIndex!
    : null;
}

/** Legacy line 525: !principal && !isClosed */
export function schoolDecisionsRule6(facts: {
  readonly principal: string | null;
  readonly isClosed: boolean;
}) {
  return !facts.principal! && !facts.isClosed;
}

/** Legacy line 526: principal ? riskApproachOf(next, principal) : "neutral" */
export function schoolDecisionsRule7(facts: {
  readonly principal: string | null;
  readonly riskApproachOfNextPrincipal: string;
}) {
  return facts.principal! ? facts.riskApproachOfNextPrincipal : "neutral";
}

/** Legacy line 528: people.length === 0 ? 0 : out / people.length */
export function schoolDecisionsRule8(facts: {
  readonly peopleLength: number;
  readonly out: number;
}) {
  return facts.peopleLength === 0 ? 0 : facts.out / facts.peopleLength;
}

/** Legacy line 530: profile?.name ?? "the school" */
export function schoolDecisionsRule9(facts: {
  readonly profileName: string | undefined;
}) {
  return facts.profileName! ?? "the school";
}

/** Legacy line 531: profile?.locationJurisdictionId ?? null */
export function schoolDecisionsRule10(facts: {
  readonly profileLocationJurisdictionId: string | null | undefined;
}) {
  return facts.profileLocationJurisdictionId! ?? null;
}

/** Legacy line 532: principal ? personName(next.people[principal]!) : null */
export function schoolDecisionsRule11(facts: {
  readonly principal: string | null;
  readonly personNameNextPeoplePrincipal: string;
}) {
  return facts.principal! ? facts.personNameNextPeoplePrincipal : null;
}

/** Legacy line 533: out === 1 ? "was" : "were" */
export function schoolDecisionsRule12(facts: { readonly out: number }) {
  return facts.out === 1 ? "was" : "were";
}

/** Legacy line 537: !who */
export function schoolDecisionsRule13(facts: { readonly who: string | null }) {
  return !facts.who!;
}

/** Legacy line 540: !isClosed && share >= bar */
export function schoolDecisionsRule14(facts: {
  readonly isClosed: boolean;
  readonly share: number;
  readonly bar: number;
}) {
  return !facts.isClosed && facts.share >= facts.bar;
}

/** Legacy line 543: isClosed && share < bar * U.reopenFractionOfBar */
export function schoolDecisionsRule15(facts: {
  readonly isClosed: boolean;
  readonly share: number;
  readonly bar: number;
  readonly UReopenFractionOfBar: number;
}) {
  return facts.isClosed && facts.share < facts.bar * facts.UReopenFractionOfBar;
}

/** Legacy line 546: !isClosed && share >= bar * U.reopenFractionOfBar */
export function schoolDecisionsRule16(facts: {
  readonly isClosed: boolean;
  readonly share: number;
  readonly bar: number;
  readonly UReopenFractionOfBar: number;
}) {
  return (
    !facts.isClosed && facts.share >= facts.bar * facts.UReopenFractionOfBar
  );
}

/** Legacy line 550: !type */
export function schoolDecisionsRule17(facts: { readonly type: string | null }) {
  return !facts.type!;
}

/** Legacy line 551: type === EPIDEMIC_EVENT_TYPES.schoolClosed */
export function schoolDecisionsRule18(facts: {
  readonly type: string;
  readonly EPIDEMIC_EVENT_TYPESSchoolClosed: string;
}) {
  return facts.type === facts.EPIDEMIC_EVENT_TYPESSchoolClosed;
}

/** Legacy line 552: type === EPIDEMIC_EVENT_TYPES.schoolReopened */
export function schoolDecisionsRule19(facts: {
  readonly type: string;
  readonly EPIDEMIC_EVENT_TYPESSchoolReopened: string;
}) {
  return facts.type === facts.EPIDEMIC_EVENT_TYPESSchoolReopened;
}

/** Legacy line 559: principal ? [orgId, principal] : [orgId] */
export function schoolDecisionsRule20(facts: {
  readonly principal: string | null;
  readonly orgIdPrincipal: unknown[];
  readonly orgId: unknown[];
}) {
  return facts.principal! ? facts.orgIdPrincipal : facts.orgId;
}

/** Legacy line 560: principal         ? [{ personId: principal, role: "agency:decider", detail: approach }]         : [] */
export function schoolDecisionsRule21(facts: {
  readonly principal: string | null;
  readonly personIdPrincipalRoleAgencyDeciderDetailApproach: unknown[];
}) {
  return facts.principal!
    ? facts.personIdPrincipalRoleAgencyDeciderDetailApproach
    : [];
}

/** Legacy line 577: lean           ? `${counted}; the principal is ${lean}.`           : `${counted}.` */
export function schoolDecisionsRule22(facts: {
  readonly lean: string;
  readonly counted: string;
}) {
  return facts.lean
    ? `${facts.counted}; the principal is ${facts.lean}.`
    : `${facts.counted}.`;
}
