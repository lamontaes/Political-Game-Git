import { isSelectedDecision } from "../decisions";
import { claimsForEvent } from "../queries";
import {
  officesHeldBy,
  recordOfficeConsequence,
} from "../governing/office-consequence";
import type {
  DecisionOption,
  EntityId,
  HistoricalEvent,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  PRESS_CONTRACT_VERSION,
  type MatterProceedingRecord,
  type ProceedingStepRecord,
} from "./records";
import { PRESS_MATTER_TAG } from "./shared";
import { appendPressRecord, pressRecordsOfKind } from "./store";

export const FINDING_OFFICE_RESPONSE_DECISION =
  "press.subject-finding-office-response";

export interface FindingOfficeResponseSubject {
  readonly proceedingId: EntityId;
  readonly stepId: EntityId;
  readonly personId: EntityId;
  readonly officeKey: string;
}

/** Only the actual respondent's currently held office supplies this option. */
export function findingOfficeResponseBinding(
  world: World,
  input: FindingOfficeResponseSubject,
) {
  if (!world.people[input.personId]) return null;
  const proceeding = pressRecordsOfKind(world, "matter-proceeding").find(
    (r) => r.id === input.proceedingId,
  );
  const step = pressRecordsOfKind(world, "proceeding-step").find(
    (r) => r.id === input.stepId,
  );
  const event = step && world.history.events.find((r) => r.id === step.eventId);
  const office = officesHeldBy(world, input.personId).find(
    (r) => r.officeKey === input.officeKey,
  );
  if (
    !proceeding ||
    !step ||
    !event ||
    !office ||
    !proceeding.respondentPersonIds.includes(input.personId) ||
    step.proceedingId !== proceeding.id ||
    step.outcome !== "finding" ||
    !step.publicStep ||
    event.visibility !== "public" ||
    step.at > world.currentDate ||
    event.recordedAt > world.currentDate ||
    event.occurredAt > world.currentDate
  )
    return null;
  const options: readonly DecisionOption[] = [
    {
      key: "resign",
      label: `Resign as ${office.title}`,
      description: "Leave this office.",
    },
    {
      key: "remain",
      label: `Remain as ${office.title}`,
      description: "Keep this office.",
    },
  ];
  return {
    proceeding,
    step,
    event,
    office,
    decisionType: FINDING_OFFICE_RESPONSE_DECISION,
    subject: {
      kind: "context:public-matter" as const,
      key: `${proceeding.matterId}:${office.officeKey}`,
      entityId: event.id,
    },
    options,
  };
}

export interface FindingOfficeResponseInput extends FindingOfficeResponseSubject {
  readonly decisionTraceId: EntityId;
  /** The subject's actual words, preserved exactly. No generated reason. */
  readonly statement: string;
}

/** The saved finding boundary consumes a supported NPC choice, never authors one. */
export function recordFindingSubjectResponses(
  world: World,
  proceeding: MatterProceedingRecord,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  if (
    step.outcome !== "finding" ||
    step.eventId !== event.id ||
    step.proceedingId !== proceeding.id
  )
    return world;
  let next = world;
  for (const personId of proceeding.respondentPersonIds) {
    if (
      !next.people[personId] ||
      (next.control.kind === "person" && next.control.personId === personId)
    )
      continue;
    for (const office of officesHeldBy(next, personId)) {
      const subject = {
        proceedingId: proceeding.id,
        stepId: step.id,
        personId,
        officeKey: office.officeKey,
      };
      const binding = findingOfficeResponseBinding(next, subject);
      if (!binding) continue;
      const trace = [...next.history.decisionTraces]
        .reverse()
        .find(
          (row) =>
            row.context.actorPersonId === personId &&
            row.context.decisionType === binding.decisionType &&
            row.context.subject.kind === binding.subject.kind &&
            row.context.subject.key === binding.subject.key &&
            row.context.subject.entityId === event.id &&
            row.sequence > step.sequence &&
            row.recordedAt <= next.currentDate,
        );
      if (
        !trace ||
        !isSelectedDecision(trace) ||
        trace.context.randomness !== "none" ||
        trace.context.perceptionIds.length
      )
        continue;
      const claims = claimsForEvent(next, event.id).filter(
        (claim) =>
          claim.speakerPersonId === personId &&
          claim.madeAt <= trace.recordedAt &&
          claim.sequence < trace.context.cutoff.historySequenceExclusive &&
          claim.statement.trim().length > 0,
      );
      // This first admitted source lane supports only the subject's own claims.
      // Other source families need their existing producer contract, not guessed weights.
      if (
        !trace.context.considerations.length ||
        trace.context.considerations.some(
          (reason) =>
            reason.sourceType.startsWith("social:") ||
            !reason.sourceRefs.length ||
            reason.sourceRefs.some(
              (ref) =>
                ref.kind !== "claim" ||
                !claims.some((claim) => claim.id === ref.claimId),
            ),
        )
      )
        continue;
      if (
        trace.context.constraints.some(
          (constraint) =>
            !constraint.sourceRefs.length ||
            constraint.sourceRefs.some(
              (ref) =>
                ref.kind !== "claim" ||
                !claims.some((claim) => claim.id === ref.claimId),
            ),
        )
      )
        continue;
      const supportingClaims = trace.context.considerations
        .filter(
          (reason) =>
            reason.optionKey === trace.selectedOptionKey &&
            reason.direction === "supports",
        )
        .flatMap((reason) =>
          reason.sourceRefs.flatMap((ref) =>
            ref.kind === "claim"
              ? claims.filter((claim) => claim.id === ref.claimId)
              : [],
          ),
        );
      const statements = [
        ...new Set(supportingClaims.map((claim) => claim.statement)),
      ];
      if (statements.length !== 1) continue;
      next = recordFindingOfficeResponse(next, {
        ...subject,
        decisionTraceId: trace.id,
        statement: statements[0]!,
      });
    }
  }
  return next;
}

