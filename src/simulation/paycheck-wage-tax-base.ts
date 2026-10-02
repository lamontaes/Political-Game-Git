import { canonicalJson } from "./canonical-json";
import { recordById, recordsByStringField } from "./history-index";
import {
  recordTaxBase,
  recordedPaycheckTaxInput,
  taxBaseOccurrenceSource,
} from "./tax-policy";
import type { TaxBaseRecord } from "./tax-types";
import type { EntityId, World } from "./types";

/** CTO-approved gross wage identity; this supplies no tax rate or authority. */
export const WAGE_TAX_BASE_KEY = "tax-base:wages";

function basesForPaycheck(world: World, outcomeId: EntityId) {
  return recordsByStringField(
    world.history.statutoryTaxLiabilities ?? [],
    "sourceOutcomeId",
    outcomeId,
  ).flatMap((liability) =>
    recordsByStringField(
      world.history.taxBases ?? [],
      "sourceEventId",
      liability.id,
    ).filter((base) => base.baseKey === WAGE_TAX_BASE_KEY),
  );
}

function matchesSavedPaycheck(world: World, base: TaxBaseRecord): boolean {
  const source = taxBaseOccurrenceSource(world, base.sourceEventId);
  return (
    source?.kind === "statutory-liability" &&
    source.payer.kind === "person" &&
    base.baseKey === WAGE_TAX_BASE_KEY &&
    base.occurredAt === source.occurredAt &&
    base.recordedAt >= source.recordedAt &&
    base.recordedAt <= world.currentDate &&
    source.sequence < base.sequence &&
    base.sequence < world.history.nextSequence &&
    base.jurisdictionId === source.jurisdictionId &&
    canonicalJson(base.payer) === canonicalJson(source.payer) &&
    canonicalJson(base.amount) === canonicalJson(source.amount)
  );
}

/** All saved levies on the same paycheck share its single gross wage base.
 * This join is a source reference, not permission to impose any of those taxes.
 */
export function paycheckWageTaxBase(
  world: World,
  liabilityId: EntityId,
): TaxBaseRecord | null {
  const liability = recordById(
    world.history.statutoryTaxLiabilities ?? [],
    liabilityId,
  );
  if (!liability) return null;
  const input = recordedPaycheckTaxInput(world, liability.sourceOutcomeId);
  if (
    input.kind !== "recorded" ||
    !input.statutoryLiabilityIds.includes(liabilityId)
  )
    return null;
  const bases = basesForPaycheck(world, input.outcomeId);
  return bases.length === 1 && matchesSavedPaycheck(world, bases[0]!)
    ? bases[0]!
    : null;
}

/** Called after statutory withholding, before its existing law attribution.
 * Record gross actually transferred once; never assess, schedule or collect.
 */
export function recordPaycheckWageTaxBases(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  let next = world;
  for (const outcomeId of new Set(outcomeIds)) {
    const input = recordedPaycheckTaxInput(next, outcomeId);
    if (input.kind !== "recorded") continue;
    const existing = basesForPaycheck(next, outcomeId);
    if (existing.length > 0) {
      if (existing.length !== 1 || !matchesSavedPaycheck(next, existing[0]!))
        throw new Error(
          "The saved paycheck has an ambiguous or invalid wage base.",
        );
      continue;
    }
    // The first visible worker liability in saved order supplies the source
    // identity. Its siblings share this paycheck; no authority is selected here.
    const source = input.statutoryLiabilityIds
      .map((id) => taxBaseOccurrenceSource(next, id))
      .find(
        (row) =>
          row?.kind === "statutory-liability" &&
          row.payer.kind === "person" &&
          row.payer.personId === input.personId,
      );
    if (!source || source.kind !== "statutory-liability") continue;
    next = recordTaxBase(next, {
      stableKey: `paycheck-wage-base:${input.outcomeId}`,
      sourceEventId: source.liabilityRecord.id,
      baseKey: WAGE_TAX_BASE_KEY,
      jurisdictionId: source.jurisdictionId,
      payer: source.payer,
      occurredAt: source.occurredAt,
      amount: source.amount,
      assumptionNote:
        "Gross wages actually transferred on the saved paycheck. Existing statutory liabilities are its assessments; this base creates no tax or collection.",
    });
  }
  return next;
}
