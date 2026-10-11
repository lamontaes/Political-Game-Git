// STOPGAP RULES3-GOV-093: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/public-program.ts :: programAuthority.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 534: office.kind === "federal-executive" */
export function programAuthorityRule1(facts: { readonly officeKind: string }) {
  return facts.officeKind === "federal-executive";
}

/** Legacy line 536: appropriation.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id ||       appropriation.publicGovernmentIdentity?.kind === "local-government" ||       (appropriation.publicGovernmentIdentity !== undefined &&         appropriation.publicGovernmentId */
export function programAuthorityRule2(facts: {
  readonly appropriationJurisdictionId: string;
  readonly NATIONAL_ELECTION_JURISDICTIONId: string;
  readonly appropriationPublicGovernmentIdentityKind: string | undefined;
  readonly appropriationPublicGovernmentIdentity: unknown;
  readonly appropriationPublicGovernmentIdentityJurisdictionId: string;
}) {
  return (
    facts.appropriationJurisdictionId !==
      facts.NATIONAL_ELECTION_JURISDICTIONId ||
    facts.appropriationPublicGovernmentIdentityKind! === "local-government" ||
    (facts.appropriationPublicGovernmentIdentity !== undefined &&
      facts.appropriationPublicGovernmentIdentityJurisdictionId !==
        facts.NATIONAL_ELECTION_JURISDICTIONId)
  );
}

/** Legacy line 547: !president */
export function programAuthorityRule3(facts: { readonly president: unknown }) {
  return !facts.president;
}

/** Legacy line 553: president.personId === personId       ? {           status: "available",           basis: `${president.title}: executes federal appropriations the office receives (${PUBLIC_PROGRAM_VERSION} game profile).`,         }       : {           status: "unav */
export function programAuthorityRule4(facts: {
  readonly presidentPersonId: string;
  readonly personId: string;
  readonly statusAvailableBasis$PresidentTitleExecutesFederalAppropriat: unknown;
  readonly statusUnavailableReasonOnlyTheSittingPresidentCommitsThisFed: unknown;
}) {
  return facts.presidentPersonId === facts.personId
    ? facts.statusAvailableBasis$PresidentTitleExecutesFederalAppropriat
    : facts.statusUnavailableReasonOnlyTheSittingPresidentCommitsThisFed;
}

/** Legacy line 564: office.kind === "state-executive" */
export function programAuthorityRule5(facts: { readonly officeKind: string }) {
  return facts.officeKind === "state-executive";
}

/** Legacy line 565: appropriation.publicGovernmentIdentity?.kind === "local-government" */
export function programAuthorityRule6(facts: {
  readonly appropriationPublicGovernmentIdentityKind: string | undefined;
}) {
  return (
    facts.appropriationPublicGovernmentIdentityKind! === "local-government"
  );
}

/** Legacy line 572: stateJurisdictionForKey(`US-${record.stateUsps}`)?.id ===         appropriation.jurisdictionId */
export function programAuthorityRule7(facts: {
  readonly stateJurisdictionForKeyUS$RecordStateUspsId: string | undefined;
  readonly appropriationJurisdictionId: string;
}) {
  return (
    facts.stateJurisdictionForKeyUS$RecordStateUspsId! ===
    facts.appropriationJurisdictionId
  );
}

/** Legacy line 575: !holder */
export function programAuthorityRule8(facts: { readonly holder: unknown }) {
  return !facts.holder;
}

/** Legacy line 580: holder.personId === personId       ? {           status: "available",           basis: `${holder.title}: executes appropriations the office receives (${PUBLIC_PROGRAM_VERSION} game profile).`,         }       : {           status: "unavailable",      */
export function programAuthorityRule9(facts: {
  readonly holderPersonId: string;
  readonly personId: string;
  readonly statusAvailableBasis$HolderTitleExecutesAppropriationsTheOff: unknown;
  readonly statusUnavailableReasonOnlyTheSitting$HolderTitleCommitsThis: unknown;
}) {
  return facts.holderPersonId === facts.personId
    ? facts.statusAvailableBasis$HolderTitleExecutesAppropriationsTheOff
    : facts.statusUnavailableReasonOnlyTheSitting$HolderTitleCommitsThis;
}

/** Legacy line 591: appropriation.publicGovernmentIdentity?.kind === "local-government" &&     appropriation.publicGovernmentIdentity.governmentKey !==       office.governmentKey */
export function programAuthorityRule10(facts: {
  readonly appropriationPublicGovernmentIdentityKind: string | undefined;
  readonly appropriationPublicGovernmentIdentityGovernmentKey: string;
  readonly officeGovernmentKey: string;
}) {
  return (
    facts.appropriationPublicGovernmentIdentityKind! === "local-government" &&
    facts.appropriationPublicGovernmentIdentityGovernmentKey !==
      facts.officeGovernmentKey
  );
}

/** Legacy line 603: jurisdictionId !== appropriation.jurisdictionId */
export function programAuthorityRule11(facts: {
  readonly jurisdictionId: string | null;
  readonly appropriationJurisdictionId: string;
}) {
  return facts.jurisdictionId! !== facts.appropriationJurisdictionId;
}

