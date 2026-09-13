import { describe, it, expect } from "vitest";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import {
  fileForOffice,
  spendAnAfternoon,
  projectCampaign,
} from "./campaign-projection";
import { projectLocationSurfaces } from "./location-surfaces";
import { EMPTY_SURFACE_PROJECTION } from "./surface-projection";
import { completedActivityHere } from "./scene-venues";
import { bindSceneSurfaces, dynamicSurfacePayloads } from "./surface-binding";
import {
  requireScene,
  SCENE_REGISTRY,
  CAMPAIGN_STOREFRONT_SCENE_ID,
} from "./scene-registry";

describe("storefront surfaces read actual available records", () => {
  it("uses the canonical committee and completed title without inventing quotas or turnout", () => {
    const created = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "g-location-surface-v1",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    });
    const id = created.playerPersonId;
    const filed = fileForOffice(
      openOrdinaryLife(created.world, id),
      id,
      null,
      "us-ky-general-assembly-v1:house",
    );
    expect(
      projectLocationSurfaces(
        filed,
        id,
        CAMPAIGN_STOREFRONT_SCENE_ID,
        EMPTY_SURFACE_PROJECTION,
      ),
    ).toBe(EMPTY_SURFACE_PROJECTION);
    const performed = spendAnAfternoon(filed, id, "fundraising");
    expect(performed).not.toBe(filed);
    const before = JSON.stringify(performed);
    const projection = projectLocationSurfaces(
      performed,
      id,
      CAMPAIGN_STOREFRONT_SCENE_ID,
      EMPTY_SURFACE_PROJECTION,
    );
    expect(projection.facts.get("campaign-name")?.text).toBe(
      projectCampaign(performed, id).committeeName,
    );
    expect(projection.facts.get("headline")?.text).toBe(
      completedActivityHere(performed, id)?.title,
    );
    expect(projection.facts.has("document-body")).toBe(false);
    expect(projection.facts.get("headline")?.channel).toBe(
      "institutional-working",
    );
    const bindings = bindSceneSurfaces(
      requireScene(SCENE_REGISTRY, CAMPAIGN_STOREFRONT_SCENE_ID),
      dynamicSurfacePayloads(projection),
    );
    expect(
      bindings.find((b) => b.slotId === "phone-bank-corkboard")?.state,
    ).toBe("bound");
    expect(JSON.stringify(performed)).toBe(before);
    expect(EMPTY_SURFACE_PROJECTION.facts.size).toBe(0);
  });
});
