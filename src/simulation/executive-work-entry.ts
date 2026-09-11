/** Review-only canonical premise for testing the consumer. Normal Custom Start
 * entry remains unavailable: QUAL-COMPLIANCE1 has no executive qualifications.
 * This initializer is not registered in player setup and asserts no election. */
import { executiveRulePackById } from "./executive-authority-rule-packs";
import { stateJurisdictionForKey } from "./life-places";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { workStatusAt, currentLifeCutoff } from "./life-queries";
import {
  scheduleFutureDueItem,
  createFutureTransitionHandlerRegistry,
} from "./future-transitions";
import { recordWorldEvent } from "./world";
import { makeIsoDate } from "./dates";
import {
  EXECUTIVE_ENTRY,
  EXECUTIVE_TERM_END,
  resolveExecutiveOffice,
} from "./executive-work-context";
import type { FutureTransitionHandler, World } from "./types";

export function initializeExecutiveOfficePremiseForReview(
  world: World,
  packId: string,
  endDate: string,
): World {
  if (world.control.kind !== "person")
    throw new Error("Choose a character first.");
  if (resolveExecutiveOffice(world))
    throw new Error("An executive term is already active.");
  const pack = executiveRulePackById(packId);
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction || !world.jurisdictions[jurisdiction.id])
    throw new Error(
      "This office has no supported governing jurisdiction in this World.",
    );
  const endsAt = makeIsoDate(endDate);
  if (endsAt <= world.currentDate)
    throw new Error("The authored term must end after the current date.");
  const personId = world.control.personId;
  const key = `executive-entry:${personId}:${pack.office.officeKey}:${world.history.nextSequence}`;
  let next = recordWorldEvent(world, {
    stableKey: key,
    type: EXECUTIVE_ENTRY,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [personId, jurisdiction.id],
    participants: [
      {
        personId,
        role: "focus:officeholder",
        detail: "Fictional review-fixture officeholding premise.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["executive.custom-start", `office:${pack.office.officeKey}`],
    summary: "Fictional officeholding premise established for review.",
    context: {
      location: null,
      socialContext:
        "Authored scenario premise and 35–45 hour weekly work schedule; no simulated election or legal term length is asserted.",
      pressure: null,
      choice: "Begin this fictional office term.",
      motivation: null,
      immediateReaction: null,
    },
  });
  const entry = next.history.events.at(-1)!;
  const provenance = { kind: "simulated-event" as const, eventId: entry.id };
  next = createOrganization(next, {
    stableKey: `${key}:office`,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: pack.office.title,
      classification: `service:${pack.office.officeKey}`,
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createWorkRelationship(next, {
    stableKey: `${key}:role`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: pack.office.title,
      occupationClassification: `service:${pack.office.officeKey}`,
      locationJurisdictionId: jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdiction.id,
      },
    },
  });
  const relationship = next.history.workRelationships.at(-1)!;
  // The due item is the explicit boundary of this authored premise, not a
  // statutory term calculation. No wage receipt or qualification is invented.
  return scheduleFutureDueItem(next, {
    stableKey: `${key}:end`,
    dueAt: endsAt,
    transitionKey: EXECUTIVE_TERM_END,
    entityIds: [entry.id, relationship.id].sort(),
    jurisdictionId: jurisdiction.id,
    provenance: {
      kind: "authored",
      note: "Review scenario end date, not a sourced legal term or deadline.",
    },
  });
}

export const executiveTermEndHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const relationship = world.history.workRelationships.find((r) =>
    item.entityIds.includes(r.id),
  );
  if (!relationship || item.transitionKey !== EXECUTIVE_TERM_END)
    return {
      world,
      status: "blocked",
      reasonKey: "executive-work:missing-term",
      context: "The originating office relationship is unavailable.",
      outcomeEventId: null,
    };
  const state = workStatusAt(world, relationship.id, currentLifeCutoff(world));
  if (!state || state.status === "ended")
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "The office relationship already ended.",
      outcomeEventId: null,
    };
  const next = recordWorkStatus(world, {
    stableKey: `${item.stableKey}:ended`,
    workRelationshipId: relationship.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "The authored review office term ended.",
    provenance: {
      kind: "authored",
      note: "The recorded scenario term reached its boundary.",
    },
    supersedesStatusId: state.id,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "The authored office term ended.",
    outcomeEventId: null,
  };
};
export const EXECUTIVE_TERM_HANDLERS = createFutureTransitionHandlerRegistry([
  [EXECUTIVE_TERM_END, executiveTermEndHandler],
]);

export const EXECUTIVE_NORMAL_ENTRY = {
  available: false,
  reason:
    "Executive-office qualification and role-entry rules are not yet connected to Custom Start.",
  owner: "QUAL-COMPLIANCE1 / UI-CORE-RELEASE",
} as const;
