/** Incident-to-response consumer. State lives in existing event, Work, schedule,
 * knowledge and resource records; this module owns no engine or save schema. */
import { personActionAvailabilityAt } from "./vitality-integrity";
import { recordCausalProcess } from "./causal-effects";
import { addSimulationMinutes } from "./dates";
import { activeWorkRelationshipsAt } from "./life-queries";
import { recordEventKnowledge } from "./records";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import {
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
} from "./resources";
import {
  createScheduledActivity,
  createWorkItem,
  workItemState,
  scheduledActivityState,
  performScheduledActivity,
} from "./time-work";
import { recordWorldEvent } from "./world";
import type { EntityId, HistoricalEvent, World } from "./types";

export interface IncidentResponsePorts {
  /** Existing EXEC receiveExecutiveWork, bound by the integrator. */
  readonly receiveExecutiveWork?: (
    world: World,
    eventId: EntityId,
    title: string,
    summary: string,
  ) => World;
  /** Existing NEWS publishPublicEvent; never called from projection. */
  readonly publishPublicEvent?: (
    world: World,
    input: { stableKey: string; sourceEventId: EntityId },
  ) => World;
}
const cutoff = (w: World) => ({
  asOfDate: w.currentDate,
  historySequenceExclusive: w.history.nextSequence,
});
function actor(w: World): EntityId {
  if (w.control.kind !== "person")
    throw new Error("An acting person is required.");
  if (
    personActionAvailabilityAt(w, w.control.personId, cutoff(w)).status ===
    "blocked"
  )
    throw new Error("The acting person is unavailable.");
  return w.control.personId;
}
function available(w: World, e: HistoricalEvent) {
  return (
    e.occurredAt <= w.currentDate &&
    e.recordedAt <= w.currentDate &&
    e.sequence < w.history.nextSequence
  );
}
function knows(w: World, p: EntityId, e: HistoricalEvent) {
  return (
    available(w, e) &&
    (e.participants.some((x) => x.personId === p) ||
      w.history.knowledge.some(
        (k) =>
          k.personId === p &&
          k.eventId === e.id &&
          k.learnedAt <= w.currentDate,
      ))
  );
}
function event(w: World, id: EntityId) {
  const e = w.history.events.find((x) => x.id === id);
  if (!e || !available(w, e))
    throw new Error("Event is unavailable or in the future.");
  return e;
}
function known(w: World, id: EntityId) {
  const e = event(w, id);
  if (!knows(w, actor(w), e))
    throw new Error("This event is not yet known to the acting person.");
  return e;
}
function office(w: World, jurisdictionId: EntityId | null) {
  const roles = activeWorkRelationshipsAt(w, actor(w), cutoff(w)).filter(
    (x) =>
      x.role.locationJurisdictionId === jurisdictionId &&
      x.relationship.organizationId &&
      x.relationship.authority === "directs-others",
  );
  if (roles.length !== 1)
    throw new Error(
      "No unambiguous current supervisory role in this jurisdiction.",
    );
  return roles[0]!;
}
function write(
  w: World,
  key: string,
  type: string,
  source: HistoricalEvent,
  summary: string,
  people: EntityId[],
  extra: EntityId[] = [],
  visibility: HistoricalEvent["visibility"] = "private",
) {
  const next = recordWorldEvent(w, {
    stableKey: key,
    type: `incident.response.${type}`,
    occurredAt: w.currentDate,
    recordedAt: w.currentDate,
    jurisdictionId: source.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        ...people,
        ...extra.filter((id) => !w.history.events.some((e) => e.id === id)),
      ]),
    ].sort(),
    participants: [...new Set(people)].map((personId) => ({
      personId,
      role: "agency:participant",
      detail: "Participated in this response action.",
    })),
    personFactConstraints: [],
    visibility,
    tags: ["incident.response", "provenance.design-authored"],
    summary,
    context: {
      location: null,
      socialContext:
        "Design-authored response procedure; no empirical cadence or promised hazard outcome.",
      pressure: null,
      choice: summary,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordCausalProcess(next, {
    stableKey: `${key}:cause`,
    kind: "incident:response",
    effectiveAt: w.currentDate,
    recordedAt: w.currentDate,
    sourceEntityIds: [source.id, next.history.events.at(-1)!.id],
    parentCausalIds: [],
    provenance: {
      kind: "authored",
      note: "Design-authored response procedure; preserves source event links.",
    },
  });
}
function teach(w: World, e: HistoricalEvent, people: EntityId[]) {
  for (const personId of [...new Set(people)])
    w = recordEventKnowledge(w, {
      stableKey: `${e.stableKey}:knowledge:${personId}`,
      personId,
      eventId: e.id,
      learnedAt: w.currentDate,
      believedSummary: e.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  return w;
}

/** A report is an explicit communication by a person who already knows its
 * source. It records what was reported, never personal damage or eyewitnesses. */
export function reportIncident(
  w: World,
  sourceEventId: EntityId,
  recipientId: EntityId,
  summary: string,
  ports: IncidentResponsePorts = {},
): World {
  const source = known(w, sourceEventId);
  if (!w.history.incidents.some((i) => i.onsetEventId === source.id))
    throw new Error("A canonical incident occurrence is required.");
  if (!w.people[recipientId] || !summary.trim())
    throw new Error("A real recipient and report are required.");
  const key = `incident-response:report:${source.id}:${actor(w)}:${recipientId}`;
  let next = write(w, key, "report", source, summary, [actor(w), recipientId]);
  const report = next.history.events.at(-1)!;
  next = teach(next, report, [actor(w), recipientId]);
  // EXEC is invoked only for its actual controlled recipient, never by changing control.
  if (recipientId === actor(w) && ports.receiveExecutiveWork)
    next = ports.receiveExecutiveWork(
      next,
      report.id,
      "Incident report",
      report.summary,
    );
  return next;
}

/** Public access is not universal awareness. The NEWS adapter passes an actual
 * published event ID after its own dated digest check. */
export function inspectPublishedIncident(
  w: World,
  sourceEventId: EntityId,
): World {
  const e = event(w, sourceEventId);
  // Read the published NEWS143 interface without copying its writer or store.
  const publications =
    (
      w.history as typeof w.history & {
        publications?: readonly {
          sourceEventId: EntityId;
          publishedAt: string;
          recordedAt: string;
          sequence: number;
        }[];
      }
    ).publications ?? [];
  if (
    e.visibility !== "public" ||
    !publications.some(
      (p) =>
        p.sourceEventId === e.id &&
        p.publishedAt <= w.currentDate &&
        p.recordedAt <= w.currentDate &&
        p.sequence < w.history.nextSequence,
    )
  )
    throw new Error("No available publication for this event.");
  if (knows(w, actor(w), e)) return w;
  return recordEventKnowledge(w, {
    stableKey: `incident-response:read:${actor(w)}:${e.id}`,
    personId: actor(w),
    eventId: e.id,
    learnedAt: w.currentDate,
    believedSummary: e.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "public-record", reference: sourceEventId },
  });
}

export function requestIncidentInformation(
  w: World,
  reportId: EntityId,
  recipientId: EntityId,
): World {
  const report = known(w, reportId);
  if (!w.people[recipientId]) throw new Error("Recipient is unavailable.");
  const next = write(
    w,
    `incident-response:request:${report.id}:${actor(w)}:${recipientId}`,
    "information-requested",
    report,
    "Requested available incident information; no response or resource approval is implied.",
    [actor(w), recipientId],
  );
  return teach(next, next.history.events.at(-1)!, [actor(w), recipientId]);
}

/** The supported decision is internal work allocation, not a declaration or a
 * public spending power inferred from a title. */
export function decideIncidentResponse(
  w: World,
  reportId: EntityId,
  choice: "commission-report" | "defer",
  staffId: EntityId | null,
): World {
  const report = known(w, reportId);
  if (report.type !== "incident.response.report")
    throw new Error("An incident report is required.");
  const role = office(w, report.jurisdictionId);
  const key = `incident-response:decision:${report.id}`;
  if (choice === "defer")
    return write(
      w,
      key,
      "deferred",
      report,
      "Deferred the response briefing; no work or assistance was authorized.",
      [actor(w)],
      [role.relationship.id],
    );
  if (!staffId || staffId === actor(w))
    throw new Error("Select an available staff member.");
  const staff = activeWorkRelationshipsAt(w, staffId, cutoff(w)).find(
    (x) =>
      x.relationship.organizationId === role.relationship.organizationId &&
      x.role.locationJurisdictionId === report.jurisdictionId,
  );
  if (!staff)
    throw new Error(
      "Staff must have active work in the same organization and jurisdiction.",
    );
  if (
    w.history.workItems.some((i) => {
      const s = workItemState(w, i.id);
      return s?.status === "active" && s.assignedPersonIds.includes(staffId);
    })
  )
    throw new Error(
      "Staff already has active work; capacity cannot be duplicated.",
    );
  let next = write(
    w,
    key,
    "work-authorized",
    report,
    "Commissioned a report comparing the available observations and listing unresolved information and assistance requests.",
    [actor(w), staffId],
    [role.relationship.id, staff.relationship.id],
  );
  const decision = next.history.events.at(-1)!;
  next = createWorkItem(next, {
    stableKey: `${key}:work`,
    title: "Prepare incident response briefing",
    summary: decision.summary,
    jurisdictionId: report.jurisdictionId,
    sourceEntityIds: [report.id, decision.id],
    focus: {
      kind: "other",
      targetKey: "incident-response:briefing",
      sourceEntityId: report.id,
    },
    effort: { kind: "authored-duration", requiredMinutes: 30 },
    access: { kind: "private", personIds: [actor(w), staffId] },
    assignedPersonIds: [staffId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  if (!knows(next, staffId, report))
    next = recordEventKnowledge(next, {
      stableKey: `${key}:report-shared`,
      personId: staffId,
      eventId: report.id,
      learnedAt: next.currentDate,
      believedSummary: report.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: actor(w), claimId: null },
    });
  return teach(next, decision, [actor(w), staffId]);
}

export function arrangeIncidentBriefing(w: World, workItemId: EntityId): World {
  const item = w.history.workItems.find(
    (i) =>
      i.id === workItemId &&
      i.focus.kind === "other" &&
      i.focus.targetKey === "incident-response:briefing",
  );
  const state = workItemState(w, workItemId);
  if (
    !item ||
    item.focus.kind !== "other" ||
    state?.status !== "ready-for-review" ||
    !state.outcomeEventId
  )
    throw new Error("Actual completed staff work is required.");
  const report = known(w, item.focus.sourceEntityId!);
  office(w, report.jurisdictionId);
  return createScheduledActivity(w, {
    stableKey: `incident-response:briefing:${item.id}`,
    title: "Review incident response briefing",
    summary:
      "Review the completed staff report and unresolved requests. Attendance does not establish assistance delivery.",
    kind: "confirmed",
    start: w.currentMoment,
    end: addSimulationMinutes(w.currentMoment, 20),
    participantPersonIds: [actor(w), ...state.assignedPersonIds],
    responsiblePersonId: actor(w),
    location: {
      locationKey: "incident-response:current-office",
      label: "Office briefing",
      jurisdictionId: report.jurisdictionId,
    },
    sourceEntityIds: [item.id, state.outcomeEventId],
    flexibility: { kind: "fixed" },
    access: item.access,
  });
}

export function attendIncidentBriefing(w: World, activityId: EntityId): World {
  const a = w.history.scheduledActivities.find(
    (x) =>
      x.id === activityId &&
      x.stableKey.startsWith("incident-response:briefing:"),
  );
  if (!a) throw new Error("An incident briefing is required.");
  office(w, a.location.jurisdictionId);
  let next = performScheduledActivity(w, activityId);
  const state = scheduledActivityState(next, activityId);
  if (state?.status !== "completed" || !state.outcomeEventId) return next;
  const outcome = event(next, state.outcomeEventId);
  next = write(
    next,
    `incident-response:follow-up:${activityId}`,
    "follow-up",
    outcome,
    "Reviewed available reports. Unverified impact and pending assistance remain unresolved; the briefing alone establishes neither damage nor delivery.",
    [...a.participantPersonIds],
    [...a.sourceEntityIds],
  );
  return teach(next, next.history.events.at(-1)!, [...a.participantPersonIds]);
}

/** Request and approval remain separate canonical events and flow terms. */
export function requestIncidentResources(
  w: World,
  reportId: EntityId,
  resourceFlowId: EntityId,
): World {
  const report = known(w, reportId);
  if (report.type !== "incident.response.report")
    throw new Error("A known incident report is required.");
  const role = office(w, report.jurisdictionId);
  const flow = w.history.resourceFlows.find(
    (f) =>
      f.id === resourceFlowId &&
      f.basisKind === "custom:incident-response" &&
      f.jurisdictionId === report.jurisdictionId &&
      f.source.kind === "organization" &&
      f.source.organizationId === role.relationship.organizationId,
  );
  if (!flow)
    throw new Error(
      "No response allocation in this organization and jurisdiction.",
    );
  return write(
    w,
    `incident-response:resource-request:${report.id}:${flow.id}`,
    "resources-requested",
    report,
    "Requested the existing internal allocation; approval and delivery remain pending.",
    [actor(w)],
    [flow.id],
  );
}
export function decideIncidentResourceRequest(
  w: World,
  requestId: EntityId,
  approve: boolean,
): World {
  const request = known(w, requestId);
  if (request.type !== "incident.response.resources-requested")
    throw new Error("A resource request is required.");
  const role = office(w, request.jurisdictionId);
  const flow = w.history.resourceFlows.find((f) =>
    request.involvedEntityIds.includes(f.id),
  );
  const terms = flow && resourceFlowTermsAt(w, flow.id);
  if (
    !flow ||
    flow.provenance.kind !== "authored" ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== role.relationship.organizationId ||
    flow.startsAt > w.currentDate ||
    !terms ||
    terms.status !== "expected"
  )
    throw new Error(
      "No pending authored allocation under this actor's current responsibility.",
    );
  let next = write(
    w,
    `incident-response:resource-decision:${request.id}`,
    approve ? "resources-authorized" : "resources-declined",
    request,
    approve
      ? "Authorized the requested internal allocation; delivery remains pending."
      : "Declined the requested internal allocation.",
    [actor(w)],
    [flow.id, role.relationship.id],
  );
  next = recordResourceFlowTerms(next, {
    stableKey: `incident-response:resource-terms:${request.id}`,
    resourceFlowId: flow.id,
    effectiveAt: w.currentDate,
    status: approve ? "active" : "ended",
    amount: terms.amount,
    cadenceKind: terms.cadenceKind,
    reason: approve
      ? "Explicit internal response authorization."
      : "Allocation declined.",
    provenance: {
      kind: "authored",
      note: "Fictional internal allocation; not a public assistance-law claim.",
    },
    supersedesTermsId: terms.id,
  });
  return next;
}
function responseReportId(
  w: World,
  e: HistoricalEvent,
  seen = new Set<EntityId>(),
): EntityId | null {
  if (seen.has(e.id)) return null;
  seen.add(e.id);
  if (e.type === "incident.response.report") return e.id;
  for (const item of w.history.workItems)
    if (
      e.involvedEntityIds.includes(item.id) &&
      item.focus.kind === "other" &&
      item.focus.targetKey === "incident-response:briefing"
    )
      return item.focus.sourceEntityId;
  const cause = w.history.causalProcesses.find(
    (c) => c.stableKey === `${e.stableKey}:cause`,
  );
  for (const id of cause?.sourceEntityIds ?? []) {
    const source = w.history.events.find((x) => x.id === id);
    if (source) {
      const report = responseReportId(w, source, seen);
      if (report) return report;
    }
  }
  return null;
}

/** Execute an already-active authored internal resource flow after actual
 * follow-through. Real public assistance authority remains with its provider. */
export function deliverIncidentResources(
  w: World,
  followUpId: EntityId,
  resourceFlowId: EntityId,
): World {
  const follow = known(w, followUpId);
  if (follow.type !== "incident.response.follow-up")
    throw new Error("A completed response follow-up is required.");
  const role = office(w, follow.jurisdictionId);
  const flow = w.history.resourceFlows.find((f) => f.id === resourceFlowId);
  const terms = resourceFlowTermsAt(w, resourceFlowId);
  if (
    !flow ||
    flow.provenance.kind !== "authored" ||
    flow.basisKind !== "custom:incident-response" ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== role.relationship.organizationId ||
    flow.jurisdictionId !== follow.jurisdictionId ||
    !terms ||
    terms.status !== "active"
  )
    throw new Error(
      "No authorized active internal response resource flow in this jurisdiction.",
    );
  const authorization = w.history.events.find(
    (e) =>
      e.type === "incident.response.resources-authorized" &&
      e.involvedEntityIds.includes(flow.id) &&
      available(w, e) &&
      responseReportId(w, e) === responseReportId(w, follow),
  );
  if (!authorization)
    throw new Error("No explicit authorization for this incident response.");
  const balance = resourcePositionAt(w, flow.source, terms.amount.currency);
  if (!balance || balance.liquidBalance.minorUnits < terms.amount.minorUnits)
    throw new Error("Insufficient actual resources.");
  if (
    w.history.resourceTransferOutcomes.some((o) => o.resourceFlowId === flow.id)
  )
    throw new Error("This response delivery was already recorded.");
  let next = recordResourceTransferOutcome(w, {
    stableKey: `incident-response:delivery:${flow.id}`,
    resourceFlowId: flow.id,
    periodStartsAt: w.currentDate,
    periodEndsAt: w.currentDate,
    occurredAt: w.currentDate,
    status: "completed",
    attemptedAmount: terms.amount,
    transferredAmount: terms.amount,
    reasonKind: null,
    note: "Delivered the already authorized internal response allocation; no hazard-effect claim.",
    provenance: {
      kind: "authored",
      note: "Explicit fictional response allocation; not FEMA assistance or empirical damage.",
    },
  });
  next = write(
    next,
    `incident-response:delivered:${flow.id}`,
    "delivered",
    follow,
    "The recorded internal resource allocation was delivered. No personal loss or intervention effectiveness was inferred.",
    [actor(w)],
    [flow.id],
  );
  return teach(next, next.history.events.at(-1)!, [actor(w)]);
}

export function publishIncidentEvent(
  w: World,
  eventId: EntityId,
  ports: IncidentResponsePorts,
): World {
  const e = event(w, eventId);
  if (e.visibility !== "public" || !ports.publishPublicEvent)
    throw new Error(
      "An already-public event and the existing NEWS publisher are required.",
    );
  return ports.publishPublicEvent(w, {
    stableKey: `incident-response:publication:${e.id}`,
    sourceEventId: e.id,
  });
}

export function incidentResponseView(w: World) {
  if (w.control.kind !== "person")
    return { reports: [], work: [], history: [] };
  const p = w.control.personId;
  return {
    reports: w.history.events.filter(
      (e) => e.type === "incident.response.report" && knows(w, p, e),
    ),
    work: w.history.workItems.filter(
      (i) =>
        i.focus.kind === "other" &&
        i.focus.targetKey === "incident-response:briefing" &&
        i.access.kind === "private" &&
        i.access.personIds.includes(p),
    ),
    history: w.history.events.filter(
      (e) => e.type.startsWith("incident.response.") && knows(w, p, e),
    ),
  };
}
