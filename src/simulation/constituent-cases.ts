import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
} from "./life-queries";
import { lifeOpportunityTag } from "./life-opportunities";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { currentOfficeWorkflowPreference } from "./office-workflow";
import {
  defaultCaseHandlerRole,
  constituentCasesForOffice,
  routeConstituentCase,
} from "./constituent-case-routing";
import type { EntityId, HistoricalEvent, World } from "./types";
import { recordWorldEvent } from "./world";
import { scheduleConstituentCaseReflection } from "./law-exposure";

const CONSTITUENT_CASE_OPENED = "office.case-opened";
const CONSTITUENT_CASE_CLOSED = "office.case-closed";

const OFFICE_WORK_KINDS = new Set([
  "employment:executive-office",
  "employment:executive-officeholder",
  "employment:vice-presidential-officeholder",
  "employment:legislative-member",
  "employment:state-agency-director",
  "employment:judicial-office",
  "employment:judicial-office-practice",
]);

function officeBinding(
  world: World,
  officialId: EntityId,
): { readonly id: EntityId; readonly organizationId: EntityId | null } | null {
  const employment = activeWorkRelationshipsAt(world, officialId).find(
    ({ relationship }) => OFFICE_WORK_KINDS.has(relationship.kind),
  )?.relationship;
  if (employment)
    return { id: employment.id, organizationId: employment.organizationId };
  const seat = activeOrganizationParticipationsAt(world, officialId).find(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind?.startsWith("leader:municipal-") === true,
  )?.participation;
  return seat ? { id: seat.id, organizationId: seat.organizationId } : null;
}

