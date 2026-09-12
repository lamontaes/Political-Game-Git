import type { EntityId, World } from "../simulation";
import { projectCampaign } from "./campaign-projection";
import { CAMPAIGN_STOREFRONT_SCENE_ID } from "./scene-registry";
import { completedActivityHere } from "./scene-venues";
import type { DynamicSurfaceProjection } from "./surface-projection";

/** Actual committee name and recorded session title only. No inferred turnout,
 * call quota, support estimate or invented slogan fills the empty boards.
 */
export function projectLocationSurfaces(
  world: World,
  personId: EntityId,
  sceneId: string | null,
  base: DynamicSurfaceProjection,
): DynamicSurfaceProjection {
  if (sceneId !== CAMPAIGN_STOREFRONT_SCENE_ID) return base;
  const campaign = projectCampaign(world, personId);
  const activity = completedActivityHere(world, personId);
  if (!campaign.campaignId || !activity) return base;
  const facts = new Map(base.facts);
  if (campaign.committeeName)
    facts.set("campaign-name", {
      text: campaign.committeeName,
      channel: "public-record",
      provenance: `Canonical committee for campaign ${campaign.campaignId}`,
    });
  facts.set("headline", {
    text: activity.title,
    channel: "institutional-working",
    provenance: `Completed session ${activity.id}`,
  });
  return { facts, empty: base.empty };
}
