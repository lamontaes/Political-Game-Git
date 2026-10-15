import { lawInForce } from "../../../governing/law-in-force";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import { PROSECUTION_SENTENCED_EVENT } from "../../../justice/jail-terms";
import {
  RESTORE_VOTING_QUESTION_KEY,
  VOTING_RIGHT_EVENT,
} from "../../../justice/voting-standing";
import type { EntityId, World } from "../../../types";

const QUESTION_KEY =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const STAND_YOUR_GROUND_QUESTION_KEY =
  "us-policy-positions:justice-public-safety.stand-your-ground";

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

/**
 * Lands the state's restore-voting law on the defendant whose vote a felony
 * sentence suspended: a benefit where the law returns the vote when the
 * sentence ends, a cost where it does not. Written once per saved voting-right
 * record, and only where a law answers for that jurisdiction.
 */
export function applyVotingRightLanding(
  world: World,
  voteEventId: EntityId,
): World {
  const event = world.history.events.find((row) => row.id === voteEventId);
  if (!event) throw new Error("Voting-right landing needs a saved record.");
  const personId = event.participants.find(
    (row) => row.role === "focus:defendant",
  )?.personId;
  if (
    event.type !== VOTING_RIGHT_EVENT ||
    event.recordedAt !== world.currentDate ||
    !event.jurisdictionId ||
    !personId ||
    !world.people[personId]
  )
    return world;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === RESTORE_VOTING_QUESTION_KEY,
  );
  if (!proposition) return world;
  const law = lawInForce(
    world,
    event.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  if (!law) return world;
  return recordLawExposure(world, {
    stableKey: `justice-voting-landings:${event.id}`,
    personId,
    measureId: law.measureId,
    channel: "voting-rule",
    direction: law.answer === "yes" ? "gain" : "cost",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/**
 * Records the stand-your-ground rule available to a named defendant in a
 * violent-force case. The record is the operative rule, not a finding that
 * the defendant used force or that the defense succeeds.
 */
export function applyStandYourGroundCaseLanding(
  world: World,
  chargeEventId: EntityId,
): World {
  const event = world.history.events.find((row) => row.id === chargeEventId);
  if (!event)
    throw new Error("Stand-your-ground landing needs a saved charge.");
  const offense = event.tags
    .find((tag) => tag.startsWith("justice.offense:"))
    ?.slice("justice.offense:".length);
  const personId = event.participants.find(
    (row) => row.role === "focus:defendant",
  )?.personId;
  if (
    event.type !== "justice.charged" ||
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate ||
    !event.jurisdictionId ||
    !personId ||
    !world.people[personId] ||
    (offense !== "crime:assault" && offense !== "crime:robbery")
  )
    return world;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === STAND_YOUR_GROUND_QUESTION_KEY,
  );
  if (!proposition) return world;
  const law = lawInForce(
    world,
    event.jurisdictionId,
    proposition.id,
    event.occurredAt,
  );
  if (!law) return world;
  return recordLawExposure(world, {
    stableKey: `justice-stand-your-ground:${event.id}`,
    personId,
    measureId: law.measureId,
    channel: "court-rule",
    direction: law.answer === "yes" ? "gain" : "cost",
    amount: null,
    cadence: null,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
