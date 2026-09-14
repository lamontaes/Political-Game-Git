import { receiveExecutiveWorkIfCurrentOffice } from "../simulation/incident-response";
import { publishPublicEvent } from "../simulation/public-information";
import { synchronizeExecutiveInbox } from "../simulation/executive-work";
import { EXECUTIVE_NORMAL_ENTRY } from "../simulation/executive-work-entry";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { publishExecutivePublicOutcomes } from "./publish-executive-transition";
import type { World } from "../simulation/types";

/**
 * Feature-local adapter for A / FABLE-UI. Mount ordinary Work against this
 * rather than the review fixture. Custom Start and elected terms stay distinct.
 */
export function projectExecutiveEntry(world: World) {
  const office = resolveExecutiveOffice(world);
  if (!office) {
    return {
      available: false as const,
      origin: null,
      reason: "No current supported executive office.",
      officeTitle: null,
      endsAt: null,
      normalEntry: EXECUTIVE_NORMAL_ENTRY,
    };
  }
  return {
    available: true as const,
    origin: office.origin,
    reason: null,
    officeTitle: office.pack.office.title,
    endsAt: office.endsAt,
    normalEntry: EXECUTIVE_NORMAL_ENTRY,
  };
}

/** Bind incident ports only to the current held office and NEWS publisher. */
export function executiveIncidentPorts() {
  return {
    receiveExecutiveWork: receiveExecutiveWorkIfCurrentOffice,
    publishPublicEvent,
  };
}

/**
 * Ordinary play seam: seat a recorded executive winner, route inbox work, and
 * publish legitimate public outcomes. Custom Start is unchanged.
 */
export function applyExecutivePlayTransition(
  before: World,
  after: World,
): World {
  const seated = synchronizeExecutiveInbox(after);
  return publishExecutivePublicOutcomes(before, seated);
}
