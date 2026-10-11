// STOPGAP RULES3-GOV-064: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: orderDelegatedRuleDrafts.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1714: office ? currentPriority(world, office) : null */
export function orderDelegatedRuleDraftsRule1(facts: {
  readonly office: unknown;
  readonly currentPriorityWorldOffice: string | null;
}) {
  return facts.office ? facts.currentPriorityWorldOffice! : null;
}

/** Legacy line 1715: priority     ? [...drafts].sort(         (left, right) =>           Number(right.subjectKey === priority) -           Number(left.subjectKey === priority),       )     : drafts */
export function orderDelegatedRuleDraftsRule2(facts: {
  readonly priority: string | null;
  readonly draftsSortLeftRightNumberRightSubjectKeyPriorityNumberLeftSu: unknown[];
  readonly drafts: unknown[];
}) {
  return facts.priority!
    ? facts.draftsSortLeftRightNumberRightSubjectKeyPriorityNumberLeftSu
    : facts.drafts;
}

/** Legacy line 1718: Number(right.subjectKey === priority) -           Number(left.subjectKey === priority) */
export function orderDelegatedRuleDraftsRule3(facts: {
  readonly rightSubjectKey: string;
  readonly priority: string;
  readonly leftSubjectKey: string;
}) {
  return (
    Number(facts.rightSubjectKey === facts.priority) -
    Number(facts.leftSubjectKey === facts.priority)
  );
}
