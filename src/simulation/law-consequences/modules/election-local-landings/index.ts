import { COUNCIL_TERM_LIMIT_QUESTION } from "../../../living-world/local-council-term-limits";
import { lawInForce } from "../../../governing/law-in-force";
import { isLawEffectStamp } from "../../../law-effect-stamp";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import type { World } from "../../../types";

const SOURCE_EVENT_TYPE = "local.officeholder-retired";
const SOURCE_TAG = "barred:term-limit";

/**
 * Records the personal cost only after the local election writer has saved an
 * actual term-limit bar for its named council member. It does not decide
 * eligibility; it exposes the recorded consequence to the existing
 * person-level law readers.
 */
export function applyLocalElectionLawLandings(
  world: World,
  eventId: string,
): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event)
    throw new Error("Local election-law landing needs a saved source event.");
  if (
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate
  )
    return world;
  if (event.type !== SOURCE_EVENT_TYPE || !event.tags.includes(SOURCE_TAG))
    return world;

  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      isLawEffectStamp(candidate) &&
      candidate.questionKey === COUNCIL_TERM_LIMIT_QUESTION,
  );
  if (!stamp) return world;
  const people = event.participants.filter(
    (participant) =>
      participant.role === "focus:subject" &&
      world.people[participant.personId],
  );
  if (people.length !== 1)
    throw new Error(
      "Local election-law landing needs exactly one named council member on the saved event.",
    );
  if (!event.involvedEntityIds.includes(people[0]!.personId))
    throw new Error(
      "Local election-law landing needs the focus member among the event's involved people.",
    );

  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === COUNCIL_TERM_LIMIT_QUESTION,
  );
  if (!proposition) return world;
  const law = lawInForce(
    world,
    stamp.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  if (
    !law ||
    law.answer !== "yes" ||
    law.measureId !== stamp.governingLawKey ||
    law.origin !== stamp.source ||
    law.operativeAt !== stamp.operativeAt ||
    event.jurisdictionId !== stamp.jurisdictionId ||
    stamp.appliedAt !== event.occurredAt
  )
    return world;

  return recordLawExposure(world, {
    stableKey: `election-local-landings:${event.id}`,
    personId: people[0]!.personId,
    measureId: law.measureId,
    channel: "election-rule",
    direction: "cost",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
