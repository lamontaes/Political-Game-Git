// STOPGAP RULES3-CAM-013: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-life-activities.ts :: timingProblem.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 591: entry.journeyKey === null ? 0 : entry.journeyMinutes */
export function timingProblemRule1(facts: {
  readonly entryJourneyKey: string | null;
  readonly entryJourneyMinutes: number;
}) {
  return facts.entryJourneyKey! === null ? 0 : facts.entryJourneyMinutes;
}

/** Legacy line 592: start.minuteOfDay - leadMinutes < 0 */
export function timingProblemRule2(facts: {
  readonly startMinuteOfDay: number;
  readonly leadMinutes: number;
}) {
  return facts.startMinuteOfDay - facts.leadMinutes < 0;
}

/** Legacy line 598: start.minuteOfDay - leadMinutes */
export function timingProblemRule3(facts: {
  readonly startMinuteOfDay: number;
  readonly leadMinutes: number;
}) {
  return facts.startMinuteOfDay - facts.leadMinutes;
}

/** Legacy line 600: compareSimulationMoments(leave, world.currentMoment) <= 0 */
export function timingProblemRule4(facts: {
  readonly compareSimulationMomentsLeaveWorldCurrentMoment: number;
}) {
  return facts.compareSimulationMomentsLeaveWorldCurrentMoment <= 0;
}

/** Legacy line 604: start.minuteOfDay + entry.defaultMinutes >     CAMPAIGN_LIFE_LATEST_END_MINUTE */
export function timingProblemRule5(facts: {
  readonly startMinuteOfDay: number;
  readonly entryDefaultMinutes: number;
  readonly CAMPAIGN_LIFE_LATEST_END_MINUTE: number;
}) {
  return (
    facts.startMinuteOfDay + facts.entryDefaultMinutes >
    facts.CAMPAIGN_LIFE_LATEST_END_MINUTE
  );
}

/** Legacy line 610: campaign &&     start.date >= requireElectionContest(world, campaign.contestId).electionDate */
export function timingProblemRule6(facts: {
  readonly campaign: unknown;
  readonly startDate: string;
  readonly requireElectionContestWorldCampaignContestIdElectionDate: string;
}) {
  return (
    facts.campaign &&
    facts.startDate >=
      facts.requireElectionContestWorldCampaignContestIdElectionDate
  );
}
