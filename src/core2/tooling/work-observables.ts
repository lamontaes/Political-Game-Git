/** Developer-only dated observables. No target values enter the life chooser. */
import {
  addDays,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import reference from "../data/time-use-reference.json" with { type: "json" };
import configJson from "./work-observables.json" with { type: "json" };
import { parameter, PARAMETERS, type Parameter } from "../parameters";
import type { CoreInput, CoreState } from "../types";
import { externalFlowObservables } from "./external-flow-observables";

export interface ExposureAgeRow {
  id: string;
  runtimeAgeId: string;
  minimumAgeParameter: string;
  maximumAgeParameter?: string;
  referenceCohort?: string;
}
export interface WorkObservableConfig {
  version: string;
  classification: string;
  ageRows: readonly ExposureAgeRow[];
  paidWorkRuntimeCategory: string;
  referenceWorkCategory: string;
  referenceFile: string;
  referenceSource: string;
  populationScope: string;
  crosswalkStatus: string;
  gaps: readonly string[];
}
export const WORK_OBSERVABLE_CONFIG: WorkObservableConfig = configJson;

type ResidentBirth = Pick<CoreInput["people"][number], "id" | "birthDate">;
export interface DiaryExposure {
  startExclusive: string;
  throughInclusive: string;
  simulatedDays: number;
  residentCount: number;
  residentDiaryDays: number;
  byAge: readonly {
    ageId: string;
    runtimeAgeId: string;
    residentDiaryDays: number;
    referenceCohort?: string;
  }[];
}

/**
 * Exact fixed-roster denominator. Each birthday partitions an inclusive dated
 * age interval. Nonworkers and non-activated residents contribute every day.
 * One roster scan with fixed age rows, never a per-person daily scan or tick.
 */
export function rosterDiaryExposure(
  residents: readonly ResidentBirth[],
  startExclusive: string,
  throughInclusive: string,
  rows: readonly ExposureAgeRow[] = WORK_OBSERVABLE_CONFIG.ageRows,
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): DiaryExposure {
  const p = (key: string) => parameter(key, registry),
    zero = p("zero"),
    one = p("one");
  const start = makeIsoDate(startExclusive),
    through = makeIsoDate(throughInclusive);
  const days = daysBetween(start, through);
  if (days < zero) throw new Error("Exposure cannot move backward.");
  const sorted = [...rows].sort(
    (a, b) => p(a.minimumAgeParameter) - p(b.minimumAgeParameter),
  );
  const ids = new Set<string>(),
    runtimeIds = new Set<string>();
  let nextMinimum = zero;
  for (const [index, row] of sorted.entries()) {
    const minimum = p(row.minimumAgeParameter),
      maximum = row.maximumAgeParameter
        ? p(row.maximumAgeParameter)
        : undefined;
    if (
      ids.has(row.id) ||
      runtimeIds.has(row.runtimeAgeId) ||
      !row.runtimeAgeId ||
      !Number.isSafeInteger(minimum) ||
      minimum !== nextMinimum ||
      (maximum !== undefined &&
        (!Number.isSafeInteger(maximum) || maximum <= minimum)) ||
      (maximum === undefined && index !== sorted.length - one)
    )
      throw new Error(
        "Exposure age rows must uniquely cover all nonnegative ages.",
      );
    ids.add(row.id);
    runtimeIds.add(row.runtimeAgeId);
    nextMinimum = maximum ?? minimum;
  }
  if (!sorted.length || sorted.at(-one)!.maximumAgeParameter !== undefined)
    throw new Error("Exposure requires an open final age interval.");
  const first = addDays(start, one),
    counts = new Map(sorted.map((row) => [row.id, zero]));
  const people = new Set<string>();
  for (const resident of residents) {
    if (people.has(resident.id))
      throw new Error("Exposure resident IDs must be unique.");
    people.add(resident.id);
    const birth = makeIsoDate(resident.birthDate);
    if (birth > start)
      throw new Error(
        "Birth after roster opening needs a dated admission stream.",
      );
    for (const row of sorted) {
      const eligible = dateAtAge(birth, p(row.minimumAgeParameter));
      const from = eligible > first ? eligible : first;
      const next = row.maximumAgeParameter
        ? dateAtAge(birth, p(row.maximumAgeParameter))
        : undefined;
      const until = next && next <= through ? addDays(next, -one) : through;
      if (until >= from)
        counts.set(
          row.id,
          counts.get(row.id)! + daysBetween(from, until) + one,
        );
    }
  }
  const residentDiaryDays = residents.length * days;
  if (
    !Number.isSafeInteger(residentDiaryDays) ||
    [...counts.values()].reduce((sum, value) => sum + value, zero) !==
      residentDiaryDays
  )
    throw new Error("Dated exposure does not conserve resident diary days.");
  return {
    startExclusive: start,
    throughInclusive: through,
    simulatedDays: days,
    residentCount: residents.length,
    residentDiaryDays,
    byAge: sorted.map((row) => ({
      ageId: row.id,
      runtimeAgeId: row.runtimeAgeId,
      residentDiaryDays: counts.get(row.id)!,
      referenceCohort: row.referenceCohort,
    })),
  };
}

function fixedRoster(input: CoreInput, core: CoreState): void {
  if (
    input.startedAt !== core.startedAt ||
    input.people.length !== core.people.size
  )
    throw new Error(
      "Changed resident roster needs dated exposure admission/removal records.",
    );
  for (const initial of input.people) {
    const current = core.people.get(initial.id);
    if (
      !current?.alive ||
      current.birthDate !== initial.birthDate ||
      current.placeId !== initial.placeId ||
      current.countyId !== initial.countyId
    )
      throw new Error(
        "Changed birth, life or residency facts need a dated exposure stream.",
      );
  }
}

/** Normalize only the complete measured window; its numerator is cumulative. */
export function summarizeWorkObservables(
  input: CoreInput,
  core: CoreState,
  config: WorkObservableConfig = WORK_OBSERVABLE_CONFIG,
) {
  fixedRoster(input, core);
  const p = (key: string) => parameter(key, core.data.parameters),
    zero = p("zero"),
    one = p("one");
  const exposure = rosterDiaryExposure(
    input.people,
    input.startedAt,
    core.date,
    config.ageRows,
    core.data.parameters,
  );
  const ageIds = new Set(config.ageRows.map((row) => row.runtimeAgeId));
  if (
    core.data.work?.activityAgeRows.some(
      (row) =>
        !config.ageRows.some(
          (configRow) =>
            row.id === configRow.runtimeAgeId &&
            p(row.minimumAgeParameter) === p(configRow.minimumAgeParameter) &&
            (row.maximumAgeParameter
              ? p(row.maximumAgeParameter)
              : undefined) ===
              (configRow.maximumAgeParameter
                ? p(configRow.maximumAgeParameter)
                : undefined),
        ),
    )
  )
    throw new Error(
      "Measured time bins do not match the supplied dated exposure crosswalk.",
    );
  const minutes = new Map<string, Map<string, number>>();
  for (const total of core.work.primaryTimeTotals.values()) {
    if (
      !ageIds.has(total.ageReferenceId) ||
      !Number.isFinite(total.minutes) ||
      total.minutes < zero
    )
      throw new Error("Activity time has no valid exposure bin.");
    const categories =
      minutes.get(total.ageReferenceId) ?? new Map<string, number>();
    categories.set(
      total.category,
      (categories.get(total.category) ?? zero) + total.minutes,
    );
    minutes.set(total.ageReferenceId, categories);
  }
  const byAge = exposure.byAge.map((row) => {
    const categories =
      minutes.get(row.runtimeAgeId) ?? new Map<string, number>();
    const paidWorkMinutes =
      categories.get(config.paidWorkRuntimeCategory) ?? zero;
    const observed = row.referenceCohort
      ? reference.rows.find(
          (candidate) => candidate.cohort === row.referenceCohort,
        )
      : undefined;
    const referenceValues: Readonly<
      Record<string, { raw: string; value?: number | null }>
    > = observed?.hoursPerDiaryDay ?? {};
    const referenceValue =
      referenceValues[config.referenceWorkCategory]?.value ?? undefined;
    const paidWorkHoursPerResidentDiaryDay =
      core.data.work && row.residentDiaryDays > zero
        ? paidWorkMinutes / p("minutesPerHour") / row.residentDiaryDays
        : null;
    if (
      row.residentDiaryDays === zero &&
      [...categories.values()].some((value) => value > zero)
    )
      throw new Error("Activity minutes exist without resident exposure.");
    return {
      ...row,
      paidWorkMinutes,
      paidWorkHoursPerResidentDiaryDay,
      primaryCategoryMinutes: Object.fromEntries(
        [...categories].sort(([a], [b]) => a.localeCompare(b)),
      ),
      primaryCategoryHoursPerResidentDiaryDay: Object.fromEntries(
        [...categories]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, value]) => [
            id,
            row.residentDiaryDays > zero
              ? value / p("minutesPerHour") / row.residentDiaryDays
              : null,
          ]),
      ),
      atusWorkAndWorkRelatedHoursPerDiaryDay: referenceValue ?? null,
      contextualDifferenceHours:
        paidWorkHoursPerResidentDiaryDay !== null &&
        referenceValue !== undefined
          ? paidWorkHoursPerResidentDiaryDay - referenceValue
          : null,
      comparisonStatus: !core.data.work
        ? "scheduled-work-observable-disabled; legacy discretionary paid-work duration is uninstrumented"
        : referenceValue === undefined
          ? "no-reference-for-bin"
          : config.crosswalkStatus,
    };
  });
  let plannedMinutes = zero,
    attendedMinutes = zero,
    requestedMinor = zero,
    paidMinor = zero,
    attendedDatedSegments = zero,
    absentDatedSegments = zero;
  for (const total of core.work.totalsByJob.values()) {
    plannedMinutes += total.plannedMinutes;
    attendedMinutes += total.attendedMinutes;
    requestedMinor += total.requestedMinor;
    paidMinor += total.paidMinor;
    attendedDatedSegments += total.workedDays;
    absentDatedSegments += total.missedDays;
  }
  const attendanceId = core.data.work?.attendanceAction.id,
    absenceId = core.data.work?.absenceAction.id;
  const actCounts = (id: string | undefined) =>
    id
      ? [...core.people.values()].reduce(
          (sum, actor) => sum + (actor.actsByKind.get(id) ?? zero),
          zero,
        )
      : zero;
  if (
    attendedDatedSegments !== actCounts(attendanceId) ||
    absentDatedSegments !== actCounts(absenceId)
  )
    throw new Error(
      "Dated work segment receipts disagree with committed action counters.",
    );
  const sourceMinutes = byAge.reduce(
    (sum, row) => sum + row.paidWorkMinutes,
    zero,
  );
  // Different aggregation partitions can differ only at floating arithmetic precision.
  const sourceHours = sourceMinutes / p("minutesPerHour"),
    receiptHours = attendedMinutes / p("minutesPerHour");
  const workMinuteAggregationDifference = sourceMinutes - attendedMinutes;
  const openingCashMinor =
    input.people.reduce((sum, row) => sum + row.liquidMinor, zero) +
    input.organizations.reduce((sum, row) => sum + row.liquidMinor, zero);
  const currentCashMinor = [
    ...core.people.values(),
    ...core.organizations.values(),
  ].reduce((sum, row) => sum + row.liquidMinor, zero);
  const externalFlows = externalFlowObservables(core);
  const cashAndExternalFlowsDeltaMinor = Number(
    BigInt(currentCashMinor) -
      BigInt(openingCashMinor) +
      BigInt(externalFlows.netMinor),
  );
  if (
    ![
      openingCashMinor,
      currentCashMinor,
      cashAndExternalFlowsDeltaMinor,
      requestedMinor,
      paidMinor,
      requestedMinor - paidMinor,
    ].every(Number.isSafeInteger)
  )
    throw new Error("Measured money totals overflow minor units.");
  let latestCashReceiptFailures = zero;
  for (const row of core.work.lastResultByJob.values()) {
    const directOutside = row.publicPayDue?.ownerId === row.organizationId;
    const payerValid = directOutside
      ? row.payerCashBeforeMinor === zero &&
        row.payerCashAfterMinor === zero &&
        row.publicPayDue!.amountMinor === row.paidMinor &&
        core.organizations.get(row.organizationId)?.outsideFlow !== undefined
      : row.payerCashBeforeMinor - row.payerCashAfterMinor === row.paidMinor;
    if (
      !payerValid ||
      row.payeeCashAfterMinor - row.payeeCashBeforeMinor !== row.paidMinor ||
      row.requestedMinor - row.paidMinor !== row.shortfallMinor
    )
      latestCashReceiptFailures += one;
  }
  return {
    schema: config.version,
    enabled: core.data.work !== undefined,
    exposure,
    calendar: {
      unit: "dated calendar segment/diary participation; never whole-shift completion",
      plannedDatedSegments: attendedDatedSegments + absentDatedSegments,
      attendedDatedSegments,
      absentDatedSegments,
      plannedMinutes,
      attendedMinutes,
      absentMinutesDerived: plannedMinutes - attendedMinutes,
      workMinuteAggregationDifference,
      sourceHours,
      receiptHours,
    },
    money: {
      requestedMinor,
      paidMinor,
      shortfallMinor: requestedMinor - paidMinor,
      openingCashMinor,
      currentCashMinor,
      closedMoneyDeltaMinor: currentCashMinor - openingCashMinor,
      closedMoneyConserved: currentCashMinor === openingCashMinor,
      externalFlows,
      cashAndExternalFlowsDeltaMinor,
      cashAndExternalFlowsConserved: cashAndExternalFlowsDeltaMinor === zero,
      latestCashReceiptFailures,
      scope:
        "Actual liquid minor units across initialized residents and organizations; original opening sources are estimates. Requested minus paid is arithmetic unpaid amount, not a manufactured event or legal arrears determination.",
    },
    byAge,
    reference: {
      tag: reference.tag,
      source: reference.source,
      title: reference.title,
      retrievedAt: reference.retrievedAt,
      sha256: reference.sha256,
      denominator: reference.denominator,
      spreadLimit: reference.spreadLimit,
    },
    exposureScope: config.populationScope,
    comparisonStatus: config.crosswalkStatus,
    coefficientCalibration: "not-inferred",
    limitations: [...config.gaps],
  };
}
export type WorkObservableSummary = ReturnType<typeof summarizeWorkObservables>;
