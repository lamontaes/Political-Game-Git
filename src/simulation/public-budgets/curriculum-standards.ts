import {
  CURRICULUM_QUESTION,
  educationCivilLawTermsInForce,
} from "../education-civil-law-terms";
import {
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import type { PublicBudgetGovernment } from "./store";

/**
 * Read the governing law and the actual pupils behind a curriculum purchase.
 * A plain yes/no law still has a reading; absent purchase terms are a limit,
 * not evidence that curriculum authority or every other effect is inactive.
 */
export function curriculumAdoptionEffect(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
) {
  if (government.level !== "state") return null;
  const reading = educationCivilLawTermsInForce(
    world,
    government.lawJurisdictionId,
    CURRICULUM_QUESTION,
    month,
  );
  if (!reading) return null;
  // Count active, represented pupils once each from dated enrollment and school location.
  const pupils = new Map<
    EntityId,
    {
      personId: EntityId;
      enrollmentIds: EntityId[];
      organizationIds: EntityId[];
    }
  >();
  const enrollments = world.history.educationEnrollments
    .filter(
      (row) =>
        row.programKind.startsWith("schooling:") &&
        row.startedAt <= month &&
        (row.recordedAt === undefined || row.recordedAt <= month) &&
        row.sequence < world.history.nextSequence &&
        educationEnrollmentStateAt(world, row.id, {
          asOfDate: month,
          historySequenceExclusive: world.history.nextSequence,
        })?.status === "active",
    )
    .filter((row) => {
      const location = organizationProfileAt(world, row.organizationId, {
        asOfDate: month,
        historySequenceExclusive: world.history.nextSequence,
      })?.locationJurisdictionId;
      if (!location) return false;
      const stateKey =
        lifePlaceByJurisdictionId(location)?.stateJurisdictionKey ??
        (world.jurisdictions[location]
          ? stateKeyForJurisdiction(world.jurisdictions[location]!)
          : null);
      return stateKey === government.stateKey;
    });
  for (const row of enrollments) {
    const pupil = pupils.get(row.personId) ?? {
      personId: row.personId,
      enrollmentIds: [],
      organizationIds: [],
    };
    pupil.enrollmentIds.push(row.id);
    if (!pupil.organizationIds.includes(row.organizationId))
      pupil.organizationIds.push(row.organizationId);
    pupils.set(row.personId, pupil);
  }
  const recipients = [...pupils.values()];
  const result = { law: reading.law, month, recipients };
  const { materialsPerPupilCents, phaseInMonths } = reading.terms?.values ?? {};
  if (materialsPerPupilCents === undefined || !phaseInMonths)
    return {
      ...result,
      spendingDollars: null,
      limit: "No purchase amount and phase-in are filed in the governing law.",
    };
  const elapsed =
    (Number(month.slice(0, 4)) - Number(reading.law.operativeAt.slice(0, 4))) *
      12 +
    Number(month.slice(5, 7)) -
    Number(reading.law.operativeAt.slice(5, 7));

  return {
    ...result,
    spendingDollars:
      elapsed < 0 || elapsed >= phaseInMonths
        ? 0
        : Math.round(
            (recipients.length * materialsPerPupilCents) / 100 / phaseInMonths,
          ),
    limit: null,
  };
}

/** Existing budget settlement consumes only the filed purchase amount. */
export function curriculumAdoptionSpending(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
): number {
  return (
    curriculumAdoptionEffect(world, government, month)?.spendingDollars ?? 0
  );
}
