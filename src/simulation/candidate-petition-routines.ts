import { modelCampaignFieldReach } from "./campaign-contact-calibration";
import { campaignById } from "./campaign-queries";
import { candidacyPackById } from "./candidacy-packs";
import { askToSign, petitionAskedPersonIds } from "./candidate-petitions";
import { recordedDistrictMembership } from "./district-residence";
import { requireElectionContest } from "./election-contests";
import { stableHash } from "./ids";
import { lifePlaceByJurisdictionId } from "./life-places";
import type { EntityId, World } from "./types";

export interface CompletePetitionCirculationInput {
  readonly campaignId: EntityId;
  readonly circulatorPersonId: EntityId;
  /** Stable identity of the completed routine block or helper shift. */
  readonly blockStableKey: string;
  readonly minutes: number;
  /** Residents of the relevant district, already ordered by `world.personOrder`. */
  readonly residentPersonIds: readonly EntityId[];
}

export interface CompletePetitionCirculationResult {
  readonly world: World;
  readonly askedPersonIds: readonly EntityId[];
  readonly reach: NonNullable<ReturnType<typeof modelCampaignFieldReach>>;
  readonly reachedCount: number;
}

/** Residents of the filed seat, in `world.personOrder` order. */
export function petitionResidentsForCampaign(
  world: World,
  campaignId: EntityId,
): readonly EntityId[] {
  const campaign = campaignById(world, campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  const contest = requireElectionContest(world, campaign.contestId);
  const binding = contest.office.districtBinding;
  if (binding) {
    return world.personOrder.filter(
      (personId) =>
        recordedDistrictMembership(
          world,
          personId,
          binding.chamber,
          world.currentDate,
        )?.binding.recordId === binding.recordId,
    );
  }
  if (lifePlaceByJurisdictionId(campaign.jurisdictionId)) {
    return world.personOrder.filter(
      (personId) =>
        world.people[personId]?.homeJurisdictionId === campaign.jurisdictionId,
    );
  }
  const stateKey = candidacyPackById(campaign.candidacyPackId)?.jurisdictionKey;
  if (!stateKey) return [];
  return world.personOrder.filter((personId) => {
    const home = world.people[personId]?.homeJurisdictionId;
    return (
      home !== undefined &&
      lifePlaceByJurisdictionId(home)?.stateJurisdictionKey === stateKey
    );
  });
}

/**
 * Complete one petition circulation block using the existing field reach
 * model, then ask actual people in stable world order. The caller supplies the
 * residents of the campaign district; no population-wide scan or clock tick
 * lives here. The first resident is offset by the block's stable key, and any
 * signer already asked (including a decliner) is skipped.
 *
 * This is also the integration seam for helper shifts: callers pass that
 * helper's recorded minutes and identity when the helper-hours writer lands.
 */
export function completePetitionCirculation(
  inputWorld: World,
  input: CompletePetitionCirculationInput,
): CompletePetitionCirculationResult {
  if (!input.blockStableKey.trim())
    throw new Error("Petition circulation needs a stable block key.");
  const reach = modelCampaignFieldReach("door-canvass", input.minutes);
  if (!reach || !reach.estimatedCompletedConversations)
    throw new Error("Petition circulation has no field conversation estimate.");
  const residents = input.residentPersonIds;
  if (new Set(residents).size !== residents.length)
    throw new Error("Petition circulation resident order contains duplicates.");
  for (const personId of residents) {
    if (!inputWorld.people[personId])
      throw new Error(`Unknown petition district resident: ${personId}`);
  }
  if (residents.length === 0)
    return { world: inputWorld, askedPersonIds: [], reach, reachedCount: 0 };

  // Use the model's conservative conversation bound as the count reached.
  // The upper bound remains available for callers to describe the estimate;
  // no person is randomly selected or given a chance to sign.
  const count = Math.min(
    residents.length,
    reach.estimatedCompletedConversations.min,
  );
  const start =
    Number.parseInt(stableHash(input.blockStableKey).slice(0, 8), 16) %
    residents.length;
  const ordered = Array.from(
    { length: residents.length },
    (_, index) => residents[(start + index) % residents.length]!,
  );
  const asked = petitionAskedPersonIds(inputWorld, input.campaignId);
  const selected = ordered
    .filter((personId) => !asked.has(personId))
    .slice(0, count);
  let world = inputWorld;
  const askedPersonIds: EntityId[] = [];
  for (const signerPersonId of selected) {
    const result = askToSign(world, {
      campaignId: input.campaignId,
      circulatorPersonId: input.circulatorPersonId,
      signerPersonId,
      at: world.currentDate,
    });
    world = result.world;
    askedPersonIds.push(signerPersonId);
  }
  return { world, askedPersonIds, reach, reachedCount: count };
}
