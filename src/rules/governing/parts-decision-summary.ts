// STOPGAP RULES3-GOV-067: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: decisionSummary.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 2280: holder ? personName(holder) : office.title */
export function decisionSummaryRule1(facts: {
  readonly holder: unknown;
  readonly personNameHolder: string;
  readonly officeTitle: string;
}) {
  return facts.holder ? facts.personNameHolder : facts.officeTitle;
}

/** Legacy line 2281: !option */
export function decisionSummaryRule2(facts: { readonly option: unknown }) {
  return !facts.option;
}

/** Legacy line 2284: matter.family === "bill"           ? `A bill on ${subjectLabel(matter.subjectKey)} became law without the signature of ${who}, ${office.title}.`           : `${matter.title}: no decision was made by the deadline. ${matter.ifIgnored}` */
export function decisionSummaryRule3(facts: {
  readonly matterFamily: string;
  readonly subjectLabelMatterSubjectKey: string;
  readonly who: string;
  readonly officeTitle: string;
  readonly matterTitle: string;
  readonly matterIfIgnored: string;
}) {
  return facts.matterFamily === "bill"
    ? `A bill on ${facts.subjectLabelMatterSubjectKey} became law without the signature of ${facts.who}, ${facts.officeTitle}.`
    : `${facts.matterTitle}: no decision was made by the deadline. ${facts.matterIfIgnored}`;
}

/** Legacy line 2287: matter.family === "bill" ? "public" : "limited" */
export function decisionSummaryRule4(facts: { readonly matterFamily: string }) {
  return facts.matterFamily === "bill" ? "public" : "limited";
}

/** Legacy line 2291: option.personId ? world.people[option.personId] : null */
export function decisionSummaryRule5(facts: {
  readonly optionPersonId: string | null;
  readonly peopleOptionPersonId: unknown;
}) {
  return facts.optionPersonId! ? facts.peopleOptionPersonId : null;
}

/** Legacy line 2293: hired &&         office.organizationId &&         isSittingChief(world, office.organizationId, option.personId!) */
export function decisionSummaryRule6(facts: {
  readonly hired: unknown;
  readonly officeOrganizationId: string | null;
  readonly isSittingChiefWorldOfficeOrganizationIdOptionPersonId: boolean;
}) {
  return (
    facts.hired &&
    facts.officeOrganizationId! &&
    facts.isSittingChiefWorldOfficeOrganizationIdOptionPersonId
  );
}

/** Legacy line 2302: hired ? personName(hired) : "a new" */
export function decisionSummaryRule7(facts: {
  readonly hired: unknown;
  readonly personNameHired: string;
}) {
  return facts.hired ? facts.personNameHired : "a new";
}

/** Legacy line 2307: option.key === "priority:none"         ? {             summary: `${who}, ${office.title}, left agency plans as they were.`,             visibility: "limited",           }         : {             summary: `${who}, ${office.title}, made ${option.label. */
export function decisionSummaryRule8(facts: {
  readonly optionKey: string;
  readonly summary$Who$OfficeTitleLeftAgencyPlansAsTheyWereVisibilityLimited: unknown;
  readonly summary$Who$OfficeTitleMade$OptionLabelToLowerCaseTheOfficeS: unknown;
}) {
  return facts.optionKey === "priority:none"
    ? facts.summary$Who$OfficeTitleLeftAgencyPlansAsTheyWereVisibilityLimited
    : facts.summary$Who$OfficeTitleMade$OptionLabelToLowerCaseTheOfficeS;
}

/** Legacy line 2317: option.key === BUDGET_DOLLARS */
export function decisionSummaryRule9(facts: {
  readonly optionKey: string;
  readonly BUDGET_DOLLARS: string;
}) {
  return facts.optionKey === facts.BUDGET_DOLLARS;
}

/** Legacy line 2322: option.key === BUDGET_FLAT         ? {             summary: `${who}, ${office.title}, kept the existing budget priorities without recording a new dollar request.`,             visibility: "public",           }         : {             summary: `${who} */
export function decisionSummaryRule10(facts: {
  readonly optionKey: string;
  readonly BUDGET_FLAT: string;
  readonly summary$Who$OfficeTitleKeptTheExistingBudgetPrioritiesWithou: unknown;
  readonly summary$Who$OfficeTitleAskedTheLegislatureForMoreMoneyFor$Su: unknown;
}) {
  return facts.optionKey === facts.BUDGET_FLAT
    ? facts.summary$Who$OfficeTitleKeptTheExistingBudgetPrioritiesWithou
    : facts.summary$Who$OfficeTitleAskedTheLegislatureForMoreMoneyFor$Su;
}

/** Legacy line 2332: option.key === "bill:sign"         ? {             summary: `${who}, ${office.title}, signed ${measureTitle(world, matter.measureId) ?? `a bill on ${subjectLabel(matter.subjectKey)}`} into law.`,             visibility: "public",           }          */
export function decisionSummaryRule11(facts: {
  readonly optionKey: string;
  readonly summary$Who$OfficeTitleSigned$MeasureTitleWorldMatterMeasure: unknown;
  readonly summary$Who$OfficeTitle$MatterMeasureIdVetoed$MeasureTitleWo: unknown;
}) {
  return facts.optionKey === "bill:sign"
    ? facts.summary$Who$OfficeTitleSigned$MeasureTitleWorldMatterMeasure
    : facts.summary$Who$OfficeTitle$MatterMeasureIdVetoed$MeasureTitleWo;
}

