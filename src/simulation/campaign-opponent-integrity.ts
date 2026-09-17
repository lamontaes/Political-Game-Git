import {
  assertCampaignRecordIdentity,
  assertCampaignRecordsOrdered,
} from "./campaign-integrity";
import type {
  CampaignOpponentRecord,
  CampaignOpponentStepKind,
  CampaignPlanEmphasis,
} from "./campaign-life-types";
import {
  campaignOpponentRecords,
  campaignOpponentStepRecords,
} from "./campaign-queries";
import type { CampaignRecord, EntityId, World } from "./types";

const EMPHASES: readonly CampaignPlanEmphasis[] = [
  "field",
  "communications",
  "relationships",
];

const STEP_KINDS: readonly CampaignOpponentStepKind[] = [
  "field-event",
  "fundraising",
  "messaging",
  "support-request",
];

const DECISIONS: readonly string[] = ["granted", "declined", "deferred"];

/**
 * The event type each step kind writes. Kept here rather than imported from
 * `campaign-opponents.ts` so integrity never depends on the writer module.
 */
const STEP_EVENT_TYPES: Readonly<Record<CampaignOpponentStepKind, string>> = {
  fundraising: "campaign.opponent-fundraising-reported",
  messaging: "campaign.opponent-message-released",
  "field-event": "campaign.opponent-field-event",
  "support-request": "campaign.opponent-support-decided",
};

function fail(message: string, id: EntityId): never {
  throw new Error(`${message}: ${id}`);
}

/**
 * Integrity for CRUNCH46 independent opponent campaigns and their steps.
 *
 * An opponent is a real candidate in a contest the player is running in, with
 * its own committee, account and field lead written before it. A step is one
 * weekly act with the event that describes it; money moves only for
 * fundraising and messaging and only in the direction each implies, support
 * moves only for messaging and field events, and only a support request
 * carries a chapter's decision.
 */
