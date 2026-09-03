import fs from "fs";
import os from "os";
import path from "path";

import * as PImage from "pureimage";
import { describe, expect, it } from "vitest";

import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import type {
  AssetManifest,
  CharacterCatalogData,
  EnvironmentFamiliesData,
  JurisdictionDeltasData,
  ProvenanceData,
} from "../scripts/art-asset-factory/schemas";
import { validateArtAssets } from "../scripts/art-asset-factory/validate";
import {
  DEV_CHARACTER_FIXTURE_DIRECTORY,
  renderDevCharacterFixtures,
} from "../scripts/art-asset-factory/dev-character-fixtures";
import { renderDevG2Fixtures } from "../scripts/art-asset-factory/dev-character-fixtures-g2";
import { writePoseControlPlate } from "../scripts/art-asset-factory/pose-control-plates";
import { computeCharacterGenerationSignature } from "../src/presentation/character-components";
import type { PoseFamilyRegistryData } from "../src/presentation/pose-families";

const REPO_ROOT = path.resolve(__dirname, "..");

function loadJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), "utf-8"));
}

/**
 * A minimal pose registry for a synthetic probe body: the production
 * seated-at-desk contract, pointed at the probe's body family and its own
 * plate directory. Built from the real registry rather than invented, so the
 * probe is held to the same contract the production art is.
 */
function probePoseRegistry(
  bodyFamilies: readonly string[],
): PoseFamilyRegistryData {
  const production = loadJson<PoseFamilyRegistryData>(
    "art/manifest/pose_families.json",
  );
  const seated = JSON.parse(
    JSON.stringify(
      production.families.find(
        (family) => family.pose_family_id === "seated-at-desk",
      ),
    ),
  );
  seated.compatible_body_families = [...bodyFamilies];
  // The probe body IS released, so the family says so; the validator checks
  // this claim against the library in both directions.
  seated.production_status = "development-fixture";
  seated.human_qa = "pending";
  seated.control_plate = {
    path: "art/pose-control-plates/seated-at-desk__front.svg",
    hash: "0".repeat(64),
  };
  return {
    pose_registry_version: "pose-families-probe-v1",
    legacy_contactless_body_families: [...bodyFamilies],
    legacy_contactless_note:
      "The synthetic probe body has no contacts; it exists to exercise the release, hash and canvas gates rather than placement.",
    families: [seated],
  };
}

const EMPTY_FAMILIES: EnvironmentFamiliesData = { families: [] };
const EMPTY_DELTAS: JurisdictionDeltasData = { deltas: [] };
const EMPTY_PROVENANCE: ProvenanceData = { entries: [] };

