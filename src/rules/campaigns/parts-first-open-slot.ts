// STOPGAP RULES3-CAM-039: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/filing-visit.ts :: firstOpenSlot.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 80: offset < SEARCH_DAYS */
export function firstOpenSlotRule1(facts: {
  readonly offset: number;
  readonly SEARCH_DAYS: number;
}) {
  return facts.offset < facts.SEARCH_DAYS;
}

/** Legacy line 80: offset += 1 */
export function firstOpenSlotRule2(facts: { readonly offset: number }) {
  return facts.offset + 1;
}

/** Legacy line 82: !HOURS.weekdays.includes(weekday(date)) */
export function firstOpenSlotRule3(facts: {
  readonly HOURSWeekdaysIncludesWeekdayDate: boolean;
}) {
  return !facts.HOURSWeekdaysIncludesWeekdayDate;
}

/** Legacy line 85: minute + VISIT_MINUTES <= HOURS.closeMinute */
export function firstOpenSlotRule4(facts: {
  readonly minute: number;
  readonly VISIT_MINUTES: number;
  readonly HOURSCloseMinute: number;
}) {
  return facts.minute + facts.VISIT_MINUTES <= facts.HOURSCloseMinute;
}

/** Legacy line 86: minute += SLOT_MINUTES */
export function firstOpenSlotRule5(facts: {
  readonly minute: number;
  readonly SLOT_MINUTES: number;
}) {
  return facts.minute + facts.SLOT_MINUTES;
}

/** Legacy line 89: -JOURNEY_MINUTES */
export function firstOpenSlotRule6(facts: {
  readonly JOURNEY_MINUTES: number;
}) {
  return -facts.JOURNEY_MINUTES;
}

/** Legacy line 90: compareSimulationMoments(leave, world.currentMoment) <= 0 */
export function firstOpenSlotRule7(facts: {
  readonly compareSimulationMomentsLeaveWorldCurrentMoment: number;
}) {
  return facts.compareSimulationMomentsLeaveWorldCurrentMoment <= 0;
}
