import { canonicalJson } from "./canonical-json";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "./federal-top-income-tax-law";
import { lawInForce } from "./governing/law-in-force";
import { recordById } from "./history-index";
import { lawEffectStamp } from "./law-effect-stamp";
import type {
  LawEffectStamp,
  LawEffectStampedRecord,
} from "./law-effect-stamp";
import type { ResolvedLawConsequence } from "./law-consequence-types";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "./state-income-tax-law";
import { FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import { taxBaseOccurrenceSource } from "./tax-policy";
import type { StatutoryTaxLiabilityRecord } from "./tax-types";
import type { EntityId, World } from "./types";

/** Attribution only. The statutory writer has already assessed and paid this
 * occurrence. Generic TaxBase assessment must never run for this source.
 * Starting-law levy/question bindings remain unsupported here.
 */
export function appendStatutoryTaxLawAttribution(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (
    resolved.row.kind !== "tax" ||
    (resolved.row.when !== "assessment" && resolved.row.when !== "payment") ||
    resolved.row.onRepeal !== "preserve-completed" ||
    resolved.law.origin !== "enacted" ||
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
    if (!stamp || hasStamp(liability, stamp)) return world;
    return {
      ...world,
      history: {
        ...world.history,
        statutoryTaxLiabilities: appendStamp(
          world.history.statutoryTaxLiabilities ?? [],
          liability.id,
          stamp,
        ),
      },
    };
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
  if (!stamp || hasStamp(payment, stamp)) return world;
  return {
    ...world,
    history: {
      ...world.history,
      statutoryTaxPayments: appendStamp(
        world.history.statutoryTaxPayments ?? [],
        payment.id,
        stamp,
      ),
    },
  };
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
  const federal = resolved.questionKey === RAISE_TOP_FEDERAL_RATE_QUESTION;
  const state =
    resolved.questionKey === ADOPT_STATE_INCOME_TAX_QUESTION ||
    resolved.questionKey === GRADUATED_STATE_INCOME_TAX_QUESTION;
  if (
    (!federal && !state) ||
    (federal &&
      (liability.authorityKey !== "US" ||
        liability.taxKey !== FEDERAL_INCOME_TAX_KEY ||
        resolved.law.level !== "federal-statute")) ||
    (state &&
      (liability.authorityKey === "US" ||
        liability.taxKey !==
          `${liability.authorityKey.toLowerCase()}:wage-income-tax` ||
        resolved.law.level !== "state-statute"))
  )
    return false;
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
    "enacted-only",
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

function hasStamp(row: object, stamp: LawEffectStamp): boolean {
  return ((row as LawEffectStampedRecord).lawEffectStamps ?? []).some(
    (prior) =>
      prior.governingLawKey === stamp.governingLawKey &&
      prior.questionKey === stamp.questionKey &&
      prior.effectKind === stamp.effectKind &&
      prior.jurisdictionId === stamp.jurisdictionId &&
      prior.appliedAt === stamp.appliedAt,
  );
}

function appendStamp<T extends { readonly id: EntityId }>(
  rows: readonly T[],
  id: EntityId,
  stamp: LawEffectStamp,
): T[] {
  return rows.map((row) =>
    row.id === id
      ? {
          ...row,
          lawEffectStamps: [
            ...((row as LawEffectStampedRecord).lawEffectStamps ?? []),
            stamp,
          ],
        }
      : row,
  );
}
