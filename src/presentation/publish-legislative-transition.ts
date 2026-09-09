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
  const existing = new Set(
    (before.history.legislativeActions ?? []).map((action) => action.id),
  );
  let next = after;
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
    next = publishPublicEvent(next, {
      stableKey: `legislative-proceeding:${action.id}`,
      sourceEventId: event.id,
    });
  }
  return next;
}
