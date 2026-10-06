import { lawInForce } from "../../../governing/law-in-force";
import { isLawEffectStamp } from "../../../law-effect-stamp";
import { recordLawExposure } from "../../../law-exposure";
import type { AnyLawConsequenceKindRegistration } from "../../../law-consequence-types";
import type { World } from "../../../types";

const QUESTION_KEY =
  "us-policy-positions:government-operations.independent-ward-commission";
const SOURCE_EVENT_TYPE = "local.wards-drawn";
const PAIRED_TAG_PREFIX = "paired:";

/**
 * Records the personal effect of a drawn district map only after the town
 * ward writer has saved the map event under the governing commission law. Each
 * sitting member the saved map pairs with another member in one district gets
 * a nonmoney "changed eligibility" exposure. This does not decide who may run
 * or who wins; it exposes the recorded consequence to the person-level law
 * readers.
 */
export function applyWardCommissionLandings(
  world: World,
  eventId: string,
): World {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event) throw new Error("Ward-map landing needs a saved source event.");
  if (
    event.type !== SOURCE_EVENT_TYPE ||
    event.recordedAt !== world.currentDate ||
    event.occurredAt > world.currentDate
  )
    return world;
  const stamp = event.lawEffectStamps?.find(
    (candidate) =>
      isLawEffectStamp(candidate) && candidate.questionKey === QUESTION_KEY,
  );
  if (!stamp) return world;
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

  const pairedTag = event.tags.find((tag) => tag.startsWith(PAIRED_TAG_PREFIX));
  const paired = (pairedTag?.slice(PAIRED_TAG_PREFIX.length) ?? "")
    .split(",")
    .filter(
      (id) => id.length > 0 && event.involvedEntityIds.includes(id as never),
    );
  let next = world;
  for (const personId of paired) {
    if (!next.people[personId as never]) continue;
    next = recordLawExposure(next, {
      stableKey: `election-ward-landings:${event.id}:${personId}`,
      personId: personId as never,
      measureId: law.measureId,
      channel: "election-rule",
      direction: "none",
      amount: null,
      cadence: null,
      sourceRecordId: event.id,
      includeFamily: false,
    });
  }
  return next;
}

/** This module adds no consequence kind; it reuses the canonical exposure writer. */
export const registrations: readonly AnyLawConsequenceKindRegistration[] = [];
