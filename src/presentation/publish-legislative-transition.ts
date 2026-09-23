import { applyNewlyEnactedLawEffects } from "../simulation/enacted-law-effects";
import { advanceWithWorldIntegrityAtEnd } from "../simulation/world";
import { publishPublicEvent } from "../simulation/public-information";
import { resolvePublicationSource } from "../simulation/public-information-integrity";
import type { World } from "../simulation";

/**
 * The normal legislative action boundary publishes its newly completed public
 * proceedings. Opening a docket, reading News, loading a save, and pre-existing
 * history never enter this transition. Other public events need their own
 * producer contract; being a public record alone is not a broadcast.
 */
export function publishLegislativeTransition(
  before: World,
  after: World,
): World {
  if (before === after) return after;
  // One whole-World check for every proceeding published here, not one each.
  return advanceWithWorldIntegrityAtEnd(() =>
    publishNewProceedings(before, after),
  );
}

function publishNewProceedings(before: World, after: World): World {
  const existing = new Set(
    (before.history.legislativeActions ?? []).map((action) => action.id),
  );
  // A newly enacted law changes the records it governs (a tax policy,
  // spending authority) before its proceedings are published.
  let next = applyNewlyEnactedLawEffects(before, after);
  for (const action of after.history.legislativeActions ?? []) {
    if (existing.has(action.id)) continue;
    const event = next.history.events.find(
      (candidate) => candidate.id === action.eventId,
    );
    if (
      !event ||
      event.occurredAt > next.currentDate ||
      !resolvePublicationSource(next, event)
    )
      continue;
    if (
      (next.history.publications ?? []).some(
        (record) => record.sourceEventId === event.id,
      )
    )
      continue;
    // Dated the day it happened, not the day the transition ends: one
    // advance can cover months of sittings, and a story stamped with the last
    // day would put a bill's House vote, its trip to the Senate and its
    // arrival on the President's desk all on one date.
    next = publishPublicEvent(next, {
      stableKey: `legislative-proceeding:${action.id}`,
      sourceEventId: event.id,
      publishedAt:
        event.recordedAt > event.occurredAt
          ? event.recordedAt
          : event.occurredAt,
    });
  }
  return next;
}
