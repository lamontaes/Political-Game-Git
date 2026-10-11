// STOPGAP RULES3-GOV-083: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/office-salary.ts :: dueOfficePeriods.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 344: lastPeriod === undefined       ? 0       : Math.max(0, daysBetween(flow.startsAt, lastPeriod) / WEEK_DAYS + 1) */
export function dueOfficePeriodsRule1(facts: {
  readonly lastPeriod: string | undefined;
  readonly daysBetweenFlowStartsAtLastPeriod: number;
  readonly WEEK_DAYS: number;
}) {
  return facts.lastPeriod! === undefined
    ? 0
    : Math.max(
        0,
        facts.daysBetweenFlowStartsAtLastPeriod / facts.WEEK_DAYS + 1,
      );
}

/** Legacy line 348: Math.floor(     daysBetween(flow.startsAt, world.currentDate) / WEEK_DAYS,   ) */
export function dueOfficePeriodsRule2(facts: {
  readonly daysBetweenFlowStartsAtWorldCurrentDate: number;
  readonly WEEK_DAYS: number;
}) {
  return Math.floor(
    facts.daysBetweenFlowStartsAtWorldCurrentDate / facts.WEEK_DAYS,
  );
}

/** Legacy line 351: paidWeeks + 1 */
export function dueOfficePeriodsRule3(facts: { readonly paidWeeks: number }) {
  return facts.paidWeeks + 1;
}

/** Legacy line 351: week <= weeksDue */
export function dueOfficePeriodsRule4(facts: {
  readonly week: number;
  readonly weeksDue: number;
}) {
  return facts.week <= facts.weeksDue;
}

/** Legacy line 351: week += 1 */
export function dueOfficePeriodsRule5(facts: { readonly week: number }) {
  return facts.week + 1;
}

/** Legacy line 352: (week - 1) * WEEK_DAYS */
export function dueOfficePeriodsRule6(facts: {
  readonly week: number;
  readonly WEEK_DAYS: number;
}) {
  return (facts.week - 1) * facts.WEEK_DAYS;
}

/** Legacy line 353: week * WEEK_DAYS */
export function dueOfficePeriodsRule7(facts: {
  readonly week: number;
  readonly WEEK_DAYS: number;
}) {
  return facts.week * facts.WEEK_DAYS;
}

/** Legacy line 354: !isActiveOn(world, work.id, addDays(dueOn, -1)) */
export function dueOfficePeriodsRule8(facts: {
  readonly isActiveOnWorldWorkIdAddDaysDueOn1: boolean;
}) {
  return !facts.isActiveOnWorldWorkIdAddDaysDueOn1;
}

/** Legacy line 354: -1 */
export function dueOfficePeriodsRule9() {
  return -1;
}

/** Legacy line 356: !paidOfficeOf(world, work, {         asOfDate: periodStartsAt,         historySequenceExclusive: world.history.nextSequence,       }) */
export function dueOfficePeriodsRule10(facts: {
  readonly paidOfficeOfResult: unknown;
}) {
  return !facts.paidOfficeOfResult;
}

/** Legacy line 367: -1 */
export function dueOfficePeriodsRule11() {
  return -1;
}
