import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { relationshipHistory } from "../queries";
import type {
  DecisionConsideration,
  EntityId,
  HistoricalEvent,
  SimulationMoment,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { onShiftAt, workSchedulesFor } from "./work-schedules";

export const CITIZEN_PROTEST_EVENT = "civic.protest";
const INVITATION_EVENT = "civic.protest-invitation";
const DECISION_TYPE = "civic.protest-attendance";

export interface CitizenProtestInput {
  readonly stableKey: string;
  readonly organizerPersonId: EntityId;
  readonly venueJurisdictionId: EntityId;
  /** A venue chosen by the organizer and supplied by its scene or caller. */
  readonly venueLabel: string;
  /** A saved party-question or policy-belief subject key. */
  readonly issueKey: string;
  /** The saved private-belief option that supports the protest's position. */
  readonly protestOptionKey: string;
  /** People the organizer actually reached and invited. */
  readonly invitedPersonIds: readonly EntityId[];
  /** The moment the event takes place. Its date must be the current game date. */
  readonly at?: SimulationMoment;
}

export interface CitizenProtestResult {
  readonly world: World;
  readonly event: HistoricalEvent;
  readonly invitedPersonIds: readonly EntityId[];
  readonly attendeePersonIds: readonly EntityId[];
  readonly shiftBlockedPersonIds: readonly EntityId[];
  /** The count includes named attendees and the named organizer. */
  readonly namedHeadcount: number;
}

function latestIssueBelief(world: World, personId: EntityId, issueKey: string) {
  return world.history.privateBeliefs
    .filter(
      (belief) =>
        belief.personId === personId &&
        belief.subject?.kind === "party-question" &&
        belief.subject?.key === issueKey &&
        belief.formedAt <= world.currentDate,
    )
    .sort(
      (a, b) => a.formedAt.localeCompare(b.formedAt) || a.sequence - b.sequence,
    )
    .at(-1);
}

function importanceOfBelief(
  belief: NonNullable<ReturnType<typeof latestIssueBelief>>,
): DecisionConsideration["importance"] {
  if (belief.conviction === "settled" || belief.salience === "central")
    return "decisive";
  if (belief.conviction === "strong" || belief.salience === "high")
    return "strong";
  if (belief.conviction === "moderate" || belief.salience === "moderate")
    return "moderate";
  return "slight";
}

function attendanceConsiderations(
  world: World,
  personId: EntityId,
  organizerPersonId: EntityId,
  issueKey: string,
  protestOptionKey: string,
  invitationId: EntityId,
): readonly DecisionConsideration[] {
  const considerations: DecisionConsideration[] = [];
  const belief = latestIssueBelief(world, personId, issueKey);
  if (belief?.optionKey) {
    const supportsProtest = belief.optionKey === protestOptionKey;
    considerations.push({
      stableKey: `issue:${belief.id}`,
      optionKey: supportsProtest ? "attend" : "stay-home",
      sourceType: "belief:recorded-political-stance",
      direction: "supports",
      importance: importanceOfBelief(belief),
      confidence:
        belief.conviction === "tentative"
          ? "low"
          : belief.conviction === "moderate"
            ? "medium"
            : "high",
      explanation: supportsProtest
        ? "Their saved view supports the position of this protest."
        : "Their saved view opposes the position of this protest.",
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  }

  const tie = relationshipHistory(world, personId, organizerPersonId)
    .filter((record) => record.occurredAt <= world.currentDate)
    .at(-1);
  if (tie) {
    const supports =
      tie.change !== "strained" &&
      tie.change !== "ended" &&
      !tie.kind.startsWith("conflict:");
    considerations.push({
      stableKey: `organizer-tie:${tie.id}`,
      optionKey: supports ? "attend" : "stay-home",
      sourceType: "context:relationship-history",
      direction: "supports",
      importance:
        tie.significance === "major"
          ? "strong"
          : tie.significance === "meaningful"
            ? "moderate"
            : "slight",
      confidence: "high",
      explanation: supports
        ? "Their recorded relationship with the organizer gives them a reason to go."
        : "Their latest recorded relationship with the organizer gives them a reason to stay away.",
      sourceRefs: [{ kind: "relationship-interaction", interactionId: tie.id }],
    });
  }

  considerations.push({
    stableKey: `invitation:${invitationId}`,
    optionKey: "attend",
    sourceType: "context:personal-invitation",
    direction: "supports",
    importance: "slight",
    confidence: "high",
    explanation: "The organizer reached out to them directly.",
    sourceRefs: [{ kind: "historical-event", eventId: invitationId }],
  });
  return considerations;
}

function alive(world: World, personId: EntityId): boolean {
  return !world.history.personDeaths.some(
    (record) => record.personId === personId,
  );
}

function invitationEvent(
  world: World,
  input: CitizenProtestInput,
  at: SimulationMoment,
  personId: EntityId,
): World {
  const stableKey = `${input.stableKey}:invitation:${personId}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: INVITATION_EVENT,
    occurredAt: at.date,
    recordedAt: world.currentDate,
    jurisdictionId: input.venueJurisdictionId,
    involvedEntityIds: [input.organizerPersonId, personId],
    participants: [
      {
        personId: input.organizerPersonId,
        role: "agency:organizer",
        detail: null,
      },
      { personId, role: "focus:invitee", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "civic.protest",
      "civic.protest-invitation",
      `issue:${input.issueKey}`,
    ],
    summary: "A resident invited a neighbor to a public protest.",
    context: {
      location: {
        jurisdictionId: input.venueJurisdictionId,
        label: input.venueLabel,
        setting: null,
      },
      socialContext: "A neighbor invited them to attend a public protest.",
      pressure: null,
      choice: null,
      motivation: input.issueKey,
      immediateReaction: null,
    },
  });
}

/**
 * Record one organizer-led protest on its actual date. Only residents the
 * organizer reached are evaluated; saved beliefs, recorded relationships,
 * and the resident's current work shift supply the attendance decision.
 */
export function organizeCitizenProtest(
  world: World,
  input: CitizenProtestInput,
): CitizenProtestResult | null {
  if (
    !input.stableKey.trim() ||
    !input.issueKey.trim() ||
    !input.protestOptionKey.trim()
  )
    throw new Error(
      "A protest needs a stable key, issue, and stated position.",
    );
  if (!input.venueLabel.trim())
    throw new Error("A protest needs a recorded venue.");
  if (!world.jurisdictions[input.venueJurisdictionId])
    throw new Error("A protest venue must identify a saved jurisdiction.");
  const at = input.at ?? world.currentMoment;
  if (at.date !== world.currentDate)
    throw new Error("A protest is recorded only on its actual current date.");
  const organizer = world.people[input.organizerPersonId];
  if (
    !organizer ||
    !alive(world, input.organizerPersonId) ||
    organizer.homeJurisdictionId !== input.venueJurisdictionId
  )
    throw new Error(
      "A resident organizer must live in the protest jurisdiction.",
    );
  if (new Set(input.invitedPersonIds).size !== input.invitedPersonIds.length)
    throw new Error("A protest invitation list cannot repeat a person.");
  for (const personId of input.invitedPersonIds) {
    const person = world.people[personId];
    if (
      !person ||
      !alive(world, personId) ||
      person.homeJurisdictionId !== input.venueJurisdictionId ||
      personId === input.organizerPersonId
    )
      throw new Error(
        "Every invitee must be a living resident distinct from the organizer.",
      );
  }

  const prior = world.history.events.find(
    (event) => event.stableKey === `${input.stableKey}:event`,
  );
  if (prior) {
    const attendeePersonIds = prior.participants
      .filter((participant) => participant.role === "presence:attendee")
      .map((participant) => participant.personId);
    return {
      world,
      event: prior,
      invitedPersonIds: [...input.invitedPersonIds],
      attendeePersonIds,
      shiftBlockedPersonIds: [],
      namedHeadcount: 1 + attendeePersonIds.length,
    };
  }

  let next = world;
  const attendeePersonIds: EntityId[] = [];
  const shiftBlockedPersonIds: EntityId[] = [];
  const decisions: { personId: EntityId; traceId: EntityId }[] = [];
  for (const personId of input.invitedPersonIds) {
    const invitationStableKey = `${input.stableKey}:invitation:${personId}`;
    next = invitationEvent(next, input, at, personId);
    const invitation = next.history.events.find(
      (event) => event.stableKey === invitationStableKey,
    );
    if (!invitation)
      throw new Error("The saved protest invitation is missing.");
    if (
      workSchedulesFor(next, personId, at.date).some((schedule) =>
        onShiftAt(schedule, at),
      )
    ) {
      shiftBlockedPersonIds.push(personId);
      continue;
    }
    const evaluation = evaluateDecision(next, {
      stableKey: `${input.stableKey}:attendance:${personId}`,
      decisionType: DECISION_TYPE,
      actorPersonId: personId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: {
        kind: "context:civic-protest",
        key: input.stableKey,
        entityId: input.venueJurisdictionId,
      },
      options: [
        { key: "attend", label: "Attend", description: "Go to the protest." },
        { key: "stay-home", label: "Stay home", description: "Do not attend." },
      ],
      constraints: [],
      considerations: attendanceConsiderations(
        next,
        personId,
        input.organizerPersonId,
        input.issueKey,
        input.protestOptionKey,
        invitation.id,
      ),
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    const trace = next.history.decisionTraces.find(
      (row) =>
        row.context.stableKey === `${input.stableKey}:attendance:${personId}`,
    );
    if (trace) decisions.push({ personId, traceId: trace.id });
    if (evaluation.selectedOptionKey === "attend")
      attendeePersonIds.push(personId);
  }

  const eventStableKey = `${input.stableKey}:event`;
  next = recordWorldEvent(next, {
    stableKey: eventStableKey,
    type: CITIZEN_PROTEST_EVENT,
    occurredAt: at.date,
    recordedAt: next.currentDate,
    jurisdictionId: input.venueJurisdictionId,
    involvedEntityIds: [input.organizerPersonId, ...attendeePersonIds],
    participants: [
      {
        personId: input.organizerPersonId,
        role: "agency:organizer",
        detail: null,
      },
      ...attendeePersonIds.map((personId) => ({
        personId,
        role: "presence:attendee" as const,
        detail:
          decisions.find((decision) => decision.personId === personId)
            ?.traceId ?? null,
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "civic.protest",
      `issue:${input.issueKey}`,
      `position:${input.protestOptionKey}`,
      ...decisions.map(
        ({ personId, traceId }) => `decision:${personId}:${traceId}`,
      ),
    ],
    summary: `Residents gathered at ${input.venueLabel} for a public protest.`,
    context: {
      location: {
        jurisdictionId: input.venueJurisdictionId,
        label: input.venueLabel,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: input.protestOptionKey,
      motivation: input.issueKey,
      immediateReaction: null,
    },
  });
  const event = next.history.events.find(
    (row) => row.stableKey === eventStableKey,
  );
  if (!event) throw new Error("The protest event was not saved.");
  return {
    world: next,
    event,
    invitedPersonIds: [...input.invitedPersonIds],
    attendeePersonIds,
    shiftBlockedPersonIds,
    namedHeadcount: 1 + attendeePersonIds.length,
  };
}
