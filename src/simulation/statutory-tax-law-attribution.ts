import { canonicalJson } from "./canonical-json";
import { lawInForce } from "./governing/law-in-force";
import { recordById } from "./history-index";
import { lawEffectStamp } from "./law-effect-stamp";
import type {
  LawEffectStamp,
  LawEffectStampedRecord,
} from "./law-effect-stamp";
import type { ResolvedLawConsequence } from "./law-consequence-types";
import { taxBaseOccurrenceSource } from "./tax-policy";
import type { StatutoryTaxLiabilityRecord } from "./tax-types";
import type { EntityId, World } from "./types";

type AttributionFamily = "statutoryTaxLiabilities" | "statutoryTaxPayments";
interface AttributionBatch {
  readonly rows: Pick<World["history"], AttributionFamily>;
  readonly stamps: Record<AttributionFamily, Map<EntityId, LawEffectStamp[]>>;
}
let attributionBatch: AttributionBatch | undefined;

/** The completed paycheck pass only adds annotations. Keep its saved rows
 * available to every canonical resolver and copy each changed family once.
 * Nested passes over those same rows join the outer pass's stamp order.
 */
export function withStatutoryTaxLawAttributionBatch(
  world: World,
  run: (world: World) => World,
): World {
  const previous = attributionBatch;
  if (
    previous &&
    previous.rows.statutoryTaxLiabilities ===
      world.history.statutoryTaxLiabilities &&
    previous.rows.statutoryTaxPayments === world.history.statutoryTaxPayments
  )
    return run(world);
  const batch: AttributionBatch = {
    rows: {
      statutoryTaxLiabilities: world.history.statutoryTaxLiabilities,
      statutoryTaxPayments: world.history.statutoryTaxPayments,
    },
    stamps: {
      statutoryTaxLiabilities: new Map(),
      statutoryTaxPayments: new Map(),
    },
  };
  attributionBatch = batch;
  let next: World;
  try {
    next = run(world);
  } finally {
    attributionBatch = previous;
  }
  if (
    batch.stamps.statutoryTaxLiabilities.size === 0 &&
    batch.stamps.statutoryTaxPayments.size === 0
  )
    return next;
  return {
    ...next,
    history: {
      ...next.history,
      ...(batch.stamps.statutoryTaxLiabilities.size
        ? {
            statutoryTaxLiabilities: appendStamps(
              next.history.statutoryTaxLiabilities ?? [],
              batch.stamps.statutoryTaxLiabilities,
            ),
          }
        : {}),
      ...(batch.stamps.statutoryTaxPayments.size
        ? {
            statutoryTaxPayments: appendStamps(
              next.history.statutoryTaxPayments ?? [],
              batch.stamps.statutoryTaxPayments,
            ),
          }
        : {}),
    },
  };
}

/** Attribution only. The statutory writer has already assessed and paid this
 * occurrence. Generic TaxBase assessment must never run for this source.
 * Starting-law attribution requires the same exact saved levy/question join.
 */
export function appendStatutoryTaxLawAttribution(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (
    resolved.row.kind !== "tax" ||
    (resolved.row.when !== "assessment" && resolved.row.when !== "payment") ||
    resolved.row.onRepeal !== "preserve-completed" ||
    resolved.subject.kind !== "person" ||
    !world.people[resolved.subject.id] ||
    resolved.value.type !== "amount" ||
    resolved.value.unit !== "minor"
  )
    return world;
  const source = taxBaseOccurrenceSource(world, resolved.activityId);
  if (
    !source ||
    source.kind === "event" ||
    source.occurredAt !== resolved.effectiveAt ||
    source.jurisdictionId !== resolved.jurisdictionId ||
    source.payer.kind !== "person" ||
    source.payer.personId !== resolved.subject.id
  )
    return world;
  if (resolved.row.when === "assessment") {
    if (source.kind !== "statutory-liability") return world;
    const liability = source.liabilityRecord;
    if (
      !matchesLaw(world, resolved, liability) ||
      !matchesAmount(resolved, liability.liability) ||
      !source.sourceRecordIds.every((id) =>
        resolved.sourceRecordIds.includes(id),
      )
    )
      return world;
    const stamp = stampFor(resolved, source.sourceRecordIds);
    if (!stamp || hasStamp(world, "statutoryTaxLiabilities", liability, stamp))
      return world;
    return appendStamp(world, "statutoryTaxLiabilities", liability.id, stamp);
  }
  if (source.kind !== "statutory-payment") return world;
  // One transfer can pay income tax, FICA and premiums. A resolved allocation
  // must name its own saved payment AND liability; a transfer total is not its
  // levy amount. Ambiguous or absent selections authorize no stamp.
  const candidates = source.paymentRecords.filter((payment) => {
    const liability = recordById(source.liabilityRecords, payment.liabilityId);
    return (
      liability &&
      resolved.sourceRecordIds.includes(payment.id) &&
      resolved.sourceRecordIds.includes(liability.id) &&
      matchesLaw(world, resolved, liability) &&
      matchesAmount(resolved, payment.amount)
    );
  });
  if (candidates.length !== 1) return world;
  const payment = candidates[0]!;
  const liabilitySource = taxBaseOccurrenceSource(world, payment.liabilityId);
  if (
    !liabilitySource ||
    liabilitySource.kind !== "statutory-liability" ||
    source.flowRecord.recipient.kind !== "organization"
  )
    return world;
  const ids = [
    ...liabilitySource.sourceRecordIds,
    payment.id,
    source.transferRecord.id,
    source.flowRecord.id,
    source.flowRecord.recipient.organizationId,
  ];
  if (!ids.every((id) => resolved.sourceRecordIds.includes(id))) return world;
  const stamp = stampFor(resolved, ids);
  if (!stamp || hasStamp(world, "statutoryTaxPayments", payment, stamp))
    return world;
  return appendStamp(world, "statutoryTaxPayments", payment.id, stamp);
}