/** Legacy line 614: government ? primaryReading(government) : null */
export function programAuthorityRule12(facts: {
  readonly government: unknown;
  readonly primaryReadingGovernment: unknown;
}) {
  return facts.government ? facts.primaryReadingGovernment : null;
}

/** Legacy line 615: !reading */
export function programAuthorityRule13(facts: { readonly reading: unknown }) {
  return !facts.reading;
}

/** Legacy line 624: reading.budget?.prepares?.join(" ").toLowerCase() ?? "" */
export function programAuthorityRule14(facts: {
  readonly readingBudgetPreparesJoinToLowerCase: string | undefined;
}) {
  return facts.readingBudgetPreparesJoinToLowerCase! ?? "";
}

/** Legacy line 625: reading.manager !== null */
export function programAuthorityRule15(facts: {
  readonly readingManager: unknown;
}) {
  return facts.readingManager !== null;
}

/** Legacy line 627: reading.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE" ||     reading.form === "MAYOR_COUNCIL" */
export function programAuthorityRule16(facts: {
  readonly readingMayorStructuralPosition: string | undefined;
  readonly readingForm: string | null;
}) {
  return (
    facts.readingMayorStructuralPosition! === "SEPARATE_CHIEF_EXECUTIVE" ||
    facts.readingForm! === "MAYOR_COUNCIL"
  );
}

/** Legacy line 632: role === "member" || role === "presiding-member" */
export function programAuthorityRule17(facts: { readonly role: string }) {
  return facts.role === "member" || facts.role === "presiding-member";
}

/** Legacy line 636: reading.evidence === "game-profile" */
export function programAuthorityRule18(facts: {
  readonly readingEvidence: string;
}) {
  return facts.readingEvidence === "game-profile";
}

/** Legacy line 637: appropriation.publicGovernmentIdentity?.kind !== "local-government" */
export function programAuthorityRule19(facts: {
  readonly appropriationPublicGovernmentIdentityKind: string | undefined;
}) {
  return (
    facts.appropriationPublicGovernmentIdentityKind! !== "local-government"
  );
}

/** Legacy line 642: isManager && !isCouncilMember */
export function programAuthorityRule20(facts: {
  readonly isManager: boolean;
  readonly isCouncilMember: boolean;
}) {
  return facts.isManager && !facts.isCouncilMember;
}

/** Legacy line 649: isCouncilMember         ? "A council seat votes on the budget; committing adopted money belongs to the executive."         : "Only the seated professional manager commits this game-profile government's adopted appropriation." */
export function programAuthorityRule21(facts: {
  readonly isCouncilMember: boolean;
}) {
  return facts.isCouncilMember
    ? "A council seat votes on the budget; committing adopted money belongs to the executive."
    : "Only the seated professional manager commits this game-profile government's adopted appropriation.";
}

/** Legacy line 658: namedExecutor.includes("manager") && isManager */
export function programAuthorityRule22(facts: {
  readonly namedExecutorIncludesManager: boolean;
  readonly isManager: boolean;
}) {
  return facts.namedExecutorIncludesManager && facts.isManager;
}

/** Legacy line 660: reading.manager?.title ?? "Manager" */
export function programAuthorityRule23(facts: {
  readonly readingManagerTitle: string | undefined;
}) {
  return facts.readingManagerTitle! ?? "Manager";
}

/** Legacy line 663: namedExecutor.includes("mayor") && isMayor */
export function programAuthorityRule24(facts: {
  readonly namedExecutorIncludesMayor: boolean;
  readonly isMayor: boolean;
}) {
  return facts.namedExecutorIncludesMayor && facts.isMayor;
}

/** Legacy line 666: isManager       ? basis(           reading.manager?.title ?? "Manager",           "this government has an appointed manager who administers the adopted budget",         )       : {           status: "unavailable",           reason: `${office.governme */
export function programAuthorityRule25(facts: {
  readonly isManager: boolean;
  readonly basisResult: unknown;
  readonly statusUnavailableReason$OfficeGovernmentKeyHas$ReadingManage: unknown;
}) {
  return facts.isManager
    ? facts.basisResult
    : facts.statusUnavailableReason$OfficeGovernmentKeyHas$ReadingManage;
}

/** Legacy line 668: reading.manager?.title ?? "Manager" */
export function programAuthorityRule26(facts: {
  readonly readingManagerTitle: string;
}) {
  return facts.readingManagerTitle ?? "Manager";
}

/** Legacy line 675: strongMayor && isMayor */
export function programAuthorityRule27(facts: {
  readonly strongMayor: boolean;
  readonly isMayor: boolean;
}) {
  return facts.strongMayor && facts.isMayor;
}

/** Legacy line 686: standing.roles.length === 0 */
export function programAuthorityRule28(facts: {
  readonly standingRolesLength: number;
}) {
  return facts.standingRolesLength === 0;
}
