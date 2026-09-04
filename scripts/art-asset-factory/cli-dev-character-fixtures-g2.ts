import fs from "fs";
import path from "path";

import { computeCharacterGenerationSignature } from "../../src/presentation/character-components";
import {
  DEV_G2_CATALOG_GENERATION,
  DEV_G2_FIXTURE_DIRECTORY,
  DEV_G2_FIXTURE_VERSION,
  renderDevG2Fixtures,
} from "./dev-character-fixtures-g2";

/**
 * Renders the generation-2 development fixtures and writes their manifest,
 * provenance and catalog records in place.
 *
 * Generation 1 is never touched: its component definitions, its membership and
 * its ledger signature are read but not rewritten, so identities pinned to it
 * cannot move.
 */

const repositoryRoot = path.resolve(process.cwd());
const GENERATION_DATE = "2026-09-02";

const outputs = await renderDevG2Fixtures(
  repositoryRoot,
  DEV_G2_FIXTURE_DIRECTORY,
);

const manifestPath = path.join(
  repositoryRoot,
  "art/manifest/asset_manifest.json",
);
const provenancePath = path.join(
  repositoryRoot,
  "art/manifest/provenance.json",
);
const catalogPath = path.join(
  repositoryRoot,
  "art/manifest/character_catalog.json",
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf-8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

const generationTwoIds = new Set(outputs.map((output) => output.assetId));

manifest.assets = manifest.assets.filter(
  (asset: { asset_id: string }) => !generationTwoIds.has(asset.asset_id),
);
provenance.entries = provenance.entries.filter(
  (entry: { asset_id?: string }) =>
    !entry.asset_id || !generationTwoIds.has(entry.asset_id),
);

for (const output of outputs) {
  manifest.assets.push({
    asset_id: output.assetId,
    asset_type: "character-component",
    art_class: "development-fixture",
    hero_asset: false,
    reuse_allowed: true,
    source_refs: [`prov_${output.assetId}`],
    rights_note:
      "Project-owned procedural DEV/NON-PRODUCTION fixture drawn by a repository script; not production art.",
    fixed_or_modular: "modular",
    variant_rules:
      "DEV/NON-PRODUCTION modular character fixture proving the contact, complexion, required-slot and blocked-slot contracts; never a canonical Person identity and never final art direction.",
    negative_constraints: [
      "Do not treat geometry, proportions, palette, or canvas size as a production standard.",
      "Do not infer identity, knowledge, biography, or traits from the artwork.",
      "Complexion here is art direction only and is never derived from, or evidence of, any property of a person.",
    ],
    generation_status: "approved",
    qa_status: "approved",
    runtime_release_status: "released",
    final_path: output.repositoryPath,
    hash: output.hash,
    requires_transparency: true,
    component: output.definition,
  });

  provenance.entries.push({
    provenance_id: `prov_${output.assetId}`,
    asset_id: output.assetId,
    source_url_or_path:
      "scripts/art-asset-factory/dev-character-fixtures-g2.ts",
    document_photo_plan_title: `Procedural DEV fixture ${output.assetId} (${DEV_G2_FIXTURE_VERSION})`,
    access_retrieval_date: GENERATION_DATE,
    rights_license_status: "owned",
    reference_type: "procedural-dev-fixture",
    source_authority_category: "visual-estimate-support",
    generator_tool: "scripts/art-asset-factory/dev-character-fixtures-g2.ts",
    generated_model_version: DEV_G2_FIXTURE_VERSION,
    generation_edit_date: GENERATION_DATE,
    edits_performed:
      "Drawn deterministically from fixed fixture geometry by the repository script; no external source, no generative model, no manual edits.",
    output_hash_version: "sha256",
    approval_status: "approved",
  });
}

const componentIds = outputs.map((output) => output.assetId).sort();
const signature = computeCharacterGenerationSignature(
  outputs.map((output) => ({
    assetId: output.assetId,
    definition: output.definition,
  })),
);

catalog.catalog_generation = DEV_G2_CATALOG_GENERATION;
catalog.generations = [
  ...catalog.generations.filter(
    (generation: { generation: number }) =>
      generation.generation !== DEV_G2_CATALOG_GENERATION,
  ),
  {
    generation: DEV_G2_CATALOG_GENERATION,
    component_ids: componentIds,
    signature,
  },
].sort(
  (a: { generation: number }, b: { generation: number }) =>
    a.generation - b.generation,
);

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      version: DEV_G2_FIXTURE_VERSION,
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      generation_signature: signature,
      fixture_count: outputs.length,
    },
    null,
    2,
  ),
);
