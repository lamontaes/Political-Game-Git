/** Custom Start remains an authored office premise and is never an election.
 * Ordinary elected occupancy consumes a recorded result as provenance, then a
 * supplied dated term and recorded qualification. The result date is not the
 * office start. */
import { executiveRulePackById } from "./executive-authority-rule-packs";
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
  EXECUTIVE_ELECTED_TERM_ENTRY,
  EXECUTIVE_ELECTED_TERM_EXPIRY,
  EXECUTIVE_ENTRY,
  EXECUTIVE_QUALIFICATION,
  EXECUTIVE_TERM_END,
  electedExecutiveOfficeForKey,
  electedExecutiveTermForRelationship,
  recordedExecutiveQualification,
  resolveExecutiveOffice,
} from "./executive-work-context";
import { personName } from "./people";
import { isPersonAliveAt } from "./vitality-integrity";
import { scheduleGoverningTransition } from "./governing/state-governing";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandler,
  FutureTransitionHandlerResult,
  World,
} from "./types";

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

function blockedElectedTerm(
  world: World,
  reason: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "blocked",
    reasonKey: "election:executive-term-unavailable",
    context: reason,
    outcomeEventId: null,
  };
}

export function electedExecutiveTermTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const relationship = world.history.workRelationships.find((record) =>
    due.entityIds.includes(record.id),
  );
  const term =
    relationship && electedExecutiveTermForRelationship(world, relationship.id);
  if (!term || (due.id !== term.entry.id && due.id !== term.expiry.id))
    return blockedElectedTerm(
      world,
      "No reconciled dated winning-office chain supports this transition.",
    );
  const status = workStatusAt(world, term.relationship.id);
  if (!status)
    return blockedElectedTerm(world, "The expected office work is missing.");
  let next = world;
  if (due.transitionKey === EXECUTIVE_ELECTED_TERM_ENTRY) {
    if (status.status !== "expected")
      return blockedElectedTerm(
        world,
        "This office entry has ended or changed; it cannot be reactivated.",
      );
    if (!recordedExecutiveQualification(world, term.relationship.id))
      return blockedElectedTerm(
        world,
        "Required qualification is not recorded for this dated term.",
      );
    if (
      !isPersonAliveAt(world, term.relationship.personId, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })
    )
      return blockedElectedTerm(
        world,
        "The recorded winner is not alive for entry.",
      );
    next = recordWorkStatus(next, {
      stableKey: `${due.stableKey}:active`,
      workRelationshipId: term.relationship.id,
      effectiveAt: due.dueAt,
      status: "active",
      reason:
        "Supported dated term entry; qualification is checked separately from the result.",
      provenance: {
        kind: "simulated-event",
        eventId: term.result.outcomeEventId,
      },
      supersedesStatusId: status.id,
    });
    next = scheduleGoverningTransition(next, {
      relationshipId: term.relationship.id,
      entryDate: due.dueAt,
      jurisdictionId: term.governing.id,
    });
  } else if (due.transitionKey === EXECUTIVE_ELECTED_TERM_EXPIRY) {
    if (status.status !== "ended")
      next = recordWorkStatus(next, {
        stableKey: `${due.stableKey}:ended`,
        workRelationshipId: term.relationship.id,
        effectiveAt: due.dueAt,
        status: "ended",
        reason: "The recorded term expired; historical office work remains.",
        provenance: {
          kind: "simulated-event",
          eventId: term.result.outcomeEventId,
        },
        supersedesStatusId: status.id,
      });
  } else
    return blockedElectedTerm(
      world,
      "This is not an elected executive term transition.",
    );
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context:
      due.transitionKey === EXECUTIVE_ELECTED_TERM_ENTRY
        ? "Recorded winner entered the supported term."
        : "Recorded term expired.",
    outcomeEventId: null,
  };
}

export const EXECUTIVE_TERM_HANDLERS = createFutureTransitionHandlerRegistry([
  [EXECUTIVE_TERM_END, executiveTermEndHandler],
  [EXECUTIVE_ELECTED_TERM_ENTRY, electedExecutiveTermTransitionHandler],
  [EXECUTIVE_ELECTED_TERM_EXPIRY, electedExecutiveTermTransitionHandler],
]);

function requireElectedExecutiveContest(world: World, contestId: EntityId) {
  const result = electionContestResult(world, contestId);
  if (!result) {
    throw new Error("No recorded election result stands behind this office.");
  }
  const contest = electionContestById(world, contestId);
  if (!contest) {
    throw new Error("The contest behind this result is missing.");
  }
  const office = electedExecutiveOfficeForKey(contest.office.officeKey);
  if (!office) {
    throw new Error("That office is not an elected executive office.");
  }
  const jurisdiction = stateJurisdictionForKey(office.jurisdictionKey);
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
  const outcome = world.history.events.find(
    (event) => event.id === result.outcomeEventId,
  );
  if (!outcome || outcome.type !== "election.contest-resolved") {
    throw new Error("The recorded election result names no public outcome.");
  }
  return { contest, result, office, jurisdiction, outcome };
}

