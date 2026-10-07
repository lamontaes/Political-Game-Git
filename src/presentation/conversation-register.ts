import { householdMembershipsAt } from "../simulation";
import type { EntityId, World } from "../simulation/types";
import type { SpeechRegister } from "./speech-registers";

/**
 * The register an ordinary conversation is spoken in, read from the records.
 *
 * Two people who live in one household are talking the way a family talks
 * (Santa Barbara family recordings, measured by Research 2: median turn four
 * words, questions used as directives). Everyone else the player meets in an
 * ordinary scene is everyday small talk (the diner and workplace recordings:
 * median turn four words, nine questions in a hundred turns). Nothing here
 * draws or writes: the answer is the recorded household membership at the
 * current date.
 */
export function conversationRegister(
  world: World,
  speakerId: EntityId,
  listenerId: EntityId,
): SpeechRegister {
  if (speakerId === listenerId) return "small-talk";
  const speakerHouseholds = new Set(
    householdMembershipsAt(world, speakerId).map(
      (membership) => membership.household.id,
    ),
  );
  const shared = householdMembershipsAt(world, listenerId).some((membership) =>
    speakerHouseholds.has(membership.household.id),
  );
  return shared ? "family" : "small-talk";
}