/** Consume a saved subject decision; never decide from the finding alone. */
export function recordFindingOfficeResponse(
  world: World,
  input: FindingOfficeResponseInput,
): World {
  const key = `press46:finding-office-response:${input.stepId}:${input.personId}:${input.officeKey}:${input.decisionTraceId}`;
  if (
    pressRecordsOfKind(world, "matter-response").some(
      (r) => r.stableKey === key,
    )
  )
    return world;
  const binding = findingOfficeResponseBinding(world, input);
  const trace = world.history.decisionTraces.find(
    (r) => r.id === input.decisionTraceId,
  );
  if (
    !binding ||
    !trace ||
    !input.statement.trim() ||
    !isSelectedDecision(trace) ||
    (trace.selectedOptionKey !== "resign" &&
      trace.selectedOptionKey !== "remain") ||
    trace.context.actorPersonId !== input.personId ||
    trace.context.decisionType !== binding.decisionType ||
    trace.context.subject.kind !== binding.subject.kind ||
    trace.context.subject.key !== binding.subject.key ||
    trace.context.subject.entityId !== binding.event.id ||
    trace.recordedAt > world.currentDate ||
    trace.recordedAt < binding.step.at ||
    trace.sequence <= binding.step.sequence ||
    trace.context.cutoff.historySequenceExclusive <= binding.step.sequence
  )
    return world;
  const choice = trace.selectedOptionKey;
  let next = recordWorldEvent(world, {
    stableKey: `${key}:event`,
    type: "press.finding-office-response",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: binding.event.jurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      {
        personId: input.personId,
        role: "agency:respondent",
        detail: "Recorded their own office response",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_MATTER_TAG}${binding.proceeding.matterId}`,
      `office:${input.officeKey}`,
      `press.decision:${trace.id}`,
      `press.finding:${binding.event.id}`,
    ],
    summary: input.statement,
    context: {
      location: null,
      socialContext: binding.proceeding.institutionLabel,
      pressure: null,
      choice,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const responseEvent = next.history.events.at(-1)!;
  next = appendPressRecord(next, "matter-response", {
    stableKey: key,
    matterId: binding.proceeding.matterId,
    actorPersonId: input.personId,
    actorRole: "subject",
    response: choice === "resign" ? "resign" : "no-action",
    eventId: responseEvent.id,
    decisionTraceId: trace.id,
    knowledgeIds: [],
    respondedAt: world.currentDate,
  }).world;
  return choice === "resign"
    ? recordOfficeConsequence(next, {
        stableKey: `${key}:office`,
        officeKey: input.officeKey,
        subjectPersonId: input.personId,
        kind: "resignation",
        effectiveAt: world.currentDate,
        statedReason: input.statement,
        evidenceEventIds: [binding.event.id, responseEvent.id],
      }).world
    : next;
}