/**
 * Connects a recorded winner to expected office work through supplied term
 * dates. The result event is provenance, not occupancy. Callers must supply
 * recorded start/end; this does not compute Kentucky gubernatorial law, House
 * or Senate January-first dates, or national presidential noon boundaries.
 */
export function planElectedExecutiveOfficeTerm(
  world: World,
  input: {
    readonly contestId: EntityId;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly termNote: string;
  },
): World {
  const { contest, result, office, jurisdiction, outcome } =
    requireElectedExecutiveContest(world, input.contestId);
  const startsAt = makeIsoDate(input.startsAt);
  const endsAt = makeIsoDate(input.endsAt);
  if (startsAt === outcome.occurredAt) {
    throw new Error(
      "The contest-result date is provenance, not the office start.",
    );
  }
  if (startsAt <= contest.electionDate) {
    throw new Error(
      "The recorded term cannot start on or before the contest date.",
    );
  }
  if (endsAt <= startsAt) {
    throw new Error("The recorded term must end after it starts.");
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
  const bodyKey = office.bodyKey;
  const existing = next.history.organizations.find(
    (organization) => organization.stableKey === bodyKey,
  );
  if (!existing) {
    next = createOrganization(next, {
      stableKey: bodyKey,
      formedAt: next.currentDate,
      provenance: { kind: "simulated-event", eventId: outcome.id },
      initialProfile: {
        name: office.title,
        classification: `service:${office.officeKey}`,
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
    personId: result.winnerPersonId,
    organizationId,
    startedAt: startsAt,
    initialStatus: "expected",
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: outcome.id },
    initialRole: {
      title: office.title,
      occupationClassification: `service:${office.officeKey}`,
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
  const note = input.termNote;
  for (const [phase, dueAt, transitionKey] of [
    ["entry", startsAt, EXECUTIVE_ELECTED_TERM_ENTRY],
    ["expiry", endsAt, EXECUTIVE_ELECTED_TERM_EXPIRY],
  ] as const)
    next = scheduleFutureDueItem(next, {
      stableKey: `executive-term:${contest.id}:${phase}`,
      dueAt,
      transitionKey,
      entityIds: [relationship.id, contest.id, result.id].sort(),
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note,
      },
    });
  return next;
}

/** Attested qualification is a named receiver input, not inferred from winning. */
export function recordElectedExecutiveQualification(
  world: World,
  input: {
    readonly contestId: EntityId;
    readonly personId: EntityId;
    readonly qualificationNote: string;
  },
): World {
  const { contest, result, office, jurisdiction } =
    requireElectedExecutiveContest(world, input.contestId);
  if (input.personId !== result.winnerPersonId) {
    throw new Error("Only the recorded winner can be qualified for this term.");
  }
  const relationship = world.history.workRelationships.find(
    (record) => record.stableKey === `${contest.stableKey}:executive-seat`,
  );
  if (
    !relationship ||
    !electedExecutiveTermForRelationship(world, relationship.id)
  ) {
    throw new Error(
      "Qualification requires a planned dated term for this contest.",
    );
  }
  if (recordedExecutiveQualification(world, relationship.id)) return world;
  const winner = world.people[input.personId];
  const who = winner ? personName(winner) : "The winner";
  return recordWorldEvent(world, {
    stableKey: `executive-qualification:${contest.id}:${input.personId}`,
    type: EXECUTIVE_QUALIFICATION,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [input.personId, contest.id, result.id, jurisdiction.id],
    participants: [
      {
        personId: input.personId,
        role: "focus:officeholder",
        detail: `Qualified to take office as ${office.title}.`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`office:${office.officeKey}`],
    summary: `${who} qualified to take office as ${office.title}.`,
    context: {
      location: null,
      socialContext: input.qualificationNote,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** A recorded result never auto-seats. Inbox routing still uses current office. */
export function synchronizeElectedExecutiveOffices(world: World): World {
  return world;
}

export const EXECUTIVE_NORMAL_ENTRY = {
  available: true,
  reason:
    "A recorded election result is provenance for a supported executive office. Dated term start/end and a recorded qualification are required before occupancy. Custom Start remains a separate authored premise and is not an election.",
  owner: "REST37-X / N office identity",
  missingProducer:
    "N still owns ordinary governor candidacy on the campaign ballot (packs remain legislative). N also still owns a sourced Kentucky gubernatorial dated-term producer. This consumer does not treat the contest-result date as taking office, and it does not substitute House/Senate January-first dates or national presidential noon boundaries.",
} as const;
