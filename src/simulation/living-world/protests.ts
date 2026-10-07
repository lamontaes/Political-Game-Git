import placesData from "../../../data/research/elections/protest-places.json" with { type: "json" };
import { modelCampaignFieldReach } from "../campaign-contact-calibration";
import { compareSimulationMoments, makeSimulationMoment } from "../dates";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { recordsByKey, recordsWithFieldValue } from "../history-index";
import { peopleTiedTo } from "../neighbor-news";
import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import { relationshipConsiderations } from "../governing/standing-considerations";
import type {
  DecisionConsideration,
  DecisionConstraint,
  DecisionContext,
  EntityId,
  HistoricalEvent,
  SimulationMoment,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import { onShiftAt, workSchedulesFor } from "./work-schedules";

export const PROTEST_PLANNED = "civic.protest-planned";
export const PROTEST_INVITED = "civic.protest-invited";
export const PROTEST_ATTENDANCE = "civic.protest-attendance-decided";
export const PROTEST_HELD = "civic.protest-held";
const META = "protest-plan:";
const emptyContext = () => ({
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
});

export const protestPlaces = placesData.places;
export interface ProtestPlan {
  readonly stableKey: string;
  readonly organizerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly stance: "support" | "oppose";
  readonly startsAt: SimulationMoment;
  readonly placeKey: string;
  /** Actual named public site in this jurisdiction, supplied by its place writer. */
  readonly placeLabel: string;
}
export interface RecordedProtest extends ProtestPlan {
  readonly planEventId: EntityId;
}

/** Plans and turnout remain event projections, including after reload. */
export function protests(world: World): readonly RecordedProtest[] {
  return recordsWithFieldValue(
    world.history.events,
    "type",
    PROTEST_PLANNED,
  ).map((event) => {
    const tag = event.tags.find((value) => value.startsWith(META));
    if (!tag) throw new Error("A protest plan is missing its recorded terms.");
    const plan: ProtestPlan = JSON.parse(tag.slice(META.length));
    return { ...plan, planEventId: event.id };
  });
}
function protestEvents(world: World, key: string): readonly HistoricalEvent[] {
  return recordsByKey(
    world.history.events,
    "protest-events",
    (event) => event.tags.filter((tag) => tag.startsWith("protest:")),
    `protest:${key}`,
  );
}
function requirePlan(world: World, key: string): RecordedProtest {
  const plan = protests(world).find((row) => row.stableKey === key);
  if (!plan) throw new Error("No recorded protest has that key.");
  return plan;
}

/** A selected organizer action calls this writer; reading a scene does not. */
export function organizeProtest(world: World, input: ProtestPlan): World {
  if (protests(world).some((row) => row.stableKey === input.stableKey))
    return world;
  const organizer = world.people[input.organizerPersonId];
  if (
    !organizer ||
    organizer.homeJurisdictionId !== input.jurisdictionId ||
    !isPersonAliveAt(world, organizer.id, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    throw new Error(
      "The organizer must be a living resident of the protest's place.",
    );
  if (!world.policyCatalog.propositions[input.propositionId])
    throw new Error("A protest needs a recorded proposition.");
  const venue = protestPlaces.find((row) => row.key === input.placeKey);
  if (!venue || !input.placeLabel.trim() || !input.stableKey.trim())
    throw new Error("Choose a public venue and give its actual local name.");
  const startsAt = makeSimulationMoment(input.startsAt);
  if (compareSimulationMoments(startsAt, world.currentMoment) < 0)
    throw new Error("A protest cannot be organized in the past.");
  return recordWorldEvent(world, {
    stableKey: `${input.stableKey}:planned`,
    type: PROTEST_PLANNED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [organizer.id, input.jurisdictionId],
    participants: [
      {
        personId: organizer.id,
        role: "focus:organizer",
        detail: "Organized the protest",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `protest:${input.stableKey}`,
      `${META}${JSON.stringify({ ...input, startsAt })}`,
    ],
    summary: `${personName(organizer)} organized a protest at ${input.placeLabel} on ${startsAt.date}.`,
    context: {
      ...emptyContext(),
      location: {
        jurisdictionId: input.jurisdictionId,
        label: input.placeLabel,
        setting: input.placeKey,
      },
      choice: input.stance,
      motivation: venue.access,
    },
  });
}

/** Field work reaches named residents, with ties first; it creates no attendance. */
export function inviteToProtest(
  world: World,
  input: {
    readonly protestKey: string;
    readonly minutes: number;
    readonly outreachKey: string;
  },
): World {
  const plan = requirePlan(world, input.protestKey);
  if (
    protestEvents(world, plan.stableKey).some((event) =>
      event.tags.includes(`outreach:${input.outreachKey}`),
    )
  )
    return world;
  if (compareSimulationMoments(world.currentMoment, plan.startsAt) > 0)
    throw new Error("Invitations must precede the protest.");
  const reach = modelCampaignFieldReach("door-canvass", input.minutes);
  if (!reach?.estimatedCompletedConversations) return world;
  const already = new Set(
    protestEvents(world, plan.stableKey)
      .filter((event) => event.type === PROTEST_INVITED)
      .flatMap((event) => event.participants.map((row) => row.personId)),
  );
  const ties = new Set(peopleTiedTo(world, [plan.organizerPersonId], "known"));
  const residents = world.personOrder
    .filter(
      (id) =>
        id !== plan.organizerPersonId &&
        !already.has(id) &&
        world.people[id]?.homeJurisdictionId === plan.jurisdictionId &&
        isPersonAliveAt(world, id, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        }),
    )
    .sort(
      (a, b) => Number(ties.has(b)) - Number(ties.has(a)) || a.localeCompare(b),
    );
  let next = world;
  for (const personId of residents.slice(
    0,
    reach.estimatedCompletedConversations.min,
  )) {
    next = recordWorldEvent(next, {
      stableKey: `${input.outreachKey}:${personId}`,
      type: PROTEST_INVITED,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: plan.jurisdictionId,
      involvedEntityIds: [
        personId,
        plan.organizerPersonId,
        plan.jurisdictionId,
      ],
      participants: [
        { personId, role: "focus:invitee", detail: "Received an invitation" },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        `protest:${plan.stableKey}`,
        `plan:${plan.planEventId}`,
        `outreach:${input.outreachKey}`,
        `answer-mode:${world.control.kind === "person" && world.control.personId === personId ? "player" : "resident"}`,
      ],
      summary: `${personName(next.people[plan.organizerPersonId]!)} invited ${personName(next.people[personId]!)} to the protest at ${plan.placeLabel}.`,
      context: {
        ...emptyContext(),
        location: {
          jurisdictionId: plan.jurisdictionId,
          label: plan.placeLabel,
          setting: plan.placeKey,
        },
      },
    });
    const invitation = next.history.events.at(-1)!;
    next = recordEventKnowledge(next, {
      stableKey: `${invitation.stableKey}:known`,
      personId,
      eventId: invitation.id,
      learnedAt: next.currentDate,
      believedSummary: invitation.summary,
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: plan.organizerPersonId,
        claimId: null,
      },
    });
  }
  return next;
}

function decideAttendance(
  world: World,
  plan: RecordedProtest,
  invitation: HistoricalEvent,
): World {
  const personId = invitation.participants[0]!.personId;
  // A missed human invitation is not consent. The canonical scene/action writer
  // must supply actual played attendance; autonomous decisions are NPC-only.
  if (
    invitation.tags.includes("answer-mode:player") ||
    (world.control.kind === "person" && world.control.personId === personId)
  )
    return world;
  const decisionKey = `${invitation.stableKey}:attendance`;
  if (
    protestEvents(world, plan.stableKey).some(
      (event) => event.stableKey === decisionKey,
    )
  )
    return world;
  if (
    !isPersonAliveAt(world, personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    }) ||
    world.people[personId]?.homeJurisdictionId !== plan.jurisdictionId
  )
    return world;
  const belief = recordsWithFieldValue(
    world.history.privateBeliefs,
    "personId",
    personId,
  )
    .filter(
      (row) =>
        row.propositionId === plan.propositionId &&
        row.formedAt <= plan.startsAt.date,
    )
    .sort(
      (a, b) => a.formedAt.localeCompare(b.formedAt) || a.sequence - b.sequence,
    )
    .at(-1);
  const considerations: DecisionConsideration[] = relationshipConsiderations(
    world,
    personId,
    plan.organizerPersonId,
    {
      optionKey: "attend",
      fond: {
        stableKey: `${decisionKey}:ties`,
        explanation:
          "The resident's recorded relationship with the organizer supports showing up.",
      },
      strain: {
        stableKey: `${decisionKey}:strain`,
        explanation:
          "The resident's recorded strain with the organizer weighs against showing up.",
      },
    },
  );
  if (belief && (belief.position === "support" || belief.position === "oppose"))
    considerations.push({
      stableKey: `${decisionKey}:view`,
      optionKey: "attend",
      sourceType: "belief:protest",
      direction: belief.position === plan.stance ? "supports" : "opposes",
      importance:
        belief.salience === "central"
          ? "decisive"
          : belief.salience === "high"
            ? "strong"
            : belief.salience === "moderate"
              ? "moderate"
              : "slight",
      confidence:
        belief.conviction === "strong"
          ? "high"
          : belief.conviction === "moderate"
            ? "medium"
            : "low",
      explanation:
        belief.rationale ??
        "The resident's own view of the protest's proposition.",
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  const shifts = workSchedulesFor(world, personId, plan.startsAt.date).filter(
    (schedule) => onShiftAt(schedule, plan.startsAt),
  );
  const context: DecisionContext = {
    stableKey: decisionKey,
    decisionType: "protest.attend",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:protest",
      key: plan.stableKey,
      entityId: null,
    },
    options: [
      {
        key: "attend",
        label: "Attend",
        description: "Be present at the protest.",
      },
      {
        key: "stay-away",
        label: "Stay away",
        description: "Do not attend this protest.",
      },
    ],
    constraints: shifts.map<DecisionConstraint>((schedule) => ({
      stableKey: `${decisionKey}:shift:${schedule.workRelationshipId}`,
      optionKey: "attend",
      kind: "constraint:work-shift",
      explanation: "The resident is on shift at the protest's recorded time.",
      sourceRefs: [
        {
          kind: "life-history",
          reference: {
            family: "work-relationship",
            recordId: schedule.workRelationshipId,
          },
        },
      ],
    })),
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  };
  const decision = evaluateDecision(world, context);
  const next = recordDurableDecisionTrace(world, decision);
  const choice = isSelectedDecision(decision)
    ? decision.selectedOptionKey
    : null;
  return recordWorldEvent(next, {
    stableKey: decisionKey,
    type: PROTEST_ATTENDANCE,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: plan.jurisdictionId,
    involvedEntityIds: [personId, plan.jurisdictionId],
    participants: [
      {
        personId,
        role: "focus:resident",
        detail: choice === "attend" ? "Attended" : "Did not attend",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      `protest:${plan.stableKey}`,
      `invitation:${invitation.id}`,
      `decision:${next.history.decisionTraces.at(-1)!.id}`,
    ],
    summary: `${personName(next.people[personId]!)} ${choice === "attend" ? "attended" : "did not attend"} the protest.`,
    context: {
      ...emptyContext(),
      location: {
        jurisdictionId: plan.jurisdictionId,
        label: plan.placeLabel,
        setting: plan.placeKey,
      },
      choice,
      motivation:
        [...context.considerations, ...context.constraints]
          .map((row) => row.explanation)
          .join(" ") || "No separated preference on the recorded reasons.",
    },
  });
}

/** Exactly one turnout count: recorded attendance choices, never all residents. */
export function protestAttendance(
  world: World,
  protestKey: string,
): readonly EntityId[] {
  const invited = new Map<string, EntityId>(
    protestEvents(world, protestKey)
      .filter((event) => event.type === PROTEST_INVITED)
      .map((event) => [event.id, event.participants[0]!.personId]),
  );
  return [
    ...new Set(
      protestEvents(world, protestKey)
        .filter(
          (event) =>
            event.type === PROTEST_ATTENDANCE &&
            event.context.choice === "attend" &&
            event.tags.some(
              (tag) =>
                tag.startsWith("invitation:") &&
                invited.get(tag.slice(11)) === event.participants[0]?.personId,
            ),
        )
        .map((event) => event.participants[0]!.personId),
    ),
  ];
}

/** Called at the actual scheduled moment by the calendar's canonical action. */
export function holdProtest(world: World, protestKey: string): World {
  const plan = requirePlan(world, protestKey);
  if (
    world.currentDate !== plan.startsAt.date ||
    compareSimulationMoments(world.currentMoment, plan.startsAt) < 0
  )
    throw new Error(
      "The protest can be held only on its recorded date at or after its start time.",
    );
  if (
    protestEvents(world, protestKey).some(
      (event) => event.type === PROTEST_HELD,
    )
  )
    return world;
  let next = world;
  for (const invitation of protestEvents(world, protestKey).filter(
    (event) => event.type === PROTEST_INVITED,
  ))
    next = decideAttendance(next, plan, invitation);
  const attendees = protestAttendance(next, protestKey);
  return recordWorldEvent(next, {
    stableKey: `${protestKey}:held`,
    type: PROTEST_HELD,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: plan.jurisdictionId,
    involvedEntityIds: [
      ...new Set([plan.organizerPersonId, plan.jurisdictionId, ...attendees]),
    ],
    participants: attendees.map((personId) => ({
      personId,
      role: "focus:attendee",
      detail: "Present at the protest",
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `protest:${protestKey}`,
      `plan:${plan.planEventId}`,
      `crowd:${attendees.length}`,
      "beat:government",
    ],
    summary: `${attendees.length} residents attended the protest at ${plan.placeLabel}.`,
    context: {
      ...emptyContext(),
      location: {
        jurisdictionId: plan.jurisdictionId,
        label: plan.placeLabel,
        setting: plan.placeKey,
      },
      choice: plan.stance,
      socialContext:
        "The crowd consists of the named residents whose attendance is recorded.",
    },
  });
}

/** A local official's existing decision path can read the public, named cause. */
export function protestConsiderations(
  world: World,
  officialPersonId: EntityId,
  protestKey: string,
  option: { readonly key: string; readonly stance: "support" | "oppose" },
): DecisionConsideration[] {
  const plan = requirePlan(world, protestKey);
  const held = protestEvents(world, protestKey).find(
    (event) => event.type === PROTEST_HELD,
  );
  if (
    !held ||
    !world.people[officialPersonId] ||
    !recordsWithFieldValue(
      world.history.knowledge,
      "personId",
      officialPersonId,
    ).some((row) => row.eventId === held.id)
  )
    return [];
  return protestAttendance(world, protestKey).flatMap((personId) =>
    relationshipConsiderations(world, officialPersonId, personId, {
      optionKey: option.key,
      fondDirection: plan.stance === option.stance ? "supports" : "opposes",
      fond: {
        stableKey: `${held.id}:${personId}:standing:${option.key}`,
        explanation:
          "A resident with recorded standing attended this protest on the item.",
      },
      strain: {
        stableKey: `${held.id}:${personId}:strain:${option.key}`,
        explanation:
          "The official's recorded strain with this attendee bears on the appeal.",
      },
    }).map((reason) => ({
      ...reason,
      sourceRefs: [
        ...reason.sourceRefs,
        { kind: "historical-event" as const, eventId: held.id },
      ],
    })),
  );
}
