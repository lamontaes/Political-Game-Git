import {
  createDemoWorld,
  createOrganization,
  createWorkRelationship,
  evaluateIncident,
  occurIncident,
  recordEventKnowledge,
} from "./index";
import { reportIncident } from "./incident-response";
const provenance = {
  kind: "authored" as const,
  note: "Explicit fictional incident response diagnostic premises, not empirical cadence or public assistance law.",
};
export function responseFixture(physical = false) {
  let w = createDemoWorld("incident-response7");
  const person = w.personOrder[0]!,
    staff = w.personOrder[1]!,
    jurisdictionId = w.jurisdictionOrder[0]!;
  w = { ...w, control: { kind: "person", personId: person } };
  if (physical) {
    const definitionId = Object.values(w.incidentCatalog.definitions).find(
      (d) => d.incidentKind === "incident:natural-hazard",
    )!.id;
    const share = { numerator: 1, denominator: 1, unit: "rate:share" as const };
    const evaluation = evaluateIncident(w, {
      definitionId,
      evaluationKey: "response-drill",
      scope: { jurisdictionId, segmentKey: null },
      evaluatedAt: w.currentDate,
      cutoff: {
        asOfDate: w.currentDate,
        historySequenceExclusive: w.history.nextSequence,
      },
      exposure: share,
      vulnerability: share,
      resilience: share,
      consequences: [],
    });
    w = occurIncident(w, {
      stableKey: "fictional-hazard",
      evaluation,
      summary:
        "A design-authored localized hazard occurred in the synthetic jurisdiction. Personal damage and intervention outcomes remain unknown.",
      visibility: "public",
    });
    const onset = w.history.incidents.at(-1)!.onsetEventId;
    w = recordEventKnowledge(w, {
      stableKey: "fictional-hazard-notice",
      personId: person,
      eventId: onset,
      learnedAt: w.currentDate,
      believedSummary:
        "The available notice records a localized hazard, without individual damage measurements.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: onset },
    });
  }

  w = createOrganization(w, {
    stableKey: "response-team",
    formedAt: w.currentDate,
    provenance,
    initialProfile: {
      name: "Fictional response association",
      classification: "custom:response-association",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = w.history.organizations.at(-1)!.id;
  for (const p of [person, staff])
    w = createWorkRelationship(w, {
      stableKey: `response-role:${p}`,
      personId: p,
      organizationId,
      startedAt: w.currentDate,
      kind: "volunteer:response",
      compensation: "unpaid",
      authority: p === person ? "directs-others" : "directed",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: p === person ? "Coordinator" : "Report researcher",
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 0, maximumHours: 4 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
  if (!physical) {
    const definitionId = Object.values(w.incidentCatalog.definitions).find(
      (d) => d.occurrenceMode === "actor-initiated",
    )!.id;
    const share = { numerator: 1, denominator: 1, unit: "rate:share" as const };
    const evaluation = evaluateIncident(w, {
      definitionId,
      evaluationKey: "response-drill",
      scope: { jurisdictionId, segmentKey: null },
      evaluatedAt: w.currentDate,
      cutoff: {
        asOfDate: w.currentDate,
        historySequenceExclusive: w.history.nextSequence,
      },
      exposure: share,
      vulnerability: share,
      resilience: share,
      consequences: [],
    });
    w = occurIncident(w, {
      stableKey: "response-drill",
      evaluation,
      actorPersonId: person,
      summary:
        "A fictional civic response exercise was initiated; no physical damage or empirical frequency is claimed.",
      visibility: "private",
    });
  }
  const source = w.history.incidents.at(-1)!.onsetEventId;
  w = reportIncident(
    w,
    source,
    person,
    "The represented incident needs a review of available observations and unresolved requests.",
  );
  const reportId = w.history.events.at(-1)!.id;
  return { w, person, staff, jurisdictionId, organizationId, source, reportId };
}
