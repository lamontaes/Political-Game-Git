/** KEEP published-limit and principal ceilings; the returned request is applied by the existing shortfall writer. */
import type { EntityId, IsoDate, World } from "../../simulation/types";
import type { LifePathDefinition } from "../../simulation/life-paths2-catalog";
import type { RecordedStudentFinancingInput } from "../../simulation/student-debt";
import type * as life from "../../simulation/life-queries";
import type { studyProgressSummary } from "../../simulation/education-study-progression";
import type { householdLoansOf } from "../../simulation/household-loans";
import type { loanBalanceComponentsAt } from "../../simulation/resource-queries";
import { ageOnDate } from "../offices/calendar";
import { money } from "./money-facts";
function makeIsoDate(value: string) {
  return value as IsoDate;
}
export interface StudentAidFacts {
  readonly onDate: IsoDate;
  readonly people: World["people"];
  readonly educationEnrollments: World["history"]["educationEnrollments"];
  readonly events: World["history"]["events"];
  readonly enrollmentStates: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.educationEnrollmentStateAt>
  >;
  readonly progress: ReadonlyMap<
    EntityId,
    ReturnType<typeof studyProgressSummary>
  >;
  readonly partnerships: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.activePartnershipsAt>
  >;
  readonly partnershipStates: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.partnershipStateHistory>
  >;
  readonly loans: ReadonlyMap<EntityId, ReturnType<typeof householdLoansOf>>;
  readonly loanComponents: ReadonlyMap<
    EntityId,
    ReturnType<typeof loanBalanceComponentsAt>
  >;
}
export function validateRecordedStudentFinancingInput(
  onDate: IsoDate,
  input: RecordedStudentFinancingInput,
): void {
  if (!input.source.reference.trim() || input.source.asOf > onDate)
    throw new Error("Student financing needs an available published source.");
  if (
    !Number.isSafeInteger(input.annualLimit.minorUnits) ||
    input.annualLimit.minorUnits <= 0
  )
    throw new Error(
      "Student financing needs a positive published annual limit.",
    );
  if (input.academicYearStartsAt > onDate || input.academicYearEndsAt < onDate)
    throw new Error(
      "Student financing needs the current academic-year window.",
    );
}
const LIMITS_SOURCE =
  "https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2024-2025/vol8/ch4-annual-and-aggregate-loan-limits";

const SOURCE_AVAILABLE_BY = makeIsoDate("2025-05-30");

// stopgapId: "laws.student-representative-limits"
const LIMITS = {
  dependent: { annualUsd: [5500, 6500, 7500], aggregateUsd: 31000 },
  independent: { annualUsd: [9500, 10500, 12500], aggregateUsd: 57500 },
} as const;

export function recordedStudentAidFacts(
  aid: StudentAidFacts,
  enrollmentId: EntityId,
  path: LifePathDefinition,
) {
  const enrollment = aid.educationEnrollments.find(
    (record) => record.id === enrollmentId,
  );
  const person = enrollment && aid.people[enrollment.personId];
  if (
    !enrollment ||
    !person ||
    enrollment.startedAt > aid.onDate ||
    aid.enrollmentStates.get(enrollment.id)?.status !== "active" ||
    aid.onDate < SOURCE_AVAILABLE_BY ||
    (path.program !== "postsecondary:bachelors-degree" &&
      path.program !== "postsecondary:public-administration-associate") ||
    (enrollment.programKind !== path.program &&
      enrollment.programKind !== "postsecondary:college")
  )
    return null;
  const progress = aid.progress.get(enrollmentId);
  if (!progress)
    throw new Error(`Missing study-progress receipt: ${enrollmentId}`);
  if (
    progress.model !== "periods" ||
    progress.completed >= progress.total ||
    !Number.isSafeInteger(progress.academicYear) ||
    progress.academicYear < 1
  )
    return null;
  const marriage = (aid.partnerships.get(person.id) ?? []).find(
    (record) => record.kind === "legal:marriage",
  );
  const adultIndependent = ageOnDate(person.birthDate, aid.onDate) >= 24;
  const dependency = adultIndependent || marriage ? "independent" : "dependent";
  const limits = LIMITS[dependency];
  const annualUsd = limits.annualUsd[Math.min(progress.academicYear, 3) - 1]!;
  return {
    personId: person.id,
    dependency,
    reason: adultIndependent
      ? "recorded-age-24-or-older"
      : marriage
        ? "recorded-active-marriage"
        : "cto-dependent-default-no-recorded-independent-criterion",
    academicYear: progress.academicYear,
    annualLimit: money(annualUsd * 100, "USD"),
    aggregatePrincipalLimit: money(limits.aggregateUsd * 100, "USD"),
    source: LIMITS_SOURCE,
    sourceRecordIds: [
      person.id,
      enrollment.id,
      ...(marriage
        ? [marriage.id, aid.partnershipStates.get(marriage.id)!.at(-1)!.id]
        : []),
      ...aid.events
        .filter(
          (event) =>
            (event.type === "life-paths2.study-period" ||
              event.type === "life-paths2.study-session") &&
            event.involvedEntityIds.includes(enrollmentId),
        )
        .map((event) => event.id),
    ],
    unsupportedExceptionFacts: ["financial-dependents", "veteran-status"],
  } as const;
}

export function financeStudentTuitionWithSavedAidFacts(
  aid: StudentAidFacts,
  input: RecordedStudentFinancingInput,
  path: LifePathDefinition,
): RecordedStudentFinancingInput | null {
  validateRecordedStudentFinancingInput(aid.onDate, input);
  const facts = recordedStudentAidFacts(aid, input.enrollmentId, path);
  if (!facts) return null;
  if (input.annualLimit.currency !== facts.annualLimit.currency)
    throw new Error("Published undergraduate limits require USD tuition.");
  let annualOriginations = 0;
  let outstandingPrincipal = 0;
  for (const loan of aid.loans.get(facts.personId) ?? []) {
    if (
      loan.terms.kind !== "student" ||
      loan.terms.lenderKind !== "federal-government"
    )
      continue;
    const components = aid.loanComponents.get(loan.obligation.id);
    if (!components) return null;
    if (components.principal.currency !== facts.annualLimit.currency)
      throw new Error(
        "Student principal and published limit currencies differ.",
      );
    outstandingPrincipal += components.principal.minorUnits;
    if (
      loan.obligation.establishedAt >= input.academicYearStartsAt &&
      loan.obligation.establishedAt <= input.academicYearEndsAt
    )
      annualOriginations += loan.obligation.principal!.minorUnits;
    if (
      !Number.isSafeInteger(outstandingPrincipal) ||
      !Number.isSafeInteger(annualOriginations)
    )
      throw new Error("Student borrowing exceeds exact arithmetic.");
  }
  const aggregateRemaining = Math.max(
    0,
    facts.aggregatePrincipalLimit.minorUnits - outstandingPrincipal,
  );
  const aggregateCeiling = annualOriginations + aggregateRemaining;
  if (!Number.isSafeInteger(aggregateCeiling))
    throw new Error("Student aggregate ceiling exceeds exact arithmetic.");
  const ceiling = Math.min(
    input.annualLimit.minorUnits,
    facts.annualLimit.minorUnits,
    aggregateCeiling,
  );
  if (ceiling <= annualOriginations) return null;
  return {
    ...input,
    annualLimit: money(ceiling, facts.annualLimit.currency),
    source: {
      ...input.source,
      reference: `${input.source.reference}; representative undergraduate limits ${facts.source}; ${facts.reason}; program year ${facts.academicYear}; actual source records ${facts.sourceRecordIds.join(", ")}`,
    },
  };
}
