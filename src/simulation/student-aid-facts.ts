import { ageOnDate, makeIsoDate } from "./dates";
import { studyProgressSummary } from "./education-study-progression";
import { householdLoansOf } from "./household-loans";
import {
  activePartnershipsAt,
  educationEnrollmentStateAt,
  partnershipStateHistory,
} from "./life-queries";
import { loanBalanceComponentsAt } from "./resource-queries";
import { money } from "./resources";
import {
  financeRecordedStudentTuition,
  validateRecordedStudentFinancingInput,
} from "./student-debt";
import type { RecordedStudentFinancingInput } from "./student-debt";
import type { LifePathDefinition } from "./life-paths2-catalog";
import type { EntityId, World } from "./types";

const LIMITS_SOURCE =
  "https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2024-2025/vol8/ch4-annual-and-aggregate-loan-limits";
const SOURCE_AVAILABLE_BY = makeIsoDate("2025-05-30");

/** Representative published limits approved in CTO CHECK-IN 12; never awards. */
const LIMITS = {
  dependent: { annualUsd: [5_500, 6_500, 7_500], aggregateUsd: 31_000 },
  independent: { annualUsd: [9_500, 10_500, 12_500], aggregateUsd: 57_500 },
} as const;

/**
 * Read actual age, marriage and saved program progress. Missing exception facts
 * never become invented veterans or financial dependents. CTO CHECK-IN 13
 * explicitly directs the dependent default when no independent criterion exists.
 */
export function recordedStudentAidFacts(
  world: World,
  enrollmentId: EntityId,
  path: LifePathDefinition,
) {
  const enrollment = world.history.educationEnrollments.find(
    (record) => record.id === enrollmentId,
  );
  const person = enrollment && world.people[enrollment.personId];
  if (
    !enrollment ||
    !person ||
    enrollment.startedAt > world.currentDate ||
    educationEnrollmentStateAt(world, enrollment.id)?.status !== "active" ||
    world.currentDate < SOURCE_AVAILABLE_BY ||
    (path.program !== "postsecondary:bachelors-degree" &&
      path.program !== "postsecondary:public-administration-associate") ||
    (enrollment.programKind !== path.program &&
      enrollment.programKind !== "postsecondary:college")
  )
    return null;
  const progress = studyProgressSummary(world, enrollmentId, path);
  if (
    progress.model !== "periods" ||
    progress.completed >= progress.total ||
    !Number.isSafeInteger(progress.academicYear) ||
    progress.academicYear < 1
  )
    return null;
  const marriage = activePartnershipsAt(world, person.id).find(
    (record) => record.kind === "legal:marriage",
  );
  const adultIndependent = ageOnDate(person.birthDate, world.currentDate) >= 24;
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
        ? [marriage.id, partnershipStateHistory(world, marriage.id).at(-1)!.id]
        : []),
      ...world.history.events
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

/**
 * Constrain the existing supplied-input shortfall writer; never create an award,
 * repayment contract, lender or cash position. Unknown legacy principal refuses
 * extra financing instead of treating missing repayment allocation as zero.
 */
export function financeStudentTuitionWithSavedAidFacts(
  world: World,
  input: RecordedStudentFinancingInput,
  path: LifePathDefinition,
): World {
  validateRecordedStudentFinancingInput(world, input);
  const facts = recordedStudentAidFacts(world, input.enrollmentId, path);
  if (!facts) return world;
  if (input.annualLimit.currency !== facts.annualLimit.currency)
    throw new Error("Published undergraduate limits require USD tuition.");
  let annualOriginations = 0;
  let outstandingPrincipal = 0;
  for (const loan of householdLoansOf(world, {
    kind: "person",
    personId: facts.personId,
  })) {
    if (
      loan.terms.kind !== "student" ||
      loan.terms.lenderKind !== "federal-government"
    )
      continue;
    const components = loanBalanceComponentsAt(world, loan.obligation.id);
    if (!components) return world;
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
  // The existing writer subtracts this year's originations from its ceiling.
  // Add them here so aggregate remaining is not subtracted a second time.
  const ceiling = Math.min(
    input.annualLimit.minorUnits,
    facts.annualLimit.minorUnits,
    aggregateCeiling,
  );
  if (ceiling <= annualOriginations) return world;
  return financeRecordedStudentTuition(world, {
    ...input,
    annualLimit: money(ceiling, facts.annualLimit.currency),
    source: {
      ...input.source,
      reference: `${input.source.reference}; representative undergraduate limits ${facts.source}; ${facts.reason}; program year ${facts.academicYear}; actual source records ${facts.sourceRecordIds.join(", ")}`,
    },
  });
}
