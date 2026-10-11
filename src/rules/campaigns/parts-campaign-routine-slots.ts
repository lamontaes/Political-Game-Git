// STOPGAP RULES3-CAM-025: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-routine.ts :: campaignRoutineSlots.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 301: !routine || routine.blocks.length === 0 */
export function campaignRoutineSlotsRule1(facts: {
  readonly routine: unknown;
  readonly routineBlocksLength: number;
}) {
  return !facts.routine || facts.routineBlocksLength === 0;
}

/** Legacy line 309: date <= until.date && date < electionDay */
export function campaignRoutineSlotsRule2(facts: {
  readonly date: string;
  readonly untilDate: string;
  readonly electionDay: string;
}) {
  return facts.date <= facts.untilDate && facts.date < facts.electionDay;
}

/** Legacy line 314: !block.weekdays.includes(weekday) */
export function campaignRoutineSlotsRule3(facts: {
  readonly blockWeekdaysIncludesWeekday: boolean;
}) {
  return !facts.blockWeekdaysIncludesWeekday;
}

/** Legacy line 320: compareSimulationMoments(start, from) < 0 */
export function campaignRoutineSlotsRule4(facts: {
  readonly compareSimulationMomentsStartFrom: number;
}) {
  return facts.compareSimulationMomentsStartFrom < 0;
}

/** Legacy line 321: compareSimulationMoments(start, until) >= 0 */
export function campaignRoutineSlotsRule5(facts: {
  readonly compareSimulationMomentsStartUntil: number;
}) {
  return facts.compareSimulationMomentsStartUntil >= 0;
}
