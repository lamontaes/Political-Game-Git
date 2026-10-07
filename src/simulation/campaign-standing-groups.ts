import formationRules from "../../data/research/campaign-reality/standing-group-formation.json" with { type: "json" };
import {
  campaigns,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignState,
  requireCampaign,
} from "./campaign-queries";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import {
  recordOrganizationProfile,
  createOrganizationParticipation,
} from "./life";
import { organizationProfileAt, workStatusAt } from "./life-queries";
import { viewOfOfficial } from "./official-view-reads";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { workSchedulesFor } from "./living-world/work-schedules";
import { personName } from "./people";
import { isPersonAliveAt } from "./vitality-integrity";
import { currentLifeCutoff } from "./life-queries";
import type {
  CampaignRecord,
  DecisionConsideration,
  EntityId,
  World,
} from "./types";

export const STANDING_GROUP_CLASSIFICATION = "membership:standing-group";
export const STANDING_GROUP_MEMBER_KIND = "membership:standing-group-member";
export const STANDING_GROUP_MEMBER_ROLE = "member:standing-group";
export const STANDING_GROUP_LEADER_ROLE = "leader:standing-group";

export interface StandingGroupJoinDecision {
  readonly personId: EntityId;
  readonly name: string;
  readonly outcome: "joined" | "declined" | "undecided";
  readonly reasonKeys: readonly string[];
}

export interface FormCampaignStandingGroupResult {
  readonly world: World;
  readonly organizationId: EntityId | null;
  readonly decisions: readonly StandingGroupJoinDecision[];
}

/** The standing group reuses its campaign committee and its history. */
export function standingGroupForCampaign(
  world: World,
  campaignId: EntityId,
): EntityId | null {
  const campaign = campaigns(world).find((row) => row.id === campaignId);
  if (!campaign) return null;
  return organizationProfileAt(world, campaign.organizationId)
    ?.classification === STANDING_GROUP_CLASSIFICATION
    ? campaign.organizationId
    : null;
}

/**
 * Turn a campaign committee into a standing group and ask recorded volunteers
 * and strong campaign contacts whether they want to join. The record layer
 * stores decision keys and participation; text generation belongs to the
 * English and presentation layers.
 */