async function writePng(filePath: string, width: number, height: number) {
  const image = PImage.make(width, height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    image.data[offset] = 60;
    image.data[offset + 1] = 60;
    image.data[offset + 2] = 90;
    image.data[offset + 3] = pixel % 2 === 0 ? 255 : 0;
  }
  await PImage.encodePNGToStream(image, fs.createWriteStream(filePath));
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("Art validator: modular character components", () => {
  it("validates the fixture component manifest and catalog", () => {
    const manifest = loadJson<AssetManifest>(
      "art/fixtures/valid_character_manifest.json",
    );
    const catalog = loadJson<CharacterCatalogData>(
      "art/fixtures/valid_character_catalog.json",
    );
    const result = validateArtAssets(
      manifest,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      EMPTY_PROVENANCE,
      {
        repositoryRoot: REPO_ROOT,
        characterCatalog: catalog,
        poseFamilies: loadJson("art/fixtures/valid_pose_families.json"),
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    // Draft components are never runtime eligible.
    expect(result.runtimeEligibleAssetIds).toEqual([]);
  });

  it("validates the production manifest with the empty bootstrap catalog", () => {
    const result = validateArtAssets(
      loadJson("art/manifest/asset_manifest.json"),
      loadJson("art/manifest/environment_families.json"),
      loadJson("art/manifest/jurisdiction_deltas.json"),
      loadJson("art/manifest/provenance.json"),
      {
        repositoryRoot: REPO_ROOT,
        characterCatalog: loadJson("art/manifest/character_catalog.json"),
        poseFamilies: loadJson("art/manifest/pose_families.json"),
      },
    );
    expect(result.errors).toEqual([]);
    // 4 office fixtures + 16 generation-1 and 30 generation-2 DEV components.
    expect(result.runtimeEligibleAssetIds).toHaveLength(50);
    expect(
      result.runtimeEligibleAssetIds.filter((id) => id.startsWith("dev_")),
    ).toHaveLength(46);
  });

  it("requires a catalog whenever components are declared", () => {
    const manifest = loadJson<AssetManifest>(
      "art/fixtures/valid_character_manifest.json",
    );
    const result = validateArtAssets(
      manifest,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      EMPTY_PROVENANCE,
      { repositoryRoot: REPO_ROOT },
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("no character catalog was supplied");
  });

  it("fails clearly on a broken catalog ledger and a dangling reference", () => {
    const manifest = loadJson<AssetManifest>(
      "art/fixtures/valid_character_manifest.json",
    );
    const catalog = loadJson<CharacterCatalogData>(
      "art/fixtures/valid_character_catalog.json",
    );
    const broken: CharacterCatalogData = {
      ...catalog,
      generations: [{ ...catalog.generations[0]!, signature: "csig_0000" }],
    };
    const first = manifest.assets.find(
      (asset) => asset.asset_id === "hair_long_wave_front_tql_v1",
    )!;
    first.component = { ...first.component!, paired_with: "hair_gone" };

    const result = validateArtAssets(
      manifest,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      EMPTY_PROVENANCE,
      { repositoryRoot: REPO_ROOT, characterCatalog: broken },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain(
      "pairs with missing component 'hair_gone'",
    );
    expect(result.errors.join("\n")).toContain(
      "generation 1 signature 'csig_0000' does not match",
    );
  });

  it("enforces the ordinary release gate and the declared canvas against the real file", async () => {
    const repositoryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "character-component-release-"),
    );
    const relative = "art/generated/approved/body_probe_v1.png";
    const filePath = path.join(repositoryRoot, relative);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await writePng(filePath, 8, 12);

    const component = {
      kind: "body" as const,
      family: "probe",
      catalog_generation: 1,
      layer: 20,
      canvas: { width: 8, height: 12 },
      pose_family: "seated-at-desk",
      head_orientation: "front",
      root: { convention: "pelvis-hip-center" as const, x: 0.5, y: 0.6 },
      attachment_anchors: [{ id: "head", x: 0.5, y: 0.2 }],
    };
    const head = {
      kind: "head" as const,
      family: "probe-head",
      catalog_generation: 1,
      layer: 30,
      canvas: { width: 4, height: 4 },
      attaches_to: "head",
      origin: { x: 0.5, y: 0.9 },
      compatible_body_families: ["probe"],
    };
    const manifest: AssetManifest = {
      assets: [
        {
          asset_id: "body_probe_v1",
          asset_type: "character-component",
          hero_asset: false,
          reuse_allowed: true,
          fixed_or_modular: "modular",
          generation_status: "approved",
          qa_status: "approved",
          runtime_release_status: "released",
          final_path: relative,
          hash: hashArtFile(filePath),
          requires_transparency: true,
          component,
        },
        {
          asset_id: "head_probe_v1",
          asset_type: "character-component",
          hero_asset: false,
          reuse_allowed: true,
          fixed_or_modular: "modular",
          generation_status: "draft",
          qa_status: "pending",
          runtime_release_status: "unreleased",
          component: head,
        },
      ],
    };
    const catalog: CharacterCatalogData = {
      catalog_generation: 1,
      slots: [
        { slot_id: "body", kind: "body", required: true },
        { slot_id: "head", kind: "head", required: true },
      ],
      generations: [
        {
          generation: 1,
          component_ids: ["body_probe_v1", "head_probe_v1"],
          signature: computeCharacterGenerationSignature([
            { assetId: "body_probe_v1", definition: component },
            { assetId: "head_probe_v1", definition: head },
          ]),
        },
      ],
    };
    const provenance: ProvenanceData = {
      entries: [
        {
          provenance_id: "prov_body_probe_v1",
          asset_id: "body_probe_v1",
          rights_license_status: "unknown",
          reference_type: "hand-authored",
          approval_status: "approved",
        },
      ],
    };

    // A body must belong to a registered pose family, so the probe carries one
    // and derives its control plate into the same temporary root.
    const poseFamilies = probePoseRegistry(["probe"]);
    writePoseControlPlate(poseFamilies.families[0]!, repositoryRoot);
    poseFamilies.families[0]!.control_plate.hash = hashArtFile(
      path.join(repositoryRoot, poseFamilies.families[0]!.control_plate.path),
    );

    const good = validateArtAssets(
      manifest,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      provenance,
      { repositoryRoot, characterCatalog: catalog, poseFamilies },
    );
    expect(good.errors).toEqual([]);
    expect(good.runtimeEligibleAssetIds).toEqual(["body_probe_v1"]);

    // Wrong canvas against the real raster.
    const wrongCanvas = JSON.parse(JSON.stringify(manifest)) as AssetManifest;
    wrongCanvas.assets[0]!.component = {
      ...component,
      canvas: { width: 9, height: 12 },
    };
    const wrongCatalog: CharacterCatalogData = {
      ...catalog,
      generations: [
        {
          ...catalog.generations[0]!,
          signature: computeCharacterGenerationSignature([
            {
              assetId: "body_probe_v1",
              definition: wrongCanvas.assets[0]!.component!,
            },
            { assetId: "head_probe_v1", definition: head },
          ]),
        },
      ],
    };
    const mismatch = validateArtAssets(
      wrongCanvas,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      provenance,
      { repositoryRoot, characterCatalog: wrongCatalog, poseFamilies },
    );
    expect(mismatch.errors).toContain(
      "Character component 'body_probe_v1' declares canvas 9x12 but its file is 8x12.",
    );

    // A released component still needs the ordinary hash/provenance gate.
    const unproven = JSON.parse(JSON.stringify(manifest)) as AssetManifest;
    unproven.assets[0]!.hash = "0".repeat(64);
    const gate = validateArtAssets(
      unproven,
      EMPTY_FAMILIES,
      EMPTY_DELTAS,
      EMPTY_PROVENANCE,
      { repositoryRoot, characterCatalog: catalog, poseFamilies },
    );
    expect(gate.errors.join("\n")).toContain(
      "runtime content hash does not match its final file",
    );
    expect(gate.errors.join("\n")).toContain(
      "runtime-released but lacks required provenance",
    );
  });
});

describe("DEV modular character fixtures", () => {
  it("reproduce the released rasters, hashes, and catalog signature from the script", async () => {
    const manifest = loadJson<AssetManifest>(
      "art/manifest/asset_manifest.json",
    );
    const catalog = loadJson<CharacterCatalogData>(
      "art/manifest/character_catalog.json",
    );
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "dev-modular-"));
    const outputs = await renderDevCharacterFixtures(scratch, "fixtures");
    expect(outputs).toHaveLength(16);
    for (const output of outputs) {
      const released = manifest.assets.find(
        (asset) => asset.asset_id === output.assetId,
      );
      expect(released, output.assetId).toBeDefined();
      expect(released!.hash).toBe(output.hash);
      expect(released!.runtime_release_status).toBe("released");
      expect(released!.component).toEqual(output.definition);
      expect(released!.final_path).toBe(
        `${DEV_CHARACTER_FIXTURE_DIRECTORY}/${output.assetId}.png`,
      );
      expect(hashArtFile(path.join(REPO_ROOT, released!.final_path!))).toBe(
        output.hash,
      );
    }
    // Generation 1 is FROZEN. Its membership and signature must reproduce
    // exactly from the generation-1 script even though the catalog has grown.
    expect(catalog.catalog_generation).toBe(2);
    expect(catalog.generations[0]!.generation).toBe(1);
    expect(catalog.generations[0]!.signature).toBe(
      computeCharacterGenerationSignature(outputs),
    );
    expect(catalog.generations[0]!.component_ids).toEqual(
      outputs.map((output) => output.assetId).sort(),
    );
  });

  it("reproduces the generation-2 rasters, hashes, and catalog signature from its script", async () => {
    const manifest = loadJson<AssetManifest>(
      "art/manifest/asset_manifest.json",
    );
    const catalog = loadJson<CharacterCatalogData>(
      "art/manifest/character_catalog.json",
    );
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "dev-modular-g2-"));
    const outputs = await renderDevG2Fixtures(scratch, "fixtures");
    expect(outputs).toHaveLength(30);
    for (const output of outputs) {
      const released = manifest.assets.find(
        (asset) => asset.asset_id === output.assetId,
      );
      expect(released, output.assetId).toBeDefined();
      expect(released!.hash).toBe(output.hash);
      expect(released!.art_class).toBe("development-fixture");
      expect(released!.component).toEqual(output.definition);
      expect(hashArtFile(path.join(REPO_ROOT, released!.final_path!))).toBe(
        output.hash,
      );
    }
    const generationTwo = catalog.generations.find(
      (generation) => generation.generation === 2,
    );
    expect(generationTwo).toBeDefined();
    expect(generationTwo!.signature).toBe(
      computeCharacterGenerationSignature(outputs),
    );
    expect(generationTwo!.component_ids).toEqual(
      outputs.map((output) => output.assetId).sort(),
    );
  });

  it("gives every generation-2 body typed contacts and an art complexion", () => {
    const manifest = loadJson<AssetManifest>(
      "art/manifest/asset_manifest.json",
    );
    const bodies = manifest.assets.filter(
      (asset) =>
        asset.component?.kind === "body" &&
        asset.component.catalog_generation === 2,
    );
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      const component = body.component!;
      expect(component.complexion, body.asset_id).toBeDefined();
      expect(component.contacts?.leftFoot, body.asset_id).toBeDefined();
      expect(component.contacts?.rightFoot, body.asset_id).toBeDefined();
      if (component.pose_family === "seated-at-desk") {
        expect(component.contacts?.seatedPelvis, body.asset_id).toBeDefined();
      }
    }
  });
});
