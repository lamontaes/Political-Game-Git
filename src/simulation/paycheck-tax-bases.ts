import { canonicalJson } from "./canonical-json";
import { applyLawConsequences } from "./enacted-law-effects";
import { recordsByStringField } from "./history-index";
import { FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import { recordTaxBase, taxBaseOccurrenceSource } from "./tax-policy";
import { withStatutoryTaxLawAttributionBatch } from "./statutory-tax-law-attribution";
import type { EntityId, World } from "./types";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "./world";

/** Record actual gross wages after the sole statutory assessment writer and
 * dispatch their saved wage-law consequences through the shared registry.
 * A saved liability is the occurrence, including historical catch-up pay.
 * These bases never create another assessment or collection.
 */
export function recordPaycheckTaxBases(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  let next = world;
  withWorldIntegrityDeferred(() => {
    for (const outcomeId of new Set(outcomeIds)) {
      for (const liability of recordsByStringField(
        world.history.statutoryTaxLiabilities ?? [],
        "sourceOutcomeId",
        outcomeId,
      )) {
        if (
          liability.taxKey !== FEDERAL_INCOME_TAX_KEY &&
          liability.taxKey !==
            `${liability.authorityKey.toLowerCase()}:wage-income-tax`
        )
          continue;
        const source = taxBaseOccurrenceSource(next, liability.id);
        if (
          !source ||
          source.kind !== "statutory-liability" ||
          source.payer.kind !== "person" ||
          source.amount.minorUnits <= 0
        )
          continue;
        const existing = recordsByStringField(
          next.history.taxBases ?? [],
          "sourceEventId",
          liability.id,
        )[0];
        if (existing) {
          if (
            existing.baseKey !== "tax-base:wages" ||
            existing.jurisdictionId !== source.jurisdictionId ||
            existing.occurredAt !== source.occurredAt ||
            canonicalJson(existing.payer) !== canonicalJson(source.payer) ||
            canonicalJson(existing.amount) !== canonicalJson(source.amount)
          )
            throw new Error(
              "The saved wage base conflicts with its liability.",
            );
          continue;
        }
        next = recordTaxBase(next, {
          stableKey: `recorded-paycheck-wages:${liability.id}`,
          sourceEventId: liability.id,
          jurisdictionId: source.jurisdictionId,
          payer: source.payer,
          occurredAt: source.occurredAt,
          amount: source.amount,
          baseKey: "tax-base:wages",
          assumptionNote:
            "Gross wages from the saved statutory wage-income liability; that liability remains the assessment.",
        });
      }
    }
  });
  next = withStatutoryTaxLawAttributionBatch(next, (initial) => {
    const paychecks = new Set(outcomeIds);
    const liabilities = (initial.history.statutoryTaxLiabilities ?? []).filter(
      (row) => paychecks.has(row.sourceOutcomeId),
    );
    let attributed = initial;
    const paymentSources = new Set<EntityId>();
    for (const liability of liabilities) {
      const source = taxBaseOccurrenceSource(attributed, liability.id);
      if (
        !source ||
        source.kind !== "statutory-liability" ||
        source.payer.kind !== "person"
      )
        continue;
      attributed = applyLawConsequences(attributed, {
        onDate: source.occurredAt,
        activity: "assessment",
        activityId: liability.id,
        subjectIds: [source.payer.personId],
      });
      for (const payment of recordsByStringField(
        initial.history.statutoryTaxPayments ?? [],
        "liabilityId",
        liability.id,
      ))
        paymentSources.add(payment.resourceOutcomeId);
    }
    for (const activityId of paymentSources) {
      const source = taxBaseOccurrenceSource(attributed, activityId);
      if (
        !source ||
        source.kind !== "statutory-payment" ||
        source.payer.kind !== "person"
      )
        continue;
      attributed = applyLawConsequences(attributed, {
        onDate: source.occurredAt,
        activity: "payment",
        activityId,
        subjectIds: [source.payer.personId],
      });
    }
    return attributed;
  });
  if (next !== world) assertWorldIntegrity(next);
  return next;
}
