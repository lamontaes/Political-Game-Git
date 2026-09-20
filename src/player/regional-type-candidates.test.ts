import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  mode: "candidate-review",
  urls: {} as Record<string, string>,
}));
vi.mock("../presentation/art-preview", () => ({
  artPreviewMode: () => fixture.mode,
}));
vi.mock("../presentation/build-profile", () => ({
  gameBuildProfile: () => "internal-art-review",
}));
vi.mock("../presentation/visual-integration", () => ({
  repositoryVisualUrls: () => fixture.urls,
}));
import manifest from "../../art/manifest/asset_manifest.json";
import {
  REGIONAL_TYPE_REVIEW_CANDIDATES,
  selectOpeningRegionalPreview,
} from "../presentation/opening-regional-candidates";
import type { OpeningRegionalSceneContext } from "../presentation/opening-regional-plate";
import type { EntityId, IsoDate } from "../simulation/types";
import { candidateEstablishingPlate } from "./candidate-establishing-plate";

beforeEach(() => {
  fixture.mode = "candidate-review";
  for (const key of Object.keys(fixture.urls)) delete fixture.urls[key];
});

it("resolves the received bytes only in candidate review and keeps production unreleased", () => {
  for (const candidate of REGIONAL_TYPE_REVIEW_CANDIDATES) {
    const row = manifest.assets.find(
      (asset) => asset.asset_id === candidate.assetId,
    )!;
    expect(row.hash).toBe(candidate.previewRaster.hash);
    expect(row.generation_status).toBe("pending");
    expect(row.runtime_release_status).toBe("unreleased");
    expect(
      candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
    ).toBeNull();
    fixture.urls[row.final_path!] = "/exact-" + candidate.assetId + ".png";
    expect(
      candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
    ).toMatchObject({
      assetId: candidate.assetId,
      width: candidate.previewRaster.width,
      height: candidate.previewRaster.height,
      hash: row.hash,
    });
    expect(
      candidateEstablishingPlate(candidate.assetId, {
        ...candidate.previewRaster,
        hash: "wrong",
      }),
    ).toBeNull();
    fixture.mode = "production";
    expect(
      candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
    ).toBeNull();
    fixture.mode = "candidate-review";
  }
});

it("reuses a regional type across places without granting statewide or unknown coverage", () => {
  const context: OpeningRegionalSceneContext = {
    jurisdictionId: "saved-home" as EntityId,
    placeKey: "2015900",
    sourceGeoid: "2015900",
    stateJurisdictionKey: "US-KS",
    regionTypes: ["great-plains-grassland"],
    asOf: "2026-06-05" as IsoDate,
    presentationKey: "saved-person:local:2015900",
  };
  const original = JSON.stringify(context);
  const prairie = REGIONAL_TYPE_REVIEW_CANDIDATES[1]!;
  expect(
    selectOpeningRegionalPreview(
      context,
      "local",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBe(prairie);
  expect(
    selectOpeningRegionalPreview(
      {
        ...context,
        placeKey: "3149950",
        sourceGeoid: "3149950",
        stateJurisdictionKey: "US-NE",
      },
      "local",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBe(prairie);
  expect(
    selectOpeningRegionalPreview(
      { ...context, regionTypes: [] },
      "local",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      context,
      "state",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      { ...context, asOf: "2026-01-05" as IsoDate },
      "local",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      { ...context, regionTypes: ["appalachian-coal-region-town"] },
      "local",
      REGIONAL_TYPE_REVIEW_CANDIDATES,
    ),
  ).toBe(REGIONAL_TYPE_REVIEW_CANDIDATES[0]);
  expect(JSON.stringify(context)).toBe(original);
});
