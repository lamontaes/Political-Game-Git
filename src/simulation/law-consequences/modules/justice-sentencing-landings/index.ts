import { lawInForce } from "../../../governing/law-in-force";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import { PROSECUTION_SENTENCED_EVENT } from "../../../justice/jail-terms";
import type { EntityId, World } from "../../../types";

const QUESTION_KEY =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";

/**
 * Records that the mandatory-minimum law bound the judge's sentence for a
 * named defendant, only after the prosecution writer has saved a jail
 * sentence the judge's decision says the law required. It does not set the
 * term; the saved decision and the court's own range do.
 */
export function applySentencingLawLandings(
  world: World,
  eventId: EntityId,
  boundByMeasureId: EntityId,
): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) throw new Error("Sentencing landing needs a saved source event.");
  if (
    event.type !== PROSECUTION_SENTENCED_EVENT ||
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate ||
    !event.jurisdictionId
  )
    return world;
  const defendants = event.participants.filter(
    (participant) =>
      participant.role === "focus:defendant" &&
      world.people[participant.personId],
  );
  if (defendants.length !== 1)
    throw new Error("Sentencing landing needs exactly one saved defendant.");
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === QUESTION_KEY,
  );
  if (!proposition) return world;
  const law = lawInForce(
    world,
    event.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  // Only where the law set the minimum did it reach this defendant.
  if (!law || law.answer !== "yes" || law.measureId !== boundByMeasureId)
    return world;
  return recordLawExposure(world, {
    stableKey: `justice-sentencing-landings:${event.id}`,
    personId: defendants[0]!.personId,
    measureId: law.measureId,
    channel: "sentence-rule",
    direction: "cost",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
