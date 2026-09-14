/** Custom Start remains an authored office premise and is never an election.
 * Ordinary entry seats a recorded winner of a supported executive office using
 * N's contest result as the term identity. */
import {
  executiveRulePackById,
  executiveRulePackForOfficeKey,
} from "./executive-authority-rule-packs";
import {
  electionContestById,
  electionContestResult,
} from "./election-contests";
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
import type { EntityId, FutureTransitionHandler, World } from "./types";

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

/**
 * Seats the recorded winner of a supported executive contest.
 *
 * The contest result is the term identity. This does not invent an appointment
 * and does not reuse Custom Start. Filing that contest on the campaign ballot
 * remains N's candidacy producer where the pack still lists only legislative
 * seats.
 */
export function enterElectedExecutiveOffice(
  world: World,
  contestId: EntityId,
): World {
  const result = electionContestResult(world, contestId);
  if (!result) {
    throw new Error("No recorded election result stands behind this office.");
  }
  const contest = electionContestById(world, contestId);
  if (!contest) {
    throw new Error("The contest behind this result is missing.");
  }
  const pack = executiveRulePackForOfficeKey(contest.office.officeKey);
  if (!pack) {
    throw new Error(
      "That office is not one the accepted executive authority packs establish.",
    );
  }
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction) {
    throw new Error(
      "This office has no supported governing jurisdiction in this World.",
    );
  }
  if (contest.jurisdictionId !== jurisdiction.id) {
    throw new Error(
      "The contest was not run in the jurisdiction this office governs.",
    );
  }
  const winnerId = result.winnerPersonId;
  const outcome = world.history.events.find(
    (e) => e.id === result.outcomeEventId,
  );
  if (!outcome || outcome.type !== "election.contest-resolved") {
    throw new Error("The recorded election result names no public outcome.");
  }
  if (
    resolveExecutiveOffice({
      ...world,
      control: { kind: "person", personId: winnerId },
    })
  ) {
    return world;
  }
  if (
    world.history.workRelationships.some(
      (relationship) =>
        relationship.stableKey === `${contest.stableKey}:executive-seat`,
    )
  ) {
    return world;
  }
  let next = world.jurisdictions[jurisdiction.id]
    ? world
    : {
        ...world,
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
      };
  const bodyKey = `executive-office:${pack.packId}`;
  const existing = next.history.organizations.find(
    (organization) => organization.stableKey === bodyKey,
  );
  if (!existing) {
    next = createOrganization(next, {
      stableKey: bodyKey,
      formedAt: outcome.occurredAt,
      provenance: { kind: "simulated-event", eventId: outcome.id },
      initialProfile: {
        name: pack.office.title,
        classification: `service:${pack.office.officeKey}`,
        locationJurisdictionId: jurisdiction.id,
      },
    });
  }
  const organizationId =
    existing?.id ??
    next.history.organizations.find(
      (organization) => organization.stableKey === bodyKey,
    )!.id;
  next = createWorkRelationship(next, {
    stableKey: `${contest.stableKey}:executive-seat`,
    personId: winnerId,
    organizationId,
    startedAt: outcome.occurredAt,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: outcome.id },
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
  return next;
}

/** Idempotent consumer of N contest results for supported executive offices. */
export function synchronizeElectedExecutiveOffices(world: World): World {
  let next = world;
  for (const result of world.history.electionContestResults ?? []) {
    const contest = electionContestById(next, result.contestId);
    if (!contest) continue;
    if (!executiveRulePackForOfficeKey(contest.office.officeKey)) continue;
    if (
      next.history.workRelationships.some(
        (relationship) =>
          relationship.stableKey === `${contest.stableKey}:executive-seat`,
      )
    )
      continue;
    try {
      next = enterElectedExecutiveOffice(next, result.contestId);
    } catch {
      continue;
    }
  }
  return next;
}

export const EXECUTIVE_NORMAL_ENTRY = {
  available: true,
  reason:
    "A recorded election result for a supported executive office seats the winner into that office. Custom Start remains a separate authored premise and is not an election.",
  owner: "REST37-X / N office identity",
  missingProducer:
    "Campaign candidacy packs still offer legislative seats only; N owns adding a supported executive office to the ordinary ballot.",
} as const;