/** Project a recorded constituent contact into the event history as a case. */
export function openCaseForContact(
  world: World,
  contact: HistoricalEvent,
): World {
  if (contact.type !== "life.contacted-official") return world;
  const resident = contact.participants.find(
    ({ role }) => role === "focus:subject",
  )?.personId;
  const official = contact.participants.find(
    ({ role }) => role === "focus:object",
  )?.personId;
  if (!resident || !official) return world;
  const binding = officeBinding(world, official);
  if (!binding) return world;
  const stableKey = `office.case-opened:${contact.id}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: "office.case-opened",
    occurredAt: contact.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: contact.jurisdictionId,
    involvedEntityIds: [official, resident, binding.id],
    participants: [
      { personId: official, role: "focus:object", detail: null },
      { personId: resident, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "office.casework",
      `contact:${contact.id}`,
      `office-relationship:${binding.id}`,
      lifeOpportunityTag("constituent-case"),
      ...contact.tags.filter(
        (tag) => tag.startsWith("reason:") || tag.startsWith("source-record:"),
      ),
    ],
    summary: contact.tags.includes("reason:law-cost")
      ? "They contacted the office about a law that cost them something."
      : contact.tags.includes("reason:lived-outcome")
        ? "They contacted the office after something happened to them."
        : contact.tags.includes("reason:official-view")
          ? "They contacted the official whose actions they have a strong view of."
          : contact.tags.includes("reason:organized-opposition")
            ? "They contacted the office about a law they organized against."
            : "They made a general opinion call to the office.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export type ConstituentCaseAnswer = "help" | "refer" | "cannot-help" | "ignore";

/** Saves an office answer against the opened event. */
export function closeConstituentCase(
  world: World,
  caseEventId: EntityId,
  handledById: EntityId,
  answer: ConstituentCaseAnswer,
): World {
  const opened = world.history.events.find(
    (event) =>
      event.id === caseEventId && event.type === CONSTITUENT_CASE_OPENED,
  );
  if (!opened || !world.people[handledById]) return world;
  const relationshipId = tagValue(opened, "office-relationship");
  const relationship = world.history.workRelationships.find(
    (row) => row.id === relationshipId,
  );
  const municipalSeat = world.history.organizationParticipations.find(
    (row) => row.id === relationshipId,
  );
  const bindingId = relationship?.id ?? municipalSeat?.id;
  if (
    bindingId === undefined ||
    constituentCasesForOffice(world, bindingId).every(
      (row) => row.id !== caseEventId,
    )
  )
    return world;
  const residentId = opened.participants.find(
    ({ role }) => role === "focus:subject",
  )?.personId;
  const officialId = opened.participants.find(
    ({ role }) => role === "focus:object",
  )?.personId;
  if (!residentId || !officialId) return world;
  let next = recordWorldEvent(world, {
    stableKey: `${CONSTITUENT_CASE_CLOSED}:${caseEventId}`,
    type: CONSTITUENT_CASE_CLOSED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: opened.jurisdictionId,
    involvedEntityIds: [officialId, residentId, handledById],
    participants: [
      { personId: residentId, role: "focus:subject", detail: null },
      { personId: officialId, role: "focus:object", detail: null },
      { personId: handledById, role: "coordination:handler", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "office.casework",
      "adult.constituent-case",
      `case:${caseEventId}`,
      `office-relationship:${bindingId}`,
      `answer:${answer}`,
      ...opened.tags.filter(
        (tag) => tag.startsWith("reason:") || tag.startsWith("source-record:"),
      ),
    ],
    summary:
      answer === "help"
        ? "The office helped with the constituent's case."
        : answer === "refer"
          ? "The office referred the constituent's case."
          : answer === "cannot-help"
            ? "The office recorded that it could not help with the constituent's case."
            : "The office ignored the constituent's case.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const closed = next.history.events.find(
    (event) => event.stableKey === `${CONSTITUENT_CASE_CLOSED}:${caseEventId}`,
  );
  if (closed)
    next = scheduleConstituentCaseReflection(
      next,
      residentId,
      officialId,
      closed.id,
    );
  return next;
}

/** Applies the office's recorded practice and handler's recorded tendencies.
 * An undecided evaluation leaves the case open for a later review. */
export function handleBackgroundConstituentCase(
  world: World,
  caseEventId: EntityId,
): World {
  const opened = world.history.events.find(
    (event) =>
      event.id === caseEventId && event.type === CONSTITUENT_CASE_OPENED,
  );
  if (!opened) return world;
  const officialId = opened.participants.find(
    ({ role }) => role === "focus:object",
  )?.personId;
  const residentId = opened.participants.find(
    ({ role }) => role === "focus:subject",
  )?.personId;
  const relationshipId = tagValue(opened, "office-relationship");
  if (!officialId || !residentId || !relationshipId) return world;
  const relationship = world.history.workRelationships.find(
    (row) => row.id === relationshipId,
  );
  const municipalSeat = world.history.organizationParticipations.find(
    (row) => row.id === relationshipId,
  );
  if (!relationship && !municipalSeat) return world;
  if (
    !constituentCasesForOffice(
      world,
      relationship?.id ?? municipalSeat!.id,
    ).some((row) => row.id === caseEventId)
  )
    return world;
  const playerId =
    world.control.kind === "person" ? world.control.personId : null;
  const preference =
    playerId === officialId
      ? currentOfficeWorkflowPreference(
          world,
          officialId,
          relationship?.id ?? municipalSeat!.id,
        )
      : null;
  const mode =
    preference?.caseworkMode ??
    (playerId === officialId ? null : "staff-handles-and-briefs");
  if (!mode) return world;
  const route = routeConstituentCase(world, opened, officialId, playerId, mode);
  if (route.kind !== "handler") return world;
  const handler = defaultCaseHandlerRole(world, officialId);
  if (handler.personId === playerId) return world;
  let prepared = ensurePeopleTraits(world, [handler.personId]);
  const reason =
    opened.tags.find((tag) => tag.startsWith("reason:")) ??
    "reason:general-opinion";
  const priorAnswer = prepared.history.events
    .filter(
      (event) =>
        event.type === CONSTITUENT_CASE_CLOSED &&
        event.tags.includes(reason) &&
        event.participants.some(
          ({ role, personId }) =>
            role === "coordination:handler" && personId === playerId,
        ),
    )
    .at(-1);
  const priorKey = priorAnswer?.tags
    .find((tag) => tag.startsWith("answer:"))
    ?.slice("answer:".length);
  const reasonKind = reason.slice("reason:".length);
  const routineKey = `constituent-case:${caseEventId}`;
  const tendencies = traitConsiderations(
    prepared,
    handler.personId,
    routineKey,
    [
      {
        optionKey: "help",
        trait: "reliability",
        pole: "high",
        explanation: "They follow through on responsibilities.",
      },
      {
        optionKey: "refer",
        trait: "sociability",
        pole: "high",
        explanation: "They are comfortable involving other people.",
      },
      {
        optionKey: "cannot-help",
        trait: "deliberation",
        pole: "high",
        explanation: "They take time to think choices through.",
      },
      {
        optionKey: "ignore",
        trait: "reliability",
        pole: "low",
        explanation: "Following through is not their usual tendency.",
      },
    ],
  );
  const approach =
    priorAnswer && priorKey
      ? [
          {
            stableKey: `${routineKey}:usual-approach:${priorAnswer.id}`,
            optionKey: priorKey,
            sourceType: "domain:office-usual-approach" as const,
            direction: "supports" as const,
            importance: "decisive" as const,
            confidence: "high" as const,
            explanation: `The office's latest recorded answer to a ${reasonKind} case was ${priorKey}.`,
            sourceRefs: [
              { kind: "historical-event" as const, eventId: priorAnswer.id },
            ],
          },
        ]
      : [];
  const evaluation = evaluateDecision(prepared, {
    stableKey: routineKey,
    decisionType: "office.constituent-case",
    actorPersonId: handler.personId,
    cutoff: {
      asOfDate: prepared.currentDate,
      historySequenceExclusive: prepared.history.nextSequence,
    },
    subject: { kind: "context:life", key: "constituent-case", entityId: null },
    options: [
      {
        key: "help",
        label: "Help",
        description: "Try to resolve the request.",
      },
      {
        key: "refer",
        label: "Refer",
        description: "Send the resident to an office that can help.",
      },
      {
        key: "cannot-help",
        label: "Cannot help",
        description: "Tell the resident the office cannot help.",
      },
      {
        key: "ignore",
        label: "Ignore",
        description: "Take no action on the request.",
      },
    ],
    constraints: [],
    considerations: [...tendencies, ...approach],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  if (!isSelectedDecision(evaluation)) return prepared;
  prepared = recordDurableDecisionTrace(prepared, evaluation);
  return closeConstituentCase(
    prepared,
    caseEventId,
    handler.personId,
    evaluation.selectedOptionKey as ConstituentCaseAnswer,
  );
}

function tagValue(event: HistoricalEvent, key: string): string | null {
  return (
    event.tags
      .find((tag) => tag.startsWith(`${key}:`))
      ?.slice(key.length + 1) ?? null
  );
}
