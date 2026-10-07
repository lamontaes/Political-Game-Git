import { recordsByStringField } from "./history-index";
import { applyLawConsequences } from "./enacted-law-effects";
import { taxBaseOccurrenceSource } from "./tax-policy";
import { withStatutoryTaxLawAttributionBatch } from "./statutory-tax-law-attribution";
import type { EntityId, World } from "./types";

/** Runs only after the existing statutory writer has completed its records.
 * No new liability, taxable base, transfer or collection is created here.
 */
export function attributePaycheckTaxLaws(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  if (outcomeIds.length === 0) return world;
  return withStatutoryTaxLawAttributionBatch(world, (world) => {
    const paychecks = new Set(outcomeIds);
    const liabilities = (world.history.statutoryTaxLiabilities ?? []).filter(
      (row) => paychecks.has(row.sourceOutcomeId),
    );
    let next = world;
    const paymentSources = new Set<EntityId>();
    for (const liability of liabilities) {
      const source = taxBaseOccurrenceSource(next, liability.id);
      if (
        !source ||
        source.kind !== "statutory-liability" ||
        source.payer.kind !== "person"
      )
        continue;
      next = applyLawConsequences(next, {
        onDate: source.occurredAt,
        activity: "assessment",
        activityId: liability.id,
        subjectIds: [source.payer.personId],
      });
      for (const payment of recordsByStringField(
        world.history.statutoryTaxPayments ?? [],
        "liabilityId",
        liability.id,
      )) {
        paymentSources.add(payment.resourceOutcomeId);
      }
    }
    for (const activityId of paymentSources) {
      const source = taxBaseOccurrenceSource(next, activityId);
      if (
        !source ||
        source.kind !== "statutory-payment" ||
        source.payer.kind !== "person"
      )
        continue;
      next = applyLawConsequences(next, {
        onDate: source.occurredAt,
        activity: "payment",
        activityId,
        subjectIds: [source.payer.personId],
      });
    }
    return next;
  });
}
