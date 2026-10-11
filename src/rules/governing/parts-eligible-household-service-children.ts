// STOPGAP RULES3-GOV-083: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/public-service-requests.ts :: eligibleHouseholdServiceChildren.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 482: !world.people[parentId] || !isPersonAliveAt(world, parentId, cutoff) */
export function eligibleHouseholdServiceChildrenRule1(facts: {
  readonly peopleParentId: unknown;
  readonly isPersonAliveAtWorldParentIdCutoff: boolean;
}) {
  return !facts.peopleParentId || !facts.isPersonAliveAtWorldParentIdCutoff;
}

/** Legacy line 492: entry.kind.startsWith("lineal:") && entry.kind.includes("parent-child") */
export function eligibleHouseholdServiceChildrenRule2(facts: {
  readonly entryKindStartsWithLineal: boolean;
  readonly entryKindIncludesParentChild: boolean;
}) {
  return facts.entryKindStartsWithLineal && facts.entryKindIncludesParentChild;
}

/** Legacy line 494: id !== parentId */
export function eligibleHouseholdServiceChildrenRule3(facts: {
  readonly id: string;
  readonly parentId: string;
}) {
  return facts.id !== facts.parentId;
}

/** Legacy line 499: !child ||         child.birthDate <= world.people[parentId]!.birthDate ||         !isPersonAliveAt(world, childId, cutoff) */
export function eligibleHouseholdServiceChildrenRule4(facts: {
  readonly child: unknown;
  readonly childBirthDate: string;
  readonly peopleParentIdBirthDate: string;
  readonly isPersonAliveAtWorldChildIdCutoff: boolean;
}) {
  return (
    !facts.child ||
    facts.childBirthDate <= facts.peopleParentIdBirthDate ||
    !facts.isPersonAliveAtWorldChildIdCutoff
  );
}

/** Legacy line 506: age >= terms.minimumAge &&         age <= terms.maximumAge &&         householdMembershipsAt(world, childId).some(({ household }) =>           homes.has(household.id),         ) &&         !activeEducationEnrollmentsAt(world, childId).some(           */
export function eligibleHouseholdServiceChildrenRule5(facts: {
  readonly age: number;
  readonly termsMinimumAge: number;
  readonly termsMaximumAge: number;
  readonly householdMembershipsAtResult: boolean;
  readonly activeEducationEnrollmentsAtResult: boolean;
}) {
  return (
    facts.age >= facts.termsMinimumAge &&
    facts.age <= facts.termsMaximumAge &&
    facts.householdMembershipsAtResult &&
    !facts.activeEducationEnrollmentsAtResult
  );
}

/** Legacy line 513: enrollment.organizationId !== providerId &&             terms.notAlreadyEnrolled.includes(enrollment.programKind) */
export function eligibleHouseholdServiceChildrenRule6(facts: {
  readonly enrollmentOrganizationId: string;
  readonly providerId: string;
  readonly termsNotAlreadyEnrolledIncludesEnrollmentProgramKind: boolean;
}) {
  return (
    facts.enrollmentOrganizationId !== facts.providerId &&
    facts.termsNotAlreadyEnrolledIncludesEnrollmentProgramKind
  );
}
