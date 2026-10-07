import { ageOnDate, makeIsoDate } from "./dates";
import { recordLawExposure } from "./law-exposure";
import { lawInForce } from "./governing/law-in-force";
import {
  livesInServiceArea,
  serviceAuthorityForCommitment,
} from "./public-service-requests";
import { publicProgramRecords } from "./public-program-integrity";
import { isPersonAliveAt } from "./vitality-integrity";
import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
} from "./life-queries";
import {
  isCountyServiceProgram,
  SERVICE_REQUEST_FORMS,
} from "./law-consequences/service-delivered-data";
import type {
  EntityId,
  IsoDate,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  World,
} from "./types";

/**
 * A resident's monthly receipt is recorded only in a place with an operating
 * installment paid to a provider under the service law. This records access
 * for residents of the served place (or enrolled eligible children) even when
 * no player activity was scheduled for them. Completed visits remain separate
 * service-delivery records.
 */
export function recordMonthlyServiceReceipts(
  world: World,
  onDate: IsoDate,
): World {
  const month = makeIsoDate(`${onDate.slice(0, 7)}-01`);
  const records = publicProgramRecords(world);
  const commitments = records.filter(
    (record): record is PublicProgramCommitmentRecord =>
      record.kind === "commitment",
  );
  const installments = records.filter(
    (record): record is PublicProgramInstallmentRecord =>
      record.kind === "installment" && record.status === "posted",
  );
  let next = world;
  for (const installment of installments) {
    if (
      !installment.resourceFlowId ||
      installment.recordedAt > onDate ||
      installment.recordedAt.slice(0, 7) !== month.slice(0, 7)
    )
      continue;
    const payment = world.history.resourceTransferOutcomes.find(
      (row) =>
        row.resourceFlowId === installment.resourceFlowId &&
        row.occurredAt <= onDate &&
        row.occurredAt.slice(0, 7) === month.slice(0, 7) &&
        (row.status === "completed" || row.status === "partial") &&
        row.transferredAmount.minorUnits > 0,
    );
    if (!payment) continue;
    const commitment = commitments.find(
      (row) => row.id === installment.commitmentId,
    );
    if (!commitment || !commitment.recipientOrganizationId) continue;
    const authority = serviceAuthorityForCommitment(world, commitment, onDate);
    if (!authority) continue;
    let measureId: EntityId | null;
    if (authority.kind === "law") {
      measureId = authority.law.measureId ?? null;
    } else if (isCountyServiceProgram(authority.appropriation.programKey)) {
      measureId = authority.appropriation.sourceMeasureId ?? null;
    } else {
      const law = lawInForce(
        world,
        commitment.jurisdictionId,
        authority.questionKey as EntityId,
        onDate,
      );
      measureId = law?.answer === "yes" ? law.measureId : null;
    }
    if (!measureId) continue;
    const form = SERVICE_REQUEST_FORMS[authority.questionKey];
    const childEligibility = form?.forChild;
    const lifeCutoff = currentLifeCutoff(world);
    const enrolledChildren = childEligibility
      ? new Set(
          Object.values(world.people)
            .filter((person) =>
              activeEducationEnrollmentsAt(world, person.id, lifeCutoff).some(
                ({ enrollment }) =>
                  enrollment.programKind === childEligibility.programKind &&
                  enrollment.organizationId ===
                    commitment.recipientOrganizationId,
              ),
            )
            .map((person) => person.id),
        )
      : null;
    const people = Object.values(world.people)
      .filter((person) => {
        if (
          !isPersonAliveAt(world, person.id, currentLifeCutoff(world)) ||
          !livesInServiceArea(
            world,
            person.id,
            commitment.jurisdictionId,
            commitment.programKey,
          )
        )
          return false;
        if (!childEligibility) return true;
        const age = ageOnDate(person.birthDate, onDate);
        return (
          age >= childEligibility.minimumAge &&
          age <= childEligibility.maximumAge &&
          enrolledChildren?.has(person.id) === true
        );
      })
      .map((person) => person.id)
      .sort();
    for (const personId of people) {
      const stableKey = `monthly-service-receipt:${measureId}:${month}:${personId}`;
      if (
        (next.history.lawExposures ?? []).some(
          (exposure) => exposure.stableKey === stableKey,
        )
      )
        continue;
      next = recordLawExposure(next, {
        stableKey,
        personId,
        measureId,
        channel: "public-service",
        direction: "gain",
        amount: null,
        cadence: null,
        sourceRecordId: payment.id,
        includeFamily: false,
      });
    }
  }
  return next;
}

export function monthlyServiceReceiptSource(
  world: World,
  measureId: EntityId,
  personId: EntityId,
  month: IsoDate,
) {
  const key = `monthly-service-receipt:${measureId}:${month}:${personId}`;
  return (world.history.lawExposures ?? []).find(
    (exposure) => exposure.stableKey === key,
  );
}
