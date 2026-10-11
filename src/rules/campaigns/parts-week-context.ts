// STOPGAP RULES3-CAM-028: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: weekContext.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 432: -1 */
export function weekContextRule1() {
  return -1;
}

/** Legacy line 433: lastWorkDay < weekStart */
export function weekContextRule2(facts: {
  readonly lastWorkDay: string;
  readonly weekStart: string;
}) {
  return facts.lastWorkDay < facts.weekStart;
}

/** Legacy line 434: electionPassed     ? weekStart     : [addDays(weekStart, 6), lastWorkDay].sort()[0]! */
export function weekContextRule3(facts: {
  readonly electionPassed: boolean;
  readonly weekStart: string;
  readonly addDaysWeekStart6LastWorkDaySort0: string;
}) {
  return facts.electionPassed
    ? facts.weekStart
    : facts.addDaysWeekStart6LastWorkDaySort0;
}

/** Legacy line 437: campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {     minorUnits: 0,     currency: campaign.treasuryCurrency,   } */
export function weekContextRule4(facts: {
  readonly campaignTreasuryPositionWorldCampaignLiquidBalance: unknown;
  readonly minorUnits0CurrencyCampaignTreasuryCurrency: unknown;
}) {
  return (
    facts.campaignTreasuryPositionWorldCampaignLiquidBalance ??
    facts.minorUnits0CurrencyCampaignTreasuryCurrency
  );
}

/** Legacy line 447: committed?.id ?? "none" */
export function weekContextRule5(facts: {
  readonly committedId: string | undefined;
}) {
  return facts.committedId! ?? "none";
}

/** Legacy line 455: Math.max(0, daysBetween(weekStart, contest.electionDate)) */
export function weekContextRule6(facts: {
  readonly daysBetweenWeekStartContestElectionDate: number;
}) {
  return Math.max(0, facts.daysBetweenWeekStartContestElectionDate);
}

/** Legacy line 458: staff.at(0) ?? null */
export function weekContextRule7(facts: {
  readonly staffAt0: string | undefined;
}) {
  return facts.staffAt0! ?? null;
}