export function assertCampaignOpponentIntegrity(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
): void {
  const opponents = campaignOpponentRecords(world);
  const steps = campaignOpponentStepRecords(world);
  if (opponents.length === 0 && steps.length === 0) return;
  assertCampaignRecordsOrdered(opponents, "campaign opponent");
  assertCampaignRecordsOrdered(steps, "campaign opponent step");

  const organizationById = new Map(
    world.history.organizations.map((record) => [record.id, record]),
  );
  const positionById = new Map(
    world.history.resourcePositions.map((record) => [record.id, record]),
  );
  const contests = world.history.electionContests ?? [];

  const opponentById = new Map<EntityId, CampaignOpponentRecord>();
  const opponentPairs = new Set<string>();
  for (const opponent of opponents) {
    assertCampaignRecordIdentity(ids, world, opponent, "campaign-opponent");
    const contest = contests.find((record) => record.id === opponent.contestId);
    const rival = campaignById.get(opponent.rivalCampaignId);
    if (
      !contest ||
      contest.sequence >= opponent.sequence ||
      !contest.candidatePersonIds.includes(opponent.candidatePersonId) ||
      !rival ||
      rival.sequence >= opponent.sequence ||
      rival.contestId !== contest.id ||
      rival.candidatePersonId === opponent.candidatePersonId ||
      !world.people[opponent.candidatePersonId]
    ) {
      fail("Campaign opponent is not a rival in its contest", opponent.id);
    }
    const pair = `${opponent.contestId}|${opponent.candidatePersonId}`;
    if (opponentPairs.has(pair)) {
      fail("Campaign opponent is duplicated for its contest", opponent.id);
    }
    opponentPairs.add(pair);
    if (!EMPHASES.includes(opponent.emphasis)) {
      fail("Campaign opponent has an unknown emphasis", opponent.id);
    }
    for (const organizationId of [
      opponent.committeeOrganizationId,
      opponent.donorPoolOrganizationId,
      opponent.vendorOrganizationId,
    ]) {
      const organization = organizationById.get(organizationId);
      if (!organization || organization.sequence >= opponent.sequence) {
        fail("Campaign opponent organization is missing", opponent.id);
      }
    }
    const position = positionById.get(opponent.treasuryPositionId);
    if (
      !position ||
      position.sequence >= opponent.sequence ||
      position.owner.kind !== "organization" ||
      position.owner.organizationId !== opponent.committeeOrganizationId
    ) {
      fail("Campaign opponent treasury is invalid", opponent.id);
    }
    if (
      !world.people[opponent.fieldLeadPersonId] ||
      opponent.fieldLeadPersonId === opponent.candidatePersonId ||
      opponent.createdAt < rival.filedAt
    ) {
      fail("Campaign opponent field lead or date is invalid", opponent.id);
    }
    opponentById.set(opponent.id, opponent);
  }

  const stepWeeks = new Set<string>();
  for (const step of steps) {
    assertCampaignRecordIdentity(ids, world, step, "campaign-opponent-step");
    const opponent = opponentById.get(step.opponentId);
    if (!opponent || opponent.sequence >= step.sequence) {
      fail("Campaign opponent step has no earlier opponent", step.id);
    }
    if (!STEP_KINDS.includes(step.kind) || step.weekStart > step.createdAt) {
      fail("Campaign opponent step kind or week is invalid", step.id);
    }
    const week = `${step.opponentId}|${step.weekStart}`;
    if (stepWeeks.has(week)) {
      fail("Campaign opponent acted twice in one week", step.id);
    }
    stepWeeks.add(week);
    const event = world.history.events.find(
      (record) => record.id === step.outcomeEventId,
    );
    if (
      !event ||
      event.sequence >= step.sequence ||
      event.occurredAt !== step.createdAt ||
      event.type !== STEP_EVENT_TYPES[step.kind] ||
      !event.involvedEntityIds.includes(opponent.candidatePersonId)
    ) {
      fail("Campaign opponent step event is invalid", step.id);
    }

    if (step.kind !== "fundraising" && step.kind !== "messaging") {
      if (step.resourceFlowId !== null || step.amount !== null) {
        fail("Campaign opponent step invented a transfer", step.id);
      }
    } else {
      const flow = world.history.resourceFlows.find(
        (record) => record.id === step.resourceFlowId,
      );
      const transfer = world.history.resourceTransferOutcomes.find(
        (record) =>
          record.resourceFlowId === step.resourceFlowId &&
          record.status === "completed",
      );
      const [source, recipient, basis] =
        step.kind === "fundraising"
          ? [
              opponent.donorPoolOrganizationId,
              opponent.committeeOrganizationId,
              "custom:campaign-contribution",
            ]
          : [
              opponent.committeeOrganizationId,
              opponent.vendorOrganizationId,
              "custom:campaign-expenditure",
            ];
      if (
        !flow ||
        !transfer ||
        step.amount === null ||
        step.amount.minorUnits <= 0 ||
        flow.sequence >= step.sequence ||
        transfer.sequence >= step.sequence ||
        flow.source.kind !== "organization" ||
        flow.source.organizationId !== source ||
        flow.recipient.kind !== "organization" ||
        flow.recipient.organizationId !== recipient ||
        flow.basisKind !== basis ||
        flow.restrictionKind !== "purpose:campaign" ||
        flow.provenance.kind !== "simulated-event" ||
        flow.provenance.eventId !== step.outcomeEventId ||
        transfer.transferredAmount.minorUnits !== step.amount.minorUnits ||
        transfer.transferredAmount.currency !== step.amount.currency
      ) {
        fail("Campaign opponent step money is invalid", step.id);
      }
    }

    const rival = campaignById.get(opponent.rivalCampaignId)!;
    if (step.kind !== "messaging" && step.kind !== "field-event") {
      if (step.supportStateIds.length !== 0) {
        fail("Campaign opponent step moved support without work", step.id);
      }
    } else {
      const expected = rival.candidateSupportScopes
        .map((scope) => scope.segmentKey)
        .sort();
      const states = step.supportStateIds.map((id) =>
        world.history.metricStates.find(
          (state) => state.id === id && state.sequence < step.sequence,
        ),
      );
      if (
        states.some(
          (state) =>
            !state ||
            state.metricId !== rival.supportMetricId ||
            state.scope.jurisdictionId !== rival.jurisdictionId ||
            state.referencePeriod.kind !== "point" ||
            state.referencePeriod.at !== step.createdAt,
        ) ||
        JSON.stringify(
          states.map((state) => state?.scope.segmentKey).sort(),
        ) !== JSON.stringify(expected)
      ) {
        fail("Campaign opponent step support is invalid", step.id);
      }
    }

    if (step.kind !== "support-request") {
      if (step.supportDecision !== null) {
        fail("Campaign opponent step carries a stray decision", step.id);
      }
    } else {
      const decision = step.supportDecision;
      const organization = decision
        ? organizationById.get(decision.organizationId)
        : undefined;
      if (
        !decision ||
        !DECISIONS.includes(decision.decision) ||
        !organization ||
        organization.sequence >= step.sequence ||
        !world.people[decision.decidedByPersonId] ||
        decision.decidedByPersonId === opponent.candidatePersonId ||
        !event.involvedEntityIds.includes(decision.decidedByPersonId) ||
        !event.involvedEntityIds.includes(decision.organizationId)
      ) {
        fail("Campaign opponent support decision is invalid", step.id);
      }
    }
  }
}
