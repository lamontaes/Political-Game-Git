import { describe, expect, it } from "vitest";

import assetManifest from "../../art/manifest/asset_manifest.json";
import environmentFamilies from "../../art/manifest/environment_families.json";
import {
  DRIVE_SWEEP_TOTAL,
  ENVIRONMENT_SOURCES,
  environmentAsset,
  environmentSourceBulkCounts,
  environmentSourcesWithRemainingWork,
  manifestedEnvironmentAssetIds,
  settledEnvironmentSources,
} from "./environment-sources";
import { SCENE_REGISTRY } from "../presentation/scene-registry";

/**
 * THE LEDGER CANNOT LIE ABOUT THE MANIFEST.
 *
 * The whole value of a source-to-scene view is that it is checkable. These
 * tests are the check: every manifested environment asset has to appear, every
 * scene it claims has to be registered, and every release claim has to agree
 * with the manifest. If somebody releases a plate, or un-releases one, and does
 * not update the ledger, this suite says so.
 */

interface ManifestAsset {
  readonly asset_id: string;
  readonly asset_type: string;
  readonly runtime_release_status: string;
  readonly family_id?: string;
}
const assets = (
  assetManifest as unknown as { readonly assets: readonly ManifestAsset[] }
).assets;

describe("the environment source ledger", () => {
  /**
   * NO SILENT OMISSIONS. This is the assertion that stops the ledger from
   * becoming the thing it replaced: a partial list that reads as a full one.
   */
  it("accounts for every manifested environment asset", () => {
    const accounted = new Set(
      ENVIRONMENT_SOURCES.map((source) => source.sourceId.split(":")[0]!),
    );
    for (const assetId of manifestedEnvironmentAssetIds()) {
      expect(accounted.has(assetId), assetId).toBe(true);
    }
  });

  it("names only registered scenes", () => {
    for (const source of ENVIRONMENT_SOURCES) {
      if (source.sceneId === null) continue;
      expect(SCENE_REGISTRY.scenes.has(source.sceneId), source.sourceId).toBe(
        true,
      );
    }
  });

  /**
   * A ledger row that says a picture is in ordinary play must be backed by an
   * asset the manifest actually released. This is the one that catches a
   * hopeful disposition.
   */
  it("only claims ordinary play for assets the manifest released", () => {
    for (const source of ENVIRONMENT_SOURCES) {
      if (source.disposition !== "in-ordinary-play") continue;
      const asset = environmentAsset(source.sourceId.split(":")[0]!);
      if (!asset) continue;
      expect(asset.runtime_release_status, source.sourceId).toBe("released");
    }
  });

  /**
   * And the reverse. The courtroom is the standing case: fully carried,
   * deliberately unreleased. If somebody releases it without giving it a
   * consumer, this fails and asks them to say why.
   */
  it("keeps carried-not-released rows unreleased in the manifest", () => {
    for (const source of ENVIRONMENT_SOURCES) {
      if (source.disposition !== "carried-not-released") continue;
      const asset = environmentAsset(source.sourceId.split(":")[0]!);
      expect(asset, source.sourceId).not.toBeNull();
      expect(asset!.runtime_release_status, source.sourceId).toBe("unreleased");
      // Carried means carried: it has a ladder and a registered scene.
      expect(source.sceneId, source.sourceId).not.toBeNull();
    }
  });

  /**
   * A CANDIDATE IS NEVER RELEASED BY THIS FILE. Rights and style-family status
   * stay where the intake left them, and no ledger row may promote one.
   */
  it("gives every candidate an owner and never a production release", () => {
    const candidates = ENVIRONMENT_SOURCES.filter(
      (source) => source.disposition === "candidate-preview-only",
    );
    expect(candidates.length).toBeGreaterThanOrEqual(6);
    for (const candidate of candidates) {
      const asset = environmentAsset(candidate.sourceId.split(":")[0]!);
      if (asset)
        expect(asset.runtime_release_status, candidate.sourceId).toBe(
          "unreleased",
        );
      if (candidate.sceneId)
        expect(SCENE_REGISTRY.scenes.has(candidate.sceneId)).toBe(true);
      expect(candidate.owedBy, candidate.sourceId).toContain("owner");
      expect(candidate.remainingStep, candidate.sourceId).not.toBeNull();
    }
  });

  /** Every unfinished row says what is left AND who owes it. */
  it("gives every remaining step an owner", () => {
    for (const source of environmentSourcesWithRemainingWork()) {
      expect(source.owedBy, source.sourceId).not.toBeNull();
      expect(source.owedBy!.length, source.sourceId).toBeGreaterThan(3);
    }
  });

  it("adds up: every row is either settled or has work remaining", () => {
    expect(
      settledEnvironmentSources().length +
        environmentSourcesWithRemainingWork().length,
    ).toBe(ENVIRONMENT_SOURCES.length);
  });

  /**
   * PARK AND PRESS ROOM WERE NOT THE CAP. #131's intake carried two candidates;
   * this lane adjudicates more environment sources than that, which is the
   * claim the activation asked to be able to check.
   */
  it("goes past the two candidates the previous intake carried", () => {
    const environmentCandidates = ENVIRONMENT_SOURCES.filter(
      (source) => source.disposition === "candidate-preview-only",
    );
    expect(environmentCandidates.length).toBeGreaterThan(2);
    expect(DRIVE_SWEEP_TOTAL).toBe(286);
  });

  /**
   * The bulk of the sweep stays counted rather than quietly dropped, and stays
   * classified as reference rather than as a queue of rooms.
   */
  it("counts the reference corpus instead of discarding it", () => {
    const bulk = environmentSourceBulkCounts();
    const referenceRows = bulk.filter(
      (row) => row.disposition === "reference-only",
    );
    expect(referenceRows.length).toBeGreaterThan(0);
    const referenceTotal = referenceRows.reduce(
      (total, row) => total + row.count,
      0,
    );
    expect(referenceTotal).toBeGreaterThan(100);
  });

  /** Prop banks are declared empty rather than left unmentioned. */
  it("declares the empty prop banks as an exact gap", () => {
    const banks = ENVIRONMENT_SOURCES.find(
      (source) => source.disposition === "bank-empty",
    );
    expect(banks).toBeTruthy();
    expect(banks!.remainingStep).toBeTruthy();
  });

  /** Every family a manifested environment asset claims actually exists. */
  it("keeps environment families and manifest families in step", () => {
    const familyIds = new Set(
      (
        environmentFamilies as unknown as {
          readonly families: readonly { readonly family_id: string }[];
        }
      ).families.map((family) => family.family_id),
    );
    for (const asset of assets) {
      if (!asset.asset_type.startsWith("environment")) continue;
      if (!asset.family_id) continue;
      expect(familyIds.has(asset.family_id), asset.asset_id).toBe(true);
    }
  });
});