function matchesLaw(
  world: World,
  resolved: ResolvedLawConsequence,
  liability: StatutoryTaxLiabilityRecord,
): boolean {
  if (
    liability.payer.kind !== "person" ||
    liability.payer.personId !== resolved.subject.id ||
    !liability.lawMeasureIds?.includes(resolved.law.measureId) ||
    liability.liability === null ||
    (liability.status !== "assessed" && liability.status !== "not-imposed") ||
    liability.taxYear !== Number(liability.occurredAt.slice(0, 4))
  )
    return false;
  const binding = resolved.row.attributes;
  if (!binding || binding.level !== resolved.law.level) return false;
  if (binding.authority && binding.authority !== liability.authorityKey)
    return false;
  const taxKey = binding.taxKey.replaceAll(
    "{authority}",
    liability.authorityKey.toLowerCase(),
  );
  if (taxKey !== liability.taxKey) return false;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === resolved.questionKey,
  );
  if (!proposition) return false;
  // These existing wage schedules read January 1 of the saved tax year.
  // Repeal during that year cannot relabel its already assessed paycheck.
  const law = lawInForce(
    world,
    resolved.jurisdictionId,
    proposition.id,
    `${liability.taxYear}-01-01` as typeof liability.occurredAt,
  );
  return law !== null && canonicalJson(law) === canonicalJson(resolved.law);
}

function matchesAmount(
  resolved: ResolvedLawConsequence,
  amount: StatutoryTaxLiabilityRecord["liability"],
): boolean {
  return (
    amount !== null &&
    resolved.value.type === "amount" &&
    resolved.value.unit === "minor" &&
    resolved.value.value === amount.minorUnits &&
    resolved.value.currency === amount.currency
  );
}

function stampFor(resolved: ResolvedLawConsequence, ids: readonly EntityId[]) {
  return lawEffectStamp(resolved.law, {
    effectKind: "tax",
    questionKey: resolved.questionKey,
    jurisdictionId: resolved.jurisdictionId,
    appliedAt: resolved.effectiveAt,
    sourceRecordIds: [...new Set([...ids, resolved.law.measureId])],
  });
}

function hasStamp(
  world: World,
  family: AttributionFamily,
  row: { readonly id: EntityId },
  stamp: LawEffectStamp,
): boolean {
  const queued =
    attributionBatch?.rows[family] === world.history[family]
      ? attributionBatch?.stamps[family].get(row.id)
      : undefined;
  return [
    ...((row as LawEffectStampedRecord).lawEffectStamps ?? []),
    ...(queued ?? []),
  ].some(
    (prior) =>
      prior.governingLawKey === stamp.governingLawKey &&
      prior.questionKey === stamp.questionKey &&
      prior.effectKind === stamp.effectKind &&
      prior.jurisdictionId === stamp.jurisdictionId &&
      prior.appliedAt === stamp.appliedAt,
  );
}

function appendStamp(
  world: World,
  family: AttributionFamily,
  id: EntityId,
  stamp: LawEffectStamp,
): World {
  if (
    attributionBatch &&
    attributionBatch.rows[family] === world.history[family]
  ) {
    const stamps = attributionBatch.stamps[family];
    const queued = stamps.get(id);
    if (queued) queued.push(stamp);
    else stamps.set(id, [stamp]);
    return world;
  }
  return {
    ...world,
    history: {
      ...world.history,
      ...(family === "statutoryTaxLiabilities"
        ? {
            statutoryTaxLiabilities: appendStamps(
              world.history.statutoryTaxLiabilities ?? [],
              new Map([[id, [stamp]]]),
            ),
          }
        : {
            statutoryTaxPayments: appendStamps(
              world.history.statutoryTaxPayments ?? [],
              new Map([[id, [stamp]]]),
            ),
          }),
    },
  };
}

function appendStamps<T extends { readonly id: EntityId }>(
  rows: readonly T[],
  stamps: ReadonlyMap<EntityId, readonly LawEffectStamp[]>,
): T[] {
  return rows.map((row) => {
    const additions = stamps.get(row.id);
    return additions
      ? {
          ...row,
          lawEffectStamps: [
            ...((row as LawEffectStampedRecord).lawEffectStamps ?? []),
            ...additions,
          ],
        }
      : row;
  });
}