export function formCampaignStandingGroup(
  inputWorld: World,
  input: { readonly campaignId: EntityId; readonly name: string },
): FormCampaignStandingGroupResult {
  const campaign = requireCampaign(inputWorld, input.campaignId);
  if (
    inputWorld.control.kind !== "person" ||
    inputWorld.control.personId !== campaign.candidatePersonId
  ) {
    throw new Error("Only the candidate can form their campaign's group.");
  }
  if (
    !formationRules.standingGroupAllowedFrom.includes(
      campaignState(inputWorld, campaign.id).status,
    )
  ) {
    throw new Error("This campaign cannot become a standing group now.");
  }
  if (standingGroupForCampaign(inputWorld, campaign.id)) {
    throw new Error("This campaign already became a standing group.");
  }
  const name = input.name.trim();
  if (!name) throw new Error("A standing group needs a name.");

  const candidateIds = eligibleMembers(inputWorld, campaign);
  let world = ensurePeopleTraits(inputWorld, candidateIds);
  const proposalKey = nextProposalKey(world, campaign);
  const decisions: StandingGroupJoinDecision[] = [];
  const joinedIds: EntityId[] = [];

  for (const personId of candidateIds) {
    const evaluation = evaluateDecision(world, {
      stableKey: `${proposalKey}:join:${personId}`,
      decisionType: "campaign.standing-group-membership",
      actorPersonId: personId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: {
        kind: "entity:campaign",
        key: campaign.id,
        entityId: campaign.organizationId,
      },
      options: [
        { key: "join", label: "join", description: "standing-group:join" },
        {
          key: "decline",
          label: "decline",
          description: "standing-group:decline",
        },
      ],
      constraints: [],
      considerations: membershipConsiderations(
        world,
        campaign,
        personId,
        proposalKey,
      ),
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    world = recordDurableDecisionTrace(world, evaluation);
    const outcome =
      evaluation.outcomeKind === "selected"
        ? evaluation.selectedOptionKey === "join"
          ? "joined"
          : "declined"
        : "undecided";
    if (outcome === "joined") joinedIds.push(personId);
    decisions.push({
      personId,
      name: personName(world.people[personId]!),
      outcome,
      reasonKeys: evaluation.context.considerations.map(
        (consideration) => consideration.explanation,
      ),
    });
  }

  if (joinedIds.length === 0) return { world, organizationId: null, decisions };

  const previousProfile = organizationProfileAt(world, campaign.organizationId);
  if (!previousProfile)
    throw new Error("The campaign committee has no recorded profile.");
  world = recordOrganizationProfile(world, {
    stableKey: `${proposalKey}:standing-group-profile`,
    organizationId: campaign.organizationId,
    effectiveAt: world.currentDate,
    name,
    classification: STANDING_GROUP_CLASSIFICATION,
    locationJurisdictionId: campaign.jurisdictionId,
    provenance: {
      kind: "authored",
      note: "The candidate chose to continue the committee as a standing group.",
    },
    supersedesProfileId: previousProfile.id,
  });
  world = createOrganizationParticipation(world, {
    stableKey: `${proposalKey}:founder`,
    personId: campaign.candidatePersonId,
    organizationId: campaign.organizationId,
    startedAt: world.currentDate,
    kind: STANDING_GROUP_MEMBER_KIND,
    roleKind: STANDING_GROUP_LEADER_ROLE,
    context: null,
    provenance: { kind: "authored", note: "Campaign organizer choice." },
  });
  for (const personId of joinedIds) {
    world = createOrganizationParticipation(world, {
      stableKey: `${proposalKey}:member:${personId}`,
      personId,
      organizationId: campaign.organizationId,
      startedAt: world.currentDate,
      kind: STANDING_GROUP_MEMBER_KIND,
      roleKind: STANDING_GROUP_MEMBER_ROLE,
      context: null,
      provenance: { kind: "authored", note: "Recorded membership decision." },
    });
  }
  return { world, organizationId: campaign.organizationId, decisions };
}

function eligibleMembers(world: World, campaign: CampaignRecord): EntityId[] {
  const alive = (personId: EntityId) =>
    isPersonAliveAt(world, personId, currentLifeCutoff(world));
  const volunteers = new Set(
    campaign.staffWorkRelationshipIds.flatMap((workId) => {
      const work = world.history.workRelationships.find(
        (row) => row.id === workId,
      );
      return (work?.kind === "volunteer:campaign-staff" ||
        work?.kind === "employment:campaign-staff") &&
        workStatusAt(world, work.id)?.status === "active" &&
        alive(work.personId)
        ? [work.personId]
        : [];
    }),
  );
  const campaignActivities = new Set(
    campaignLifeActivityRecords(world)
      .filter((activity) => activity.campaignId === campaign.id)
      .map((activity) => activity.id),
  );
  const campaignContactEvents = new Set(
    campaignLifeOutcomeRecords(world)
      .filter((outcome) => campaignActivities.has(outcome.activityId))
      .map((outcome) => outcome.outcomeEventId),
  );
  const strongContacts = world.history.relationshipInteractions.flatMap(
    (interaction) => {
      if (
        !interaction.eventId ||
        !campaignContactEvents.has(interaction.eventId) ||
        !interaction.tags.includes("campaign.contact") ||
        !interaction.personIds.includes(campaign.candidatePersonId)
      )
        return [];
      const personId = interaction.personIds.find(
        (id) => id !== campaign.candidatePersonId,
      );
      if (!personId || !alive(personId)) return [];
      const belief = viewOfOfficial(
        world,
        personId,
        campaign.candidatePersonId,
      ).belief;
      return belief?.position === "support" &&
        (belief.conviction === "strong" || belief.conviction === "settled")
        ? [personId]
        : [];
    },
  );
  return [...new Set([...volunteers, ...strongContacts])].sort();
}

function membershipConsiderations(
  world: World,
  campaign: CampaignRecord,
  personId: EntityId,
  proposalKey: string,
): readonly DecisionConsideration[] {
  const key = `${proposalKey}:join:${personId}`;
  const considerations: DecisionConsideration[] = [];
  if (
    campaign.staffWorkRelationshipIds.some((workId) =>
      world.history.workRelationships.some(
        (work) =>
          work.id === workId &&
          work.personId === personId &&
          (work.kind === "volunteer:campaign-staff" ||
            work.kind === "employment:campaign-staff"),
      ),
    )
  ) {
    considerations.push({
      stableKey: `${key}:campaign-work`,
      optionKey: "join",
      sourceType: "context:campaign-work",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "standing-group:previously-volunteered",
      sourceRefs: [],
    });
  }
  const belief = viewOfOfficial(
    world,
    personId,
    campaign.candidatePersonId,
  ).belief;
  if (belief) {
    considerations.push({
      stableKey: `${key}:candidate-view`,
      optionKey: belief.position === "support" ? "join" : "decline",
      sourceType: "belief:official",
      direction: "supports",
      importance:
        belief.conviction === "settled" || belief.salience === "central"
          ? "strong"
          : belief.conviction === "strong" || belief.salience === "high"
            ? "moderate"
            : "slight",
      confidence: "high",
      explanation: `standing-group:candidate-view:${belief.position}`,
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  }
  const scheduledHours = workSchedulesFor(world, personId).reduce(
    (sum, schedule) => sum + schedule.weeklyHours,
    0,
  );
  const freeHours = Math.max(0, 168 - scheduledHours);
  considerations.push({
    stableKey: `${key}:recorded-free-time`,
    optionKey: freeHours >= 96 ? "join" : "decline",
    sourceType: "context:work-schedule",
    direction: "supports",
    importance:
      freeHours >= 120 ? "strong" : freeHours >= 72 ? "moderate" : "slight",
    confidence: "medium",
    explanation:
      freeHours >= 96
        ? "standing-group:work-schedule-leaves-room"
        : "standing-group:work-schedule-leaves-little-room",
    sourceRefs: [],
  });
  considerations.push(
    ...traitConsiderations(world, personId, key, [
      {
        trait: "sociability",
        pole: "high",
        optionKey: "join",
        explanation: "standing-group:trait:sociability",
      },
      {
        trait: "reliability",
        pole: "high",
        optionKey: "join",
        explanation: "standing-group:trait:reliability",
      },
      {
        trait: "risk",
        pole: "high",
        optionKey: "join",
        explanation: "standing-group:trait:risk",
      },
    ]),
  );
  return considerations;
}

function nextProposalKey(world: World, campaign: CampaignRecord): string {
  const prefix = `standing-group:campaign:${campaign.id}:proposal:`;
  const attempts = world.history.decisionTraces.filter((trace) =>
    trace.stableKey.startsWith(prefix),
  ).length;
  return `${prefix}${attempts + 1}:${world.currentDate}`;
}
