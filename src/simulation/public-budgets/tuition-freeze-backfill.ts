import { currentMeasureProvisions } from "../legislative-politics";
import { operativeDateInWorld } from "../governing/law-in-force";
import { resourceFlowTermsAt } from "../resource-queries";
import { money } from "../resources";
import { recordWorldEvent } from "../world";
import {
  administrativeMandateText,
  assertPublicFundingMandate,
  settlePublicResourcePayment,
  type PublicFundingMandate,
} from "../public-fiscal";
import { TUITION_FREEZE_QUESTION } from "../law-consequences/tuition-freeze-row";
import type {
  EntityId,
  PublicProgramAppropriationRecord,
  World,
} from "../types";

/** Only an actual adopted backfill under this law supplies public authority. */
function backfillMandate(
  world: World,
  measureId: EntityId,
  jurisdictionId: EntityId,
): PublicFundingMandate | null {
  const records = (world.history.publicProgramRecords ?? []).filter(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" &&
      record.programKey === TUITION_FREEZE_QUESTION &&
      record.sourceMeasureId === measureId &&
      record.jurisdictionId === jurisdictionId &&
      record.availableFrom <= world.currentDate &&
      record.availableThrough >= world.currentDate,
  );
  if (records.length !== 1) return null;
  const appropriation = records[0]!;
  const enactment = world.history.legislativeEnactments?.find(
    (record) => record.measureId === measureId && record.outcome === "enacted",
  );
  const provisions = currentMeasureProvisions(world, measureId);
  const admin = provisions.find(
    (record) => record.provisionKey === "administrative-mandate",
  );
  const operative = enactment && operativeDateInWorld(world, enactment);
  if (
    !enactment ||
    !operative ||
    admin?.text !== administrativeMandateText(appropriation.programKey)
  )
    return null;
  const mandate: PublicFundingMandate = {
    version: "tuition-backfill/v1",
    fundingId: enactment.id,
    appropriationId: appropriation.id,
    measureId,
    jurisdictionId,
    provisionIds: provisions.map((record) => record.id).sort(),
    amount: appropriation.amount,
    availableAt: operative.date,
    endsAt: appropriation.availableThrough,
    administrativeEventId: enactment.outcomeEventId,
    programKey: appropriation.programKey,
  };
  try {
    assertPublicFundingMandate(world, mandate);
    return mandate;
  } catch {
    return null;
  }
}

/** Pays only the recorded price reduction after the study period is delivered. */
export function settleTuitionFreezeBackfill(
  world: World,
  tuitionFlowId: EntityId,
): World {
  const flow = world.history.resourceFlows.find(
    (record) => record.id === tuitionFlowId,
  );
  if (
    !flow ||
    flow.basisKind !== "obligation:tuition" ||
    flow.recipient.kind !== "organization"
  )
    return world;
  const terms = resourceFlowTermsAt(world, flow.id);
  const stamp = terms?.lawEffectStamps?.find(
    (record) =>
      record.effectKind === "price-cost" &&
      record.questionKey === TUITION_FREEZE_QUESTION,
  );
  const prior =
    terms?.supersedesTermsId &&
    world.history.resourceFlowTerms.find(
      (record) => record.id === terms.supersedesTermsId,
    );
  if (
    !terms ||
    !stamp ||
    !prior ||
    prior.amount.currency !== terms.amount.currency
  )
    return world;
  const difference = prior.amount.minorUnits - terms.amount.minorUnits;
  if (difference <= 0) return world;
  const mandate = backfillMandate(
    world,
    stamp.governingLawKey,
    stamp.jurisdictionId,
  );
  if (!mandate) return world; // No recorded backfill: the school receives the capped tuition only.
  const result = settlePublicResourcePayment(
    world,
    {
      fundingId: mandate.fundingId,
      measureId: mandate.measureId,
      expectedProvisionIds: mandate.provisionIds,
      operationKey: `tuition-backfill:${flow.id}:${terms.id}`,
      requestedAmount: money(difference, terms.amount.currency),
      recipient: flow.recipient,
    },
    (_world, measureId) => {
      const current = backfillMandate(_world, measureId, stamp.jurisdictionId);
      return current
        ? { kind: "available", mandate: current }
        : {
            kind: "unavailable",
            reason:
              "The recorded tuition backfill authority is no longer available.",
          };
    },
  );
  if (result.kind === "paid") return result.world;
  const key = `education:tuition-backfill-pending:${flow.id}:${terms.id}`;
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  return recordWorldEvent(world, {
    stableKey: key,
    type: "education.tuition-backfill-pending",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: stamp.jurisdictionId,
    involvedEntityIds: [
      flow.id,
      terms.id,
      flow.recipient.organizationId,
      mandate.appropriationId!,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["education"],
    summary: `The school's recorded tuition backfill remains unpaid: ${result.reason}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
