// STOPGAP RULES3-CAM-015: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-life-activities.ts :: sharedCampaignLifeStart.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 1124: entry.presence === "remote"       ? LIFE.phoneStartMinute       : LIFE.inPersonStartMinute */
export function sharedCampaignLifeStartRule1(facts: {
  readonly entryPresence: string;
  readonly LIFEPhoneStartMinute: number;
  readonly LIFEInPersonStartMinute: number;
}) {
  return facts.entryPresence === "remote"
    ? facts.LIFEPhoneStartMinute
    : facts.LIFEInPersonStartMinute;
}

/** Legacy line 1127: offset < LIFE.requestWindowDays */
export function sharedCampaignLifeStartRule2(facts: {
  readonly offset: number;
  readonly LIFERequestWindowDays: number;
}) {
  return facts.offset < facts.LIFERequestWindowDays;
}

/** Legacy line 1127: offset += 1 */
export function sharedCampaignLifeStartRule3(facts: {
  readonly offset: number;
}) {
  return facts.offset + 1;
}

/** Legacy line 1132: entry.journeyKey === null         ? start         : addSimulationMinutes(start, -entry.journeyMinutes) */
export function sharedCampaignLifeStartRule4(facts: {
  readonly entryJourneyKey: string | null;
  readonly start: unknown;
  readonly addSimulationMinutesStartEntryJourneyMinutes: unknown;
}) {
  return facts.entryJourneyKey! === null
    ? facts.start
    : facts.addSimulationMinutesStartEntryJourneyMinutes;
}

/** Legacy line 1134: -entry.journeyMinutes */
export function sharedCampaignLifeStartRule5(facts: {
  readonly entryJourneyMinutes: number;
}) {
  return -facts.entryJourneyMinutes;
}
