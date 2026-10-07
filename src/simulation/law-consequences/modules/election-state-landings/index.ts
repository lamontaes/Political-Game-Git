import landingProjection from "../../../../../data/law-consequences/election-state-landings.json" with { type: "json" };
import { lawInForce } from "../../../governing/law-in-force";
import { isLawEffectStamp } from "../../../law-effect-stamp";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import type { World } from "../../../types";

const projection = landingProjection.supported[0];
const EFFECT_KIND = "election.state-legislative-candidacy-intent";

interface StateLandingProjection {
  readonly questionKey: string;
  readonly sourceEventType: string;
  readonly sourceTag: string;
  readonly personSelector: "focus:subject";
  readonly landedFact: "actual-candidacy-blocked";
  readonly channel: "election-rule";
  readonly direction: "cost";
  readonly amount: null;
  readonly cadence: null;
}

function validatedProjection(): StateLandingProjection {
  if (
    landingProjection.schema !== "law-person-landing-projection/v1" ||
    !projection ||
    projection.questionKey !==
      "us-policy-positions:government-operations.legislative-term-limits" ||
    projection.sourceEventType !==
      "election.state-legislative-candidacy-intent" ||
    projection.sourceTag !== "barred:term-limit" ||
    projection.personSelector !== "focus:subject" ||
    projection.landedFact !== "actual-candidacy-blocked" ||
    projection.channel !== "election-rule" ||
    projection.direction !== "cost" ||
    projection.amount !== null ||
    projection.cadence !== null
  )
    throw new Error("Unsupported state election landing projection.");
  return projection as StateLandingProjection;
}

/**
 * Records the personal cost only after the existing turnover writer has
 * saved an actual barred candidacy-intent event for its named legislator.
 * This does not decide eligibility or candidacy; it exposes the recorded
 * consequence to the existing person-level law readers.
 */
export function applyStateElectionLawLandings(
  world: World,
  eventId: string,
): World {
  const row = validatedProjection();
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event)
    throw new Error("Election-law landing needs a saved source event.");
  if (
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate
  )
    return world;
  if (event.type !== row.sourceEventType || !event.tags.includes(row.sourceTag))
    return world;

  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      isLawEffectStamp(candidate) &&
      (candidate.effectKind === EFFECT_KIND ||
        candidate.effectKind === "institution-rule") &&
      candidate.questionKey === row.questionKey,
  );
  if (!stamp) return world;
  const people = event.participants.filter(
    (participant) =>
      participant.role === row.personSelector &&
      world.people[participant.personId],
  );
  if (people.length !== 1)
    throw new Error(
      "Election-law landing needs exactly one named legislator on the saved event.",
    );
  if (!event.involvedEntityIds.includes(people[0]!.personId))
    throw new Error(
      "Election-law landing needs the focus legislator among the event's involved people.",
    );

  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === row.questionKey,
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
    stableKey: `election-state-landings:${event.id}`,
    personId: people[0]!.personId,
    measureId: law.measureId,
    channel: row.channel,
    direction: row.direction,
    amount: row.amount,
    cadence: row.cadence,
    sourceRecordId: event.id,
    includeFamily: false,
  });
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
