import { hasHouseholdResidenceInJurisdiction } from "../life-queries";
import { recordLawExposure } from "../law-exposure";
import type {
  EntityId,
  PublicProgramCapacityOutturnRecord,
  World,
} from "../types";

function lawFundedParkOutturn(
  world: World,
  outturn: PublicProgramCapacityOutturnRecord,
): { appropriationId: EntityId; lawKey: EntityId } | null {
  if (!outturn.programKey.startsWith("parks:")) return null;

  const records = world.history.publicProgramRecords ?? [];
  const commitment = records.find(
    (record) =>
      record.kind === "commitment" && record.id === outturn.commitmentId,
  );
  if (!commitment || commitment.kind !== "commitment") return null;
  const appropriation = records.find(
    (record) =>
      record.kind === "appropriation" &&
      record.id === commitment.appropriationId,
  );
  if (
    appropriation?.kind !== "appropriation" ||
    appropriation.jurisdictionId !== outturn.jurisdictionId ||
    !appropriation.sourceMeasureId
  )
    return null;
  return {
    appropriationId: appropriation.id,
    lawKey: appropriation.sourceMeasureId,
  };
}

/**
 * Record every law-linked parks capacity outturn on addresses in the service
 * jurisdiction. Zero and unknown changes preserve the cause record without
 * asserting a capacity change. Budget dollars alone never make an exposure.
 * The exposure cites the outturn; its idempotency key also carries the
 * appropriation and law identities.
 */
export function recordParksServiceAreaEffect(
  world: World,
  outturn: PublicProgramCapacityOutturnRecord,
  onlyPersonId?: EntityId,
): World {
  const source = lawFundedParkOutturn(world, outturn);
  if (!source) return world;

  const event = world.history.events.find((row) => row.id === outturn.eventId);
  if (!event || event.occurredAt !== world.currentDate) return world;
  const cutoff = {
    asOfDate: event.occurredAt,
    historySequenceExclusive: outturn.sequence,
  };

  let next = world;
  const people = onlyPersonId
    ? [onlyPersonId]
    : (Object.keys(world.people) as EntityId[]).sort();
  for (const personId of people) {
    if (
      !hasHouseholdResidenceInJurisdiction(
        world,
        personId,
        outturn.jurisdictionId,
        cutoff,
      )
    )
      continue;
    next = recordLawExposure(next, {
      stableKey: `${outturn.id}:${source.appropriationId}:${source.lawKey}:park-area:${personId}`,
      personId,
      measureId: source.lawKey,
      channel: "public-service",
      direction: "none",
      amount: null,
      cadence: null,
      sourceRecordId: outturn.id,
      includeFamily: false,
    });
  }
  return next;
}
