import mappings from "../../../../../data/law-consequences/election-local-landings.json" with { type: "json" };
import { lawInForce } from "../../../governing/law-in-force";
import { recordLawExposure } from "../../../law-exposure";
import { isLawEffectStamp } from "../../../law-effect-stamp";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import type { EntityId, HistoricalEvent, World } from "../../../types";

type SupportedMapping = (typeof mappings.supported)[number];
const SUPPORTED_MAPPINGS: readonly SupportedMapping[] = mappings.supported;

/** There is no new kind: this module adds the actual writer projection only. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];

/**
 * Turn the existing, saved term-limit retirement event into the ordinary
 * person exposure record. This consumes its actual officeholder and law stamp;
 * it never chooses another candidate or infers a voter's behavior.
 */
export function applyLocalElectionLawLandings(
  world: World,
  eventId: EntityId,
): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) return world;
  const mapping = SUPPORTED_MAPPINGS.find(
    (candidate) =>
      candidate.sourceEventType === event.type &&
      event.tags.includes(candidate.sourceTag),
  );
  if (!mapping || !isSupportedEvent(event, world, mapping)) return world;

  const stamp = event.lawEffectStamps![0]!;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((candidate) => candidate.stableKey === mapping.questionKey);
  if (!proposition) return world;
  const law = lawInForce(
    world,
    event.jurisdictionId!,
    proposition.id,
    event.occurredAt,
  );
  if (
    !law ||
    law.answer !== "yes" ||
    law.measureId !== stamp.governingLawKey ||
    law.origin !== stamp.source ||
    law.operativeAt !== stamp.operativeAt
  )
    return world;
  const personIds = event.involvedEntityIds.filter(
    (id) => id !== event.jurisdictionId && Boolean(world.people[id]),
  );
  if (
    mapping.personSelector !== "sole-recorded-involved-person" ||
    mapping.landedFact !== "actual-candidacy-blocked" ||
    mapping.channel !== "election-rule" ||
    mapping.direction !== "cost" ||
    mapping.amount !== null ||
    mapping.cadence !== null ||
    personIds.length !== 1 ||
    event.recordedAt !== world.currentDate
  )
    return world;

  return recordLawExposure(world, {
    stableKey: `law-exposure:${event.id}:council-term-limit`,
    personId: personIds[0]!,
    measureId: stamp.governingLawKey,
    channel: mapping.channel,
    direction: mapping.direction,
    amount: mapping.amount,
    cadence: mapping.cadence,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

function isSupportedEvent(
  event: HistoricalEvent,
  world: World,
  mapping: SupportedMapping,
): boolean {
  if (
    event.type !== "local.officeholder-retired" ||
    !event.tags.includes("barred:term-limit") ||
    event.occurredAt !== world.currentDate ||
    !event.jurisdictionId ||
    event.lawEffectStamps?.length !== 1
  )
    return false;
  const [stamp] = event.lawEffectStamps;
  return Boolean(
    stamp &&
    isLawEffectStamp(stamp) &&
    (stamp.effectKind === "local.officeholder-retired" ||
      stamp.effectKind === "institution-rule") &&
    stamp.questionKey === mapping.questionKey &&
    stamp.jurisdictionId === event.jurisdictionId &&
    stamp.appliedAt === event.occurredAt &&
    stamp.source !== "standing-appropriation",
  );
}
