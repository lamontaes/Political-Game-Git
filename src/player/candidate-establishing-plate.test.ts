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
import { candidateEstablishingPlate } from "./candidate-establishing-plate";
import {
  BANKED_OPENING_REGIONAL_CANDIDATES,
  OPENING_REGIONAL_CANDIDATES,
  REGIONAL_TYPE_REVIEW_CANDIDATES,
  selectOpeningRegionalPreview,
} from "../presentation/opening-regional-candidates";
import type { OpeningRegionalSceneContext } from "../presentation/opening-regional-plate";
import type { EntityId, IsoDate } from "../simulation/types";
const candidate = BANKED_OPENING_REGIONAL_CANDIDATES[0]!;
const asset = manifest.assets.find(
  (row) => row.asset_id === candidate.assetId,
)!;
const context: OpeningRegionalSceneContext = {
  jurisdictionId: "pikeville" as EntityId,
  placeKey: "2160852",
  sourceGeoid: "2160852",
  stateJurisdictionKey: "US-KY",
  asOf: "2026-06-05" as IsoDate,
  presentationKey: "saved-person:local:2160852",
};
beforeEach(() => {
  fixture.mode = "candidate-review";
  for (const key of Object.keys(fixture.urls)) delete fixture.urls[key];
  fixture.urls[asset.final_path!] = "/exact-return.png";
});
it("uses exact encoded dimensions only with matching manifest identity and available bytes", () => {
  expect(
    candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
  ).toMatchObject({
    width: 2496,
    height: 1664,
    hash: candidate.previewRaster.hash,
  });
  expect(candidateEstablishingPlate(candidate.assetId)).toBeNull();
  expect(
    candidateEstablishingPlate(candidate.assetId, {
      ...candidate.previewRaster,
      hash: "wrong",
    }),
  ).toBeNull();
  expect(
    candidateEstablishingPlate(candidate.assetId, {
      ...candidate.previewRaster,
      width: 0,
    }),
  ).toBeNull();
  delete fixture.urls[asset.final_path!];
  expect(
    candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
  ).toBeNull();
});
it("never admits this pending return to production", () => {
  fixture.mode = "production";
  expect(
    candidateEstablishingPlate(candidate.assetId, candidate.previewRaster),
  ).toBeNull();
});
it("admits June Pikeville locally, excluding January, other towns and the Kentucky state beat", () => {
  expect(
    selectOpeningRegionalPreview(
      context,
      "local",
      BANKED_OPENING_REGIONAL_CANDIDATES,
    ),
  ).toBe(candidate);
  expect(
    selectOpeningRegionalPreview(
      { ...context, asOf: "2026-01-05" as IsoDate },
      "local",
      BANKED_OPENING_REGIONAL_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      { ...context, placeKey: "another-town" },
      "local",
      BANKED_OPENING_REGIONAL_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      context,
      "state",
      BANKED_OPENING_REGIONAL_CANDIDATES,
    ),
  ).toBeNull();
  expect(
    selectOpeningRegionalPreview(
      context,
      null,
      BANKED_OPENING_REGIONAL_CANDIDATES,
    ),
  ).toBeNull();
});

it("keeps the superseded regional choice inactive by default", () => {
  expect(OPENING_REGIONAL_CANDIDATES).toBe(REGIONAL_TYPE_REVIEW_CANDIDATES);
  expect(OPENING_REGIONAL_CANDIDATES).not.toContain(candidate);
});
