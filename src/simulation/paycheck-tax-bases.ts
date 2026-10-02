import { canonicalJson } from "./canonical-json";
import { recordsByStringField } from "./history-index";
import { FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import { recordTaxBase, taxBaseOccurrenceSource } from "./tax-policy";
import type { EntityId, World } from "./types";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "./world";

/** Record actual gross wages after the sole statutory assessment writer.
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
  if (next !== world) assertWorldIntegrity(next);
  return next;
}
