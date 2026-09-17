import { CAMPAIGN_LIFE_CATALOG } from "./campaign-life-catalog";
import {
  assertCampaignRecordIdentity,
  assertCampaignRecordsOrdered,
} from "./campaign-integrity";
import {
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
} from "./campaign-queries";
import type { CampaignLifeActivityRecord } from "./campaign-life-types";
import type { CampaignRecord, EntityId, World } from "./types";

/**
 * Integrity for CRUNCH46 party/campaign activity instances and their outcomes.
 * Owned by `campaign-life-activities.ts`.
 *
 * An activity must point at the invitation that created it and at a calendar
 * hold sourced from that invitation. An outcome must follow a completed hold
 * of its own activity, name an outcome event recorded that same day, and carry
 * only the fields its form can produce.
 */
export function assertCampaignLifeIntegrity(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
): void {
  const activities = campaignLifeActivityRecords(world);
  const outcomes = campaignLifeOutcomeRecords(world);
  if (activities.length === 0 && outcomes.length === 0) return;
  assertCampaignRecordsOrdered(activities, "campaign life activity");
  assertCampaignRecordsOrdered(outcomes, "campaign life outcome");

  const eventById = new Map(world.history.events.map((e) => [e.id, e]));
  const activityById = new Map(
    world.history.scheduledActivities.map((a) => [a.id, a]),
  );
  const latestState = (activityId: EntityId) =>
    world.history.scheduledActivityStates
      .filter((state) => state.activityId === activityId)
      .at(-1);

  const lifeActivityById = new Map<EntityId, CampaignLifeActivityRecord>();
  for (const record of activities) {
    assertCampaignRecordIdentity(ids, world, record, "campaign-life-activity");
    const fail = (why: string): never => {
      throw new Error(`Campaign life activity ${why}: ${record.id}`);
    };
    const invitation = eventById.get(record.invitationEventId);
    if (
      !invitation ||
      invitation.sequence >= record.sequence ||
      invitation.type !== "campaign.life-activity-offered"
    )
      fail("has no earlier invitation");
    if (
      !Object.hasOwn(CAMPAIGN_LIFE_CATALOG, record.form) ||
      record.catalogVersion.trim().length === 0
    )
      fail("names a form outside the catalog");
    if (
      record.origin !== "host-outreach" &&
      record.origin !== "subject-request"
    )
      fail("has an unknown origin");
    if (
      !world.people[record.hostPersonId] ||
      !world.people[record.subjectPersonId] ||
      record.hostPersonId === record.subjectPersonId
    )
      fail("names missing or identical people");
    if (
      !world.history.organizations.some(
        (organization) => organization.id === record.hostOrganizationId,
      )
    )
      fail("names a missing host organization");
    if (record.campaignId !== null) {
      const campaign = campaignById.get(record.campaignId);
      if (!campaign || campaign.candidatePersonId !== record.subjectPersonId)
        fail("serves a campaign that is not the subject's");
    }
    if (
      (record.form === "fundraiser" || record.form === "support-request") &&
      record.campaignId === null
    )
      fail("needs a campaign");
    const hold = activityById.get(record.scheduledActivityId);
    if (
      !hold ||
      hold.kind === "travel" ||
      hold.sequence >= record.sequence ||
      !hold.sourceEntityIds.includes(record.invitationEventId) ||
      !hold.participantPersonIds.includes(record.subjectPersonId) ||
      hold.responsiblePersonId !== record.subjectPersonId
    )
      fail("has no calendar hold sourced from its invitation");
    if (record.createdAt > world.currentDate) fail("is dated in the future");
    lifeActivityById.set(record.id, record);
  }

  const outcomeActivityIds = new Set<EntityId>();
  const knowledgeIds = new Set(world.history.knowledge.map((k) => k.id));
  const interactionIds = new Set(
    world.history.relationshipInteractions.map((r) => r.id),
  );
  for (const outcome of outcomes) {
    assertCampaignRecordIdentity(ids, world, outcome, "campaign-life-outcome");
    const fail = (why: string): never => {
      throw new Error(`Campaign life outcome ${why}: ${outcome.id}`);
    };
    const record = lifeActivityById.get(outcome.activityId);
    if (!record || record.sequence >= outcome.sequence)
      return fail("has no earlier activity");
    if (outcomeActivityIds.has(record.id)) fail("duplicates an outcome");
    outcomeActivityIds.add(record.id);
    if (outcome.attendance !== "attended" && outcome.attendance !== "condensed")
      fail("has an unknown attendance");
    const hold = activityById.get(outcome.scheduledActivityId);
    const state = hold ? latestState(hold.id) : undefined;
    if (
      !hold ||
      hold.kind === "travel" ||
      !hold.sourceEntityIds.includes(record.invitationEventId) ||
      state?.status !== "completed" ||
      state.sequence >= outcome.sequence
    )
      fail("does not follow a completed hold of its activity");
    const event = eventById.get(outcome.outcomeEventId);
    if (
      !event ||
      event.sequence >= outcome.sequence ||
      event.type !== "campaign.life-activity-attended" ||
      event.occurredAt !== outcome.completedAt
    )
      return fail("has no outcome event on its completion date");
    if (outcome.supportStateIds.length > 0) {
      if (record.campaignId === null) fail("moved support without a campaign");
      for (const stateId of outcome.supportStateIds) {
        if (
          !world.history.metricStates.some(
            (metricState) =>
              metricState.id === stateId &&
              metricState.sequence < outcome.sequence,
          )
        )
          fail("names a missing support state");
      }
    }
    if (
      record.form !== "fundraiser" &&
      (outcome.raisedAmount !== null || outcome.resourceFlowId !== null)
    )
      fail("moved money outside a fundraiser");
    if ((outcome.raisedAmount === null) !== (outcome.resourceFlowId === null))
      fail("has a partial money record");
    if (outcome.resourceFlowId !== null && outcome.raisedAmount !== null) {
      const flow = world.history.resourceFlows.find(
        (candidate) => candidate.id === outcome.resourceFlowId,
      );
      const campaign =
        record.campaignId === null
          ? undefined
          : campaignById.get(record.campaignId);
      if (
        !flow ||
        !campaign ||
        flow.recipient.kind !== "organization" ||
        flow.recipient.organizationId !== campaign.organizationId ||
        flow.basisKind !== "custom:campaign-contribution" ||
        outcome.raisedAmount.minorUnits <= 0 ||
        outcome.raisedAmount.currency !== campaign.treasuryCurrency
      )
        fail("moved money somewhere other than the committee");
    }
    if (record.form !== "support-request" && outcome.supportDecision !== null)
      fail("carries a support decision outside a support request");
    if (
      outcome.supportDecision !== null &&
      (outcome.supportDecision.decidedByPersonId !== record.hostPersonId ||
        outcome.supportDecision.organizationId !== record.hostOrganizationId)
    )
      fail("names the wrong decision maker");
    if (
      outcome.guidanceKnowledgeId !== null &&
      (record.form !== "candidate-guidance" ||
        !knowledgeIds.has(outcome.guidanceKnowledgeId))
    )
      fail("carries guidance it cannot");
    if (
      record.form === "candidate-guidance" &&
      outcome.guidanceKnowledgeId === null
    )
      fail("is guidance without knowledge");
    for (const personId of outcome.contactPersonIds) {
      if (
        !world.people[personId] ||
        !event.involvedEntityIds.includes(personId)
      )
        fail("names a contact who was not there");
    }
    for (const interactionId of outcome.relationshipInteractionIds) {
      if (!interactionIds.has(interactionId))
        fail("names a missing relationship interaction");
    }
  }
}
