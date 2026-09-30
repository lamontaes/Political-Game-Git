import {
  CURRICULUM_QUESTION,
  policyTermsInForce,
} from "../governing/policy-bill-terms";
import {
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import type { IsoDate, World } from "../types";
import type { PublicBudgetGovernment } from "./store";

/** A newly enacted standards cycle purchases materials and teacher training over its filed phase-in. */
export function curriculumAdoptionSpending(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
): number {
  if (government.level !== "state") return 0;
  const reading = policyTermsInForce(
    world,
    government.lawJurisdictionId,
    CURRICULUM_QUESTION,
    month,
  );
  if (!reading?.terms) return 0;
  const { materialsPerPupilCents, phaseInMonths } = reading.terms.values;
  if (materialsPerPupilCents === undefined || !phaseInMonths) return 0;
  const elapsed =
    (Number(month.slice(0, 4)) - Number(reading.law.operativeAt.slice(0, 4))) *
      12 +
    Number(month.slice(5, 7)) -
    Number(reading.law.operativeAt.slice(5, 7));
  if (elapsed < 0 || elapsed >= phaseInMonths) return 0;
  // Count active, represented pupils once each from dated enrollment and school location.
  const pupils = new Set(
    world.history.educationEnrollments
      .filter(
        (row) =>
          row.programKind.startsWith("schooling:") &&
          row.startedAt <= month &&
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
      })
      .map((row) => row.personId),
  ).size;
  return Math.round((pupils * materialsPerPupilCents) / 100 / phaseInMonths);
}
