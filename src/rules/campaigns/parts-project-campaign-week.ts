// STOPGAP RULES3-CAM-033: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: projectCampaignWeek.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 730: world.control.kind !== "person" || world.control.personId !== personId */
export function projectCampaignWeekRule1(facts: {
  readonly controlKind: string;
  readonly controlPersonId: string;
  readonly personId: string;
}) {
  return (
    facts.controlKind !== "person" || facts.controlPersonId !== facts.personId
  );
}

/** Legacy line 734: !campaign */
export function projectCampaignWeekRule2(facts: {
  readonly campaign: unknown;
}) {
  return !facts.campaign;
}

/** Legacy line 735: electionContestStatus(world, campaign.contestId) !== "pending" */
export function projectCampaignWeekRule3(facts: {
  readonly electionContestStatusWorldCampaignContestId: string;
}) {
  return facts.electionContestStatusWorldCampaignContestId !== "pending";
}

/** Legacy line 741: context.proposerPersonId     ? personName(world.people[context.proposerPersonId]!)     : personName(world.people[personId]!) */
export function projectCampaignWeekRule4(facts: {
  readonly contextProposerPersonId: string | null;
  readonly personNameWorldPeopleContextProposerPersonId: string;
  readonly personNameWorldPeoplePersonId: string;
}) {
  return facts.contextProposerPersonId!
    ? facts.personNameWorldPeopleContextProposerPersonId
    : facts.personNameWorldPeoplePersonId;
}

/** Legacy line 744: context.proposerPersonId     ? proposedEmphasis(world, context, options)     : null */
export function projectCampaignWeekRule5(facts: {
  readonly contextProposerPersonId: string | null;
  readonly proposedEmphasisWorldContextOptions: string;
}) {
  return facts.contextProposerPersonId!
    ? facts.proposedEmphasisWorldContextOptions
    : null;
}

/** Legacy line 748: committed ? orderedSessions(world, committed) : [] */
export function projectCampaignWeekRule6(facts: {
  readonly committed: unknown;
  readonly orderedSessionsWorldCommitted: unknown[];
}) {
  return facts.committed ? facts.orderedSessionsWorldCommitted : [];
}

/** Legacy line 749: plansFor(world, campaign.id).at(-1) ?? null */
export function projectCampaignWeekRule7(facts: {
  readonly plansForWorldCampaignIdAt1: unknown;
}) {
  return facts.plansForWorldCampaignIdAt1 ?? null;
}

/** Legacy line 749: -1 */
export function projectCampaignWeekRule8() {
  return -1;
}

/** Legacy line 758: context.proposerPersonId       ? `${proposerName}, an active campaign staff member`       : `${proposerName}, planning without campaign staff` */
export function projectCampaignWeekRule9(facts: {
  readonly contextProposerPersonId: string | null;
  readonly proposerName: string;
}) {
  return facts.contextProposerPersonId!
    ? `${facts.proposerName}, an active campaign staff member`
    : `${facts.proposerName}, planning without campaign staff`;
}

/** Legacy line 762: proposed && context.proposerPersonId         ? `${proposerName} proposes ${EMPHASIS_LABEL[proposed].toLowerCase()}. The allocation, channel, geography and amount are yours to change before committing.`         : null */
export function projectCampaignWeekRule10(facts: {
  readonly proposed: string | null;
  readonly contextProposerPersonId: string | null;
  readonly proposerName: string;
  readonly EMPHASIS_LABELProposedToLowerCase: string;
}) {
  return facts.proposed! && facts.contextProposerPersonId!
    ? `${facts.proposerName} proposes ${facts.EMPHASIS_LABELProposedToLowerCase}. The allocation, channel, geography and amount are yours to change before committing.`
    : null;
}

/** Legacy line 779: context.treasury.minorUnits >= entry.minimumBuyMinorUnits */
export function projectCampaignWeekRule11(facts: {
  readonly contextTreasuryMinorUnits: number;
  readonly entryMinimumBuyMinorUnits: number;
}) {
  return facts.contextTreasuryMinorUnits >= facts.entryMinimumBuyMinorUnits;
}

/** Legacy line 784: committed       ? {           planId: committed.id,           emphasis: committed.chosenEmphasis,           allocation: { ...committed.allocation },           advertising: committed.advertising,           sessions,           nextActionId: nextSession */
export function projectCampaignWeekRule12(facts: {
  readonly committed: unknown;
  readonly planIdCommittedIdEmphasisCommittedChosenEmphasisAllocationCo: unknown;
}) {
  return facts.committed
    ? facts.planIdCommittedIdEmphasisCommittedChosenEmphasisAllocationCo
    : null;
}

/** Legacy line 791: nextSession(sessions)?.actionId ?? null */
export function projectCampaignWeekRule13(facts: {
  readonly nextSessionSessionsActionId: string | undefined;
}) {
  return facts.nextSessionSessionsActionId! ?? null;
}

/** Legacy line 793: sessions.find(               (session) =>                 session.status === "scheduled" &&                 compareSimulationMoments(session.start, world.currentMoment) <=                   0 &&                 compareSimulationMoments(world.currentM */
export function projectCampaignWeekRule14(facts: {
  readonly sessionsfindResult: string | undefined;
}) {
  return facts.sessionsfindResult! ?? null;
}

/** Legacy line 795: session.status === "scheduled" &&                 compareSimulationMoments(session.start, world.currentMoment) <=                   0 &&                 compareSimulationMoments(world.currentMoment, session.end) < 0 */
export function projectCampaignWeekRule15(facts: {
  readonly sessionStatus: string;
  readonly compareSimulationMomentsSessionStartWorldCurrentMoment: number;
  readonly compareSimulationMomentsWorldCurrentMomentSessionEnd: number;
}) {
  return (
    facts.sessionStatus === "scheduled" &&
    facts.compareSimulationMomentsSessionStartWorldCurrentMoment <= 0 &&
    facts.compareSimulationMomentsWorldCurrentMomentSessionEnd < 0
  );
}

/** Legacy line 803: latest && latest.status === "refused" && latest.refusal         ? {             planId: latest.id,             refusal: latest.refusal,             explanation: refusalExplanation(latest.refusal),             decidedOn: latest.createdAt,              */
export function projectCampaignWeekRule16(facts: {
  readonly latest: unknown;
  readonly latestStatus: string;
  readonly latestRefusal: string | null;
  readonly planIdLatestIdRefusalLatestRefusalExplanationRefusalExplanat: unknown;
}) {
  return facts.latest &&
    facts.latestStatus === "refused" &&
    facts.latestRefusal!
    ? facts.planIdLatestIdRefusalLatestRefusalExplanationRefusalExplanat
    : null;
}
