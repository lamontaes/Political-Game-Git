import { lawInForce } from "../../../governing/law-in-force";
import { isLawEffectStamp } from "../../../law-effect-stamp";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import type { World } from "../../../types";

const QUESTION_KEY = "us-policy-positions:justice-public-safety.end-cash-bail";
const RELEASED_EVENT = "justice.released-before-trial";
const HELD_EVENT = "justice.held-before-trial";

/**
 * Records what the end-cash-bail law did to a named defendant, only after the
 * prosecution writer has saved the actual pretrial decision under that law.
 * Released without bail is a gain, held in jail a cost. It does not decide
 * release or detention; the judge's saved decision does.
 */
export function applyPretrialLawLandings(world: World, eventId: string): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) throw new Error("Pretrial landing needs a saved source event.");
  if (
    (event.type !== RELEASED_EVENT && event.type !== HELD_EVENT) ||
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate
  )
    return world;
  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      isLawEffectStamp(candidate) &&
      candidate.questionKey === QUESTION_KEY &&
      candidate.effectKind === event.type,
  );
  if (!stamp) return world;
  const defendants = event.participants.filter(
    (participant) =>
      participant.role === "focus:defendant" &&
      world.people[participant.personId],
  );
  if (defendants.length !== 1)
    throw new Error("Pretrial landing needs exactly one saved defendant.");
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === QUESTION_KEY,
  );
  if (!proposition) return world;
  const law = lawInForce(
    world,
    stamp.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  // Only where the law ended money bail did it reach this defendant.
  if (
    !law ||
    law.answer !== "yes" ||
    law.measureId !== stamp.governingLawKey ||
    law.origin !== stamp.source ||
    law.operativeAt !== stamp.operativeAt ||
    stamp.appliedAt !== event.occurredAt
  )
    return world;
  return recordLawExposure(world, {
    stableKey: `justice-pretrial-landings:${event.id}`,
    personId: defendants[0]!.personId,
    measureId: law.measureId,
    channel: "court-rule",
    direction: event.type === RELEASED_EVENT ? "gain" : "cost",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
