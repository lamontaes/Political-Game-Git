import { personName } from "./people";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { recordWorldEvent } from "./world";
import type { EntityId, World } from "./types";

/**
 * One authored, disclosed response to a delivered public service.
 *
 * Rule service-delivery-response-v1. When the sponsor publishes the dated
 * report of a service period that was actually paid and delivered, one
 * legislative colleague who recorded a yea on that same appropriation and sat
 * in its recorded sitting reads the report in the Civic Ledger and acknowledges
 * the delivered service to the sponsor. The effect is exactly:
 *
 * - the colleague's media knowledge of the published report;
 * - one private acknowledgment event naming both people;
 * - one minor "strengthened" relationship interaction between them;
 * - the sponsor's direct knowledge of that acknowledgment.
 *
 * Nothing else changes: no approval rating, vote, opinion score, ridership or
 * travel claim, and no one who lacks a recorded yea or who cannot read the
 * report reacts. Every write is keyed to the publication and the colleague, so
 * a repeat or a replay applies nothing twice. Existing writers only.
 */
export const SERVICE_DELIVERY_RESPONSE_RULE = "service-delivery-response-v1";

const REPORT_KEY_PREFIX = "transit-report:";

export function respondToPublishedServiceReport(
  world: World,
  input: { readonly reportEventId: EntityId },
): World {
  const report = world.history.events.find(
    (event) =>
      event.id === input.reportEventId &&
      event.type === "transit.service-report-published",
  );
  if (!report || !report.stableKey.startsWith(REPORT_KEY_PREFIX)) return world;
  // Only a first edition that is already out can be read.
  const publication = (world.history.publications ?? []).find(
    (row) =>
      row.sourceEventId === report.id &&
      row.correctsPublicationId === null &&
      row.publishedAt <= world.currentDate,
  );
  if (!publication) return world;
  const settlement = world.history.events.find(
    (event) =>
      event.id === report.stableKey.slice(REPORT_KEY_PREFIX.length) &&
      event.type === "transit.service-period-settled",
  );
  if (!settlement) return world;
  // Delivered means paid through the public account and realized as service.
  const paid = world.history.resourceFlows.some(
    (flow) =>
      flow.basisReference.kind === "public-funding" &&
      settlement.involvedEntityIds.includes(flow.id),
  );
  const delivered = world.history.policyRealizations.some(
    (row) =>
      settlement.involvedEntityIds.includes(row.estimateId) &&
      row.consequences.length > 0,
  );
  if (!paid || !delivered) return world;
  const measure = (world.history.legislativeMeasures ?? []).find((row) =>
    report.involvedEntityIds.includes(row.id),
  );
  const sponsorId = measure?.sponsorPersonId ?? null;
  if (!measure || !sponsorId || !world.people[sponsorId]) return world;
  const sittingColleagues = new Set(
    world.history.events
      .filter(
        (event) =>
          event.type === "legislation.recorded-fictional-sitting-admitted" &&
          event.involvedEntityIds.includes(measure.id),
      )
      .flatMap((event) =>
        event.participants
          .filter((row) => row.role === "other:fictional-legislative-colleague")
          .map((row) => row.personId),
      ),
  );
  const supporters = [
    ...new Set(
      (world.history.legislativeVotes ?? [])
        .filter((vote) => vote.measureId === measure.id)
        .flatMap((vote) => vote.dispositions)
        .filter(
          (row) =>
            row.disposition === "yea" &&
            row.personId !== null &&
            row.personId !== sponsorId &&
            sittingColleagues.has(row.personId) &&
            !!world.people[row.personId],
        )
        .map((row) => row.personId!),
    ),
  ].sort();
  const colleagueId = supporters[0];
  if (!colleagueId) return world;
  const key = `${SERVICE_DELIVERY_RESPONSE_RULE}:${publication.id}:${colleagueId}`;
  if (world.history.events.some((event) => event.stableKey === `${key}:event`))
    return world;

  const colleague = world.people[colleagueId]!;
  const name = personName(colleague);
  let next = recordEventKnowledge(world, {
    stableKey: `${key}:read-report`,
    personId: colleagueId,
    eventId: report.id,
    learnedAt: world.currentDate,
    believedSummary: `Read the dated ${publication.outletName} service report on ${measure.designation}.`,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "media",
      outlet: publication.outletName,
      reference: publication.id,
    },
  });
  const summary = `${name}, who voted for ${measure.designation}, read the published service report and acknowledged the delivered service to you.`;
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type: "transit.service-delivery-acknowledged",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: report.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        ...report.involvedEntityIds,
        colleagueId,
        sponsorId,
        publication.id,
      ]),
    ].sort(),
    participants: [
      {
        personId: colleagueId,
        role: "agency:acknowledgment",
        detail: `Authored response ${SERVICE_DELIVERY_RESPONSE_RULE}: a recorded supporter who read the published report.`,
      },
      {
        personId: sponsorId,
        role: "other:acknowledgment-recipient",
        detail: "Received the colleague's acknowledgment.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.response", SERVICE_DELIVERY_RESPONSE_RULE],
    summary,
    context: {
      location: null,
      socialContext: `Authored game response (${SERVICE_DELIVERY_RESPONSE_RULE}): a colleague with a recorded yea on this appropriation, able to read its published report, acknowledges delivered service once. No approval, vote or ridership effect is recorded.`,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = recordRelationshipInteraction(next, {
    stableKey: `${key}:relationship`,
    personIds: [colleagueId, sponsorId],
    eventId,
    occurredAt: next.currentDate,
    kind: "support:delivered-service-acknowledged",
    change: "strengthened",
    significance: "minor",
    summary,
    tags: ["transit.response", SERVICE_DELIVERY_RESPONSE_RULE],
  });
  return recordEventKnowledge(next, {
    stableKey: `${key}:sponsor-notice`,
    personId: sponsorId,
    eventId,
    learnedAt: next.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