/** Legacy line 2342: option.key === "program:no-action"         ? {             summary: `${who}, ${office.title}, committed none of the money adopted for ${subjectLabel(matter.subjectKey)} yet.`,             visibility: "limited",           }         : {             sum */
export function decisionSummaryRule12(facts: {
  readonly optionKey: string;
  readonly summary$Who$OfficeTitleCommittedNoneOfTheMoneyAdoptedFor$Sub: unknown;
  readonly summary$Who$OfficeTitleCommittedMoneyAdoptedFor$SubjectLabel: unknown;
}) {
  return facts.optionKey === "program:no-action"
    ? facts.summary$Who$OfficeTitleCommittedNoneOfTheMoneyAdoptedFor$Sub
    : facts.summary$Who$OfficeTitleCommittedMoneyAdoptedFor$SubjectLabel;
}

/** Legacy line 2353: option.key === CLEMENCY_GRANT         ? {             summary: `${who}, ${office.title}, agreed to a request for clemency from ${petitioner}.`,             visibility: "limited",           }         : {             summary: `${who}, ${office.title},  */
export function decisionSummaryRule13(facts: {
  readonly optionKey: string;
  readonly CLEMENCY_GRANT: string;
  readonly summary$Who$OfficeTitleAgreedToARequestForClemencyFrom$Petit: unknown;
  readonly summary$Who$OfficeTitleTurnedDownARequestForClemencyFrom$Pet: unknown;
}) {
  return facts.optionKey === facts.CLEMENCY_GRANT
    ? facts.summary$Who$OfficeTitleAgreedToARequestForClemencyFrom$Petit
    : facts.summary$Who$OfficeTitleTurnedDownARequestForClemencyFrom$Pet;
}

/** Legacy line 2364: option.key === "pace:hold"         ? {             summary: `${office.title} held work on ${subjectLabel(matter.subjectKey)} until the budget is settled.`,             visibility: "limited",           }         : {             summary: `${office.titl */
export function decisionSummaryRule14(facts: {
  readonly optionKey: string;
  readonly summary$OfficeTitleHeldWorkOn$SubjectLabelMatterSubjectKeyUn: unknown;
  readonly summary$OfficeTitleDirectedAgenciesToBeginWorkOn$SubjectLabe: unknown;
}) {
  return facts.optionKey === "pace:hold"
    ? facts.summary$OfficeTitleHeldWorkOn$SubjectLabelMatterSubjectKeyUn
    : facts.summary$OfficeTitleDirectedAgenciesToBeginWorkOn$SubjectLabe;
}

/** Legacy line 2376: option.key === "order:independent-policy"           ? ({               kind: "independent-policy",               topicKey: matter.subjectKey ?? "unspecified-policy",             } as const)           : ({               kind: "executive-branch-managem */
export function decisionSummaryRule15(facts: {
  readonly optionKey: string;
  readonly kindIndependentPolicyTopicKeyMatterSubjectKeyUnspecifiedPoli: unknown;
  readonly kindExecutiveBranchManagementTopicKeyAgencyInstructionsAsConst: unknown;
}) {
  return facts.optionKey === "order:independent-policy"
    ? facts.kindIndependentPolicyTopicKeyMatterSubjectKeyUnspecifiedPoli
    : facts.kindExecutiveBranchManagementTopicKeyAgencyInstructionsAsConst;
}

/** Legacy line 2385: jurisdictionKey         ? decideExecutiveActionAuthority(             executiveRulePackForJurisdiction(jurisdictionKey),             clause,             null,           )         : {             allowed: false,             reason: "This office has no */
export function decisionSummaryRule16(facts: {
  readonly jurisdictionKey: string | null;
  readonly decideExecutiveActionAuthorityResult: unknown;
  readonly allowedFalseReasonThisOfficeHasNoRecordedExecutiveOrderAuthority: unknown;
}) {
  return facts.jurisdictionKey!
    ? facts.decideExecutiveActionAuthorityResult
    : facts.allowedFalseReasonThisOfficeHasNoRecordedExecutiveOrderAuthority;
}

/** Legacy line 2395: authority.allowed         ? {             summary: `${who}, ${office.title}, directed an agency's internal work by executive order.`,             visibility: "public",           }         : {             summary: `${who}, ${office.title}, requested a */
export function decisionSummaryRule17(facts: {
  readonly authorityAllowed: boolean;
  readonly summary$Who$OfficeTitleDirectedAnAgencySInternalWorkByExecut: unknown;
  readonly summary$Who$OfficeTitleRequestedAnExecutiveOrderOn$MatterSub: unknown;
}) {
  return facts.authorityAllowed
    ? facts.summary$Who$OfficeTitleDirectedAnAgencySInternalWorkByExecut
    : facts.summary$Who$OfficeTitleRequestedAnExecutiveOrderOn$MatterSub;
}

/** Legacy line 2411: option.key === "emergency:declare"         ? {             summary: `${who}, ${office.title}, declared an emergency for ${matter.subjectKey ?? "the recorded crisis"}.`,             visibility: "public",           }         : {             summary: `$ */
export function decisionSummaryRule18(facts: {
  readonly optionKey: string;
  readonly summary$Who$OfficeTitleDeclaredAnEmergencyFor$MatterSubjectK: unknown;
  readonly summary$Who$OfficeTitleDeclinedToDeclareAnEmergencyFor$Matte: unknown;
}) {
  return facts.optionKey === "emergency:declare"
    ? facts.summary$Who$OfficeTitleDeclaredAnEmergencyFor$MatterSubjectK
    : facts.summary$Who$OfficeTitleDeclinedToDeclareAnEmergencyFor$Matte;
}
