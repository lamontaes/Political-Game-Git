// STOPGAP RULES3-GOV-063: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: staffRecommendation.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1425: !office */
export function staffRecommendationRule1(facts: { readonly office: unknown }) {
  return !facts.office;
}

/** Legacy line 1427: !chief || matter.options.length === 0 */
export function staffRecommendationRule2(facts: {
  readonly chief: string | null;
  readonly matterOptionsLength: number;
}) {
  return !facts.chief! || facts.matterOptionsLength === 0;
}

/** Legacy line 1440: matter.status === "decided" && priority           ? matter.options.find(               (option) => option.key === `priority:${priority}`,             )           : undefined */
export function staffRecommendationRule3(facts: {
  readonly matterStatus: string;
  readonly priority: string | null;
  readonly matterOptionsFindOptionOptionKeyPriority$Priority: unknown;
}) {
  return facts.matterStatus === "decided" && facts.priority!
    ? facts.matterOptionsFindOptionOptionKeyPriority$Priority
    : undefined;
}

/** Legacy line 1442: option.key === `priority:${priority}` */
export function staffRecommendationRule4(facts: {
  readonly optionKey: string;
  readonly priority: string;
}) {
  return facts.optionKey === `priority:${facts.priority}`;
}

/** Legacy line 1453: !optionKey || !evaluation */
export function staffRecommendationRule5(facts: {
  readonly optionKey: string | null;
  readonly evaluation: unknown;
}) {
  return !facts.optionKey! || !facts.evaluation;
}

/** Legacy line 1458: reason.optionKey === optionKey */
export function staffRecommendationRule6(facts: {
  readonly reasonOptionKey: string;
  readonly optionKey: string;
}) {
  return facts.reasonOptionKey === facts.optionKey;
}

/** Legacy line 1465: priority         ? matter.options.find((o) => o.key === `budget:${priority}`)         : undefined */
export function staffRecommendationRule7(facts: {
  readonly priority: string | null;
  readonly matterOptionsFindOOKeyBudget$Priority: unknown;
}) {
  return facts.priority!
    ? facts.matterOptionsFindOOKeyBudget$Priority
    : undefined;
}

/** Legacy line 1466: o.key === `budget:${priority}` */
export function staffRecommendationRule8(facts: {
  readonly oKey: string;
  readonly priority: string;
}) {
  return facts.oKey === `budget:${facts.priority}`;
}

/** Legacy line 1468: match         ? {             optionKey: match.key,             byPersonId: chief,             reason: "It matches the priority you already set.",           }         : {             optionKey: BUDGET_FLAT,             byPersonId: chief,              */
export function staffRecommendationRule9(facts: {
  readonly match: unknown;
  readonly optionKeyMatchKeyByPersonIdChiefReasonItMatchesThePriorityYo: unknown;
  readonly optionKeyBUDGET_FLATByPersonIdChiefReasonNothingOnTheListIsA: unknown;
}) {
  return facts.match
    ? facts.optionKeyMatchKeyByPersonIdChiefReasonItMatchesThePriorityYo
    : facts.optionKeyBUDGET_FLATByPersonIdChiefReasonNothingOnTheListIsA;
}

/** Legacy line 1481: matter.subjectKey &&         currentPriority(world, office) === matter.subjectKey         ? {             optionKey: "bill:sign",             byPersonId: chief,             reason: "It moves the office's own priority.",           }         : // The c */
export function staffRecommendationRule10(facts: {
  readonly matterSubjectKey: string | null;
  readonly currentPriorityWorldOffice: string | null;
  readonly optionKeyBillSignByPersonIdChiefReasonItMovesTheOfficeSOwnPr: unknown;
  readonly billOpposedByOwnPartyWorldOfficeMatter: boolean;
  readonly optionKeyBillReturnByPersonIdChiefReasonTheGovernorSOwnParty: unknown;
  readonly optionKeyBillSignByPersonIdChiefReason$ClauseAssessmentBackg: unknown;
}) {
  return facts.matterSubjectKey! &&
    facts.currentPriorityWorldOffice! === facts.matterSubjectKey
    ? facts.optionKeyBillSignByPersonIdChiefReasonItMovesTheOfficeSOwnPr
    : facts.billOpposedByOwnPartyWorldOfficeMatter
      ? facts.optionKeyBillReturnByPersonIdChiefReasonTheGovernorSOwnParty
      : facts.optionKeyBillSignByPersonIdChiefReason$ClauseAssessmentBackg;
}

/** Legacy line 1503: assessment.steadiness === null */
export function staffRecommendationRule11(facts: {
  readonly assessmentSteadiness: number | null;
}) {
  return facts.assessmentSteadiness! === null;
}

/** Legacy line 1507: option.key === "program:operate-three-months" */
export function staffRecommendationRule12(facts: {
  readonly optionKey: string;
}) {
  return facts.optionKey === "program:operate-three-months";
}

/** Legacy line 1510: option.key === "program:no-action" */
export function staffRecommendationRule13(facts: {
  readonly optionKey: string;
}) {
  return facts.optionKey === "program:no-action";
}

/** Legacy line 1513: assessment.steadiness >= 2 ? (spread ?? hold) : (hold ?? spread) */
export function staffRecommendationRule14(facts: {
  readonly assessmentSteadiness: number;
  readonly spread: unknown;
  readonly hold: unknown;
}) {
  return facts.assessmentSteadiness >= 2
    ? (facts.spread ?? facts.hold)
    : (facts.hold ?? facts.spread);
}

/** Legacy line 1514: pick         ? {             optionKey: pick.key,             byPersonId: chief,             reason:               pick.key === "program:no-action"                 ? "Nothing here has to be committed this week, and the money keeps."                 : */
export function staffRecommendationRule15(facts: {
  readonly pick: unknown;
  readonly optionKeyPickKeyByPersonIdChiefReasonPickKeyProgramNoActionN: unknown;
}) {
  return facts.pick
    ? facts.optionKeyPickKeyByPersonIdChiefReasonPickKeyProgramNoActionN
    : null;
}

/** Legacy line 1526: assessment.steadiness === null */
export function staffRecommendationRule16(facts: {
  readonly assessmentSteadiness: number | null;
}) {
  return facts.assessmentSteadiness! === null;
}

/** Legacy line 1527: assessment.steadiness >= 2         ? {             optionKey: "pace:careful",             byPersonId: chief,             reason: "Would rather plan first than explain an early stumble.",           }         : {             optionKey: "pace:fast",     */
export function staffRecommendationRule17(facts: {
  readonly assessmentSteadiness: number;
  readonly optionKeyPaceCarefulByPersonIdChiefReasonWouldRatherPlanFirs: unknown;
  readonly optionKeyPaceFastByPersonIdChiefReasonThinksTheAgenciesAreRe: unknown;
}) {
  return facts.assessmentSteadiness >= 2
    ? facts.optionKeyPaceCarefulByPersonIdChiefReasonWouldRatherPlanFirs
    : facts.optionKeyPaceFastByPersonIdChiefReasonThinksTheAgenciesAreRe;
}
