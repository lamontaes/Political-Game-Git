import {
  activeOrganizationParticipationsAt,
  organizationProfileAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { contentDecisionAuthority } from "./question-authority";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
/** A school-content writer asks the enacted authority gate before adopting standards. */
export function recordCurriculumDecision(
  world: World,
  input: {
    stableKey: string;
    townId: EntityId;
    authorityLevel: "state" | "local";
    decidingPersonIds: readonly EntityId[];
    standards: string;
    reason: string;
  },
): World {
  const authority = contentDecisionAuthority(world, input.townId, "curriculum");
  if (authority.level !== input.authorityLevel)
    throw Error(`Curriculum adoption refused: ${authority.reason}`);
  if (
    !input.decidingPersonIds.length ||
    input.decidingPersonIds.some((id) => !world.people[id]) ||
    !input.standards.trim() ||
    !input.reason.trim()
  )
    throw Error(
      "A curriculum decision requires actual decision makers and recorded standards and reasons.",
    );
  const state = lifePlaceByJurisdictionId(input.townId)?.stateJurisdictionKey;
  const decidingJurisdiction =
    input.authorityLevel === "local"
      ? input.townId
      : state
        ? stateJurisdictionForKey(state)?.id
        : null;
  for (const personId of input.decidingPersonIds) {
    const holdsAuthority = activeOrganizationParticipationsAt(
      world,
      personId,
    ).some(({ participation }) => {
      const profile = organizationProfileAt(
        world,
        participation.organizationId,
      );
      return (
        participation.kind === "leadership:education-standards-board-member" &&
        profile?.classification === "custom:education-standards-authority" &&
        profile.locationJurisdictionId === decidingJurisdiction
      );
    });
    if (!holdsAuthority)
      throw Error(
        "Curriculum adoption requires a recorded current standards-board seat in the deciding jurisdiction; identity alone is not authority.",
      );
  }
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "education.curriculum-adopted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.townId,
    involvedEntityIds: [input.townId, ...input.decidingPersonIds],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [`authority:${authority.level}`, "curriculum-standards"],
    summary: `The ${authority.level} authority adopted these curriculum standards: ${input.standards}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: input.standards,
      motivation: `${input.reason} ${authority.reason}`,
      immediateReaction: null,
    },
  });
}
