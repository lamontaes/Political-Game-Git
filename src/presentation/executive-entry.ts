import { receiveExecutiveWorkIfCurrentOffice } from "../simulation/incident-response";
import { advanceWithWorldIntegrityAtEnd } from "../simulation/world";
import { publishPublicEvent } from "../simulation/public-information";
import {
  composeExecutiveWorkHandlers,
  synchronizeExecutiveInbox,
} from "../simulation/executive-work";
import {
  EXECUTIVE_NORMAL_ENTRY,
  planElectedExecutiveOfficeTerm,
  recordElectedExecutiveQualification,
} from "../simulation/executive-work-entry";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { publishExecutivePublicOutcomes } from "./publish-executive-transition";
import type {
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";

export { planElectedExecutiveOfficeTerm, recordElectedExecutiveQualification };

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
 * Ordinary play clock composition. Dated elected-term entry/expiry ride the
 * existing executive registry; this is not a second election engine.
 */
export function executivePlayHandlers(
  existing?: FutureTransitionHandlerRegistry,
) {
  return composeExecutiveWorkHandlers(existing);
}

/**
 * Ordinary play seam: route inbox work for a currently held office and publish
 * legitimate public outcomes. A result is not occupancy. Custom Start is
 * unchanged.
 */
export function applyExecutivePlayTransition(
  before: World,
  after: World,
): World {
  // Every publication is a write that would otherwise validate the whole
  // World on its own; on a long save that ran to minutes after one press.
  return advanceWithWorldIntegrityAtEnd(() =>
    publishExecutivePublicOutcomes(before, synchronizeExecutiveInbox(after)),
  );
}
