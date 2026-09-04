import { resourcePositionAt } from "./resource-queries";
import type { ResourcePositionSnapshot } from "./resource-queries";
import type {
  CampaignActionRecord,
  CampaignActionResultRecord,
  CampaignRecord,
  CampaignStateRecord,
  EntityId,
  World,
} from "./types";

/**
 * Reading a campaign without reading the electorate.
 *
 * Everything here is safe to put in front of a player. Canonical support — the
 * number the election is actually decided from — is deliberately absent, and
 * lives in `campaigns.ts` where the barrel does not re-export it. What the
 * player gets instead is the campaign's own fallible reading of it, which is a
 * different record with a different meaning.
 */

export function campaigns(world: World): readonly CampaignRecord[] {
  return world.history.campaigns ?? [];
}

export function campaignStateRecords(
  world: World,
): readonly CampaignStateRecord[] {
  return world.history.campaignStates ?? [];
}

export function campaignActionRecords(
  world: World,
): readonly CampaignActionRecord[] {
  return world.history.campaignActions ?? [];
}

export function campaignActionResultRecords(
  world: World,
): readonly CampaignActionResultRecord[] {
  return world.history.campaignActionResults ?? [];
}

export function campaignById(
  world: World,
  campaignId: EntityId,
): CampaignRecord | null {
  return (
    campaigns(world).find((campaign) => campaign.id === campaignId) ?? null
  );
}

export function requireCampaign(
  world: World,
  campaignId: EntityId,
): CampaignRecord {
  const campaign = campaignById(world, campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  return campaign;
}

/** The most recent campaign this person ran, won or lost. */
export function campaignForCandidate(
  world: World,
  candidatePersonId: EntityId,
): CampaignRecord | null {
  return (
    [...campaigns(world)]
      .reverse()
      .find((campaign) => campaign.candidatePersonId === candidatePersonId) ??
    null
  );
}

export function campaignForContest(
  world: World,
  contestId: EntityId,
): CampaignRecord | null {
  return (
    campaigns(world).find((campaign) => campaign.contestId === contestId) ??
    null
  );
}

export function campaignState(
  world: World,
  campaignId: EntityId,
): CampaignStateRecord {
  const state = campaignStateRecords(world)
    .filter((candidate) => candidate.campaignId === campaignId)
    .at(-1);
  if (!state) throw new Error(`Campaign state is missing: ${campaignId}`);
  return state;
}

/** The campaign this person is still running, if they are running one. */
export function activeCampaignForCandidate(
  world: World,
  candidatePersonId: EntityId,
): CampaignRecord | null {
  const campaign = campaignForCandidate(world, candidatePersonId);
  if (!campaign) return null;
  return campaignState(world, campaign.id).status === "active"
    ? campaign
    : null;
}

export function campaignActions(
  world: World,
  campaignId: EntityId,
): readonly CampaignActionRecord[] {
  return campaignActionRecords(world).filter(
    (action) => action.campaignId === campaignId,
  );
}

export function campaignActionById(
  world: World,
  actionId: EntityId,
): CampaignActionRecord | null {
  return (
    campaignActionRecords(world).find((action) => action.id === actionId) ??
    null
  );
}

export function campaignActionForActivity(
  world: World,
  activityId: EntityId,
): CampaignActionRecord | null {
  return (
    campaignActionRecords(world).find(
      (action) => action.scheduledActivityId === activityId,
    ) ?? null
  );
}

export function campaignActionResult(
  world: World,
  actionId: EntityId,
): CampaignActionResultRecord | null {
  return (
    campaignActionResultRecords(world).find(
      (result) => result.campaignActionId === actionId,
    ) ?? null
  );
}

/** Results for one campaign, oldest first. */
export function campaignResultsFor(
  world: World,
  campaignId: EntityId,
): readonly CampaignActionResultRecord[] {
  const actionIds = new Set(
    campaignActions(world, campaignId).map((action) => action.id),
  );
  return campaignActionResultRecords(world)
    .filter((result) => actionIds.has(result.campaignActionId))
    .sort((left, right) => left.sequence - right.sequence);
}

/**
 * The committee's money, read through the ordinary resource system. There is no
 * campaign wallet; this is a position like any other, owned by an organization.
 */
export function campaignTreasuryPosition(
  world: World,
  campaign: CampaignRecord,
): ResourcePositionSnapshot | undefined {
  return resourcePositionAt(
    world,
    { kind: "organization", organizationId: campaign.organizationId },
    campaign.treasuryCurrency,
  );
}

/* -------------------------------------------------------------------------- */

export function campaignHistoryRecords(
  world: World,
): readonly (
  | CampaignRecord
  | CampaignStateRecord
  | CampaignActionRecord
  | CampaignActionResultRecord
)[] {
  return [
    ...campaigns(world),
    ...campaignStateRecords(world),
    ...campaignActionRecords(world),
    ...campaignActionResultRecords(world),
  ];
}

export function campaignEntityExists(world: World, id: EntityId): boolean {
  return campaignHistoryRecords(world).some((record) => record.id === id);
}

export function campaignEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = campaignHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  const date =
    "filedAt" in record
      ? record.filedAt
      : "effectiveAt" in record
        ? record.effectiveAt
        : "completedAt" in record
          ? record.completedAt
          : record.createdAt;
  return date <= asOfDate;
}
