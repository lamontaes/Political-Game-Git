import { campaignPlaceCounts } from "./campaign-operating-costs";
import type { EntityId, World } from "./types";
import { requireCampaign } from "./campaign-queries";

/** A research comparison used only until this world records comparable campaigns. */
export const CAMPAIGN_SPENDING_RESEARCH_REFERENCE = {
  amountMinorUnits: 3_266_500,
  source: "Massachusetts 2022 average state House candidate spending ($32,665)",
  estimated: true,
} as const;

export interface RecordedCampaignSpend {
  readonly households: number;
  readonly amountMinorUnits: number;
}

/** Median spend among recorded campaigns between half and twice this place's size. */
export function comparableCampaignSpendFromRecords(
  households: number,
  records: readonly RecordedCampaignSpend[],
): number | null {
  const comparable = records
    .filter(
      (record) =>
        record.households >= households / 2 &&
        record.households <= households * 2,
    )
    .map((record) => record.amountMinorUnits)
    .sort((a, b) => a - b);
  if (!comparable.length) return null;
  return comparable[Math.floor((comparable.length - 1) / 2)]!;
}

export function campaignSpendingComparison(
  world: World,
  campaignId: EntityId,
): {
  readonly amountMinorUnits: number;
  readonly basis: "recorded-comparable-races" | "research-fallback";
  readonly sampleSize: number;
  readonly estimated: true;
} {
  const own = requireCampaign(world, campaignId);
  const households = campaignPlaceCounts(world, campaignId).households;
  const spend = new Map<EntityId, number>();
  for (const purchase of world.history.campaignPurchases ?? []) {
    if (purchase.campaignId === own.id) continue;
    const campaign = world.history.campaigns?.find(
      (row) => row.id === purchase.campaignId,
    );
    if (!campaign || campaign.treasuryCurrency !== own.treasuryCurrency)
      continue;
    spend.set(
      campaign.id,
      (spend.get(campaign.id) ?? 0) + purchase.totalMinorUnits,
    );
  }
  const records = [...spend].flatMap(([id, amountMinorUnits]) => {
    const campaign = world.history.campaigns?.find((row) => row.id === id);
    return campaign
      ? [
          {
            households: campaignPlaceCounts(world, campaign.id).households,
            amountMinorUnits,
          },
        ]
      : [];
  });
  const amountMinorUnits = comparableCampaignSpendFromRecords(
    households,
    records,
  );
  return amountMinorUnits === null
    ? {
        amountMinorUnits: CAMPAIGN_SPENDING_RESEARCH_REFERENCE.amountMinorUnits,
        basis: "research-fallback",
        sampleSize: 0,
        estimated: true,
      }
    : {
        amountMinorUnits,
        basis: "recorded-comparable-races",
        sampleSize: records.filter(
          (row) =>
            row.households >= households / 2 &&
            row.households <= households * 2,
        ).length,
        estimated: true,
      };
}
