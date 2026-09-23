import { executiveRulePackForOfficeKey } from "../simulation/executive-authority-rule-packs";
import { advanceWithWorldIntegrityAtEnd } from "../simulation/world";
import { electionContestById } from "../simulation/election-contests";
import { publishPublicEvent } from "../simulation/public-information";
import { resolvePublicationSource } from "../simulation/public-information-integrity";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import type { World } from "../simulation/types";

/**
 * Publishes newly completed public executive outcomes: sign/veto through the
 * existing legislative NEWS writer, and supported executive election results.
 * Private events and unheld-office records never enter this path.
 */
export function publishExecutivePublicOutcomes(
  before: World,
  after: World,
): World {
  if (before === after) return after;
  // One whole-World check for every outcome published here, not one each.
  return advanceWithWorldIntegrityAtEnd(() =>
    publishNewOutcomes(before, after),
  );
}

function publishNewOutcomes(before: World, after: World): World {
  let next = publishLegislativeTransition(before, after);
  for (const result of after.history.electionContestResults ?? []) {
    const contest = electionContestById(next, result.contestId);
    if (!contest || !executiveRulePackForOfficeKey(contest.office.officeKey))
      continue;
    const event = next.history.events.find(
      (candidate) => candidate.id === result.outcomeEventId,
    );
    if (
      !event ||
      event.visibility !== "public" ||
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
      stableKey: `executive-election:${result.id}`,
      sourceEventId: event.id,
    });
  }
  return next;
}
