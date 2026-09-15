/**
 * Freeze one prepared candidate pack's review membership as a published catalog
 * generation ledger, so later additive packs lift to the next generation instead
 * of sharing this one. Usage:
 *   npx tsx scripts/art-asset-factory/cli-freeze-engine-generation.ts engine-people35 7
 */
import fs from "node:fs";
import path from "node:path";
import { computeCharacterGenerationSignature } from "../../src/presentation/character-components";

const [pack, generationArg] = process.argv.slice(2);
if (!pack || !generationArg) throw new Error("usage: <pack> <generation>");
const generation = Number(generationArg);
const root = path.resolve(import.meta.dirname, "../..");
const short = pack.replace("engine-people", "engine");
const registry = JSON.parse(
  fs.readFileSync(
    path.join(root, `art/manifest/character_candidate_${short}_registry.json`),
    "utf8",
  ),
) as {
  assets: { asset_id: string; candidate_component: Record<string, unknown> }[];
};
const members = registry.assets.map((a) => ({
  assetId: a.asset_id,
  definition: { ...a.candidate_component, catalog_generation: generation },
}));
const ledger = {
  generation,
  component_ids: members.map((m) => m.assetId).sort(),
  signature: computeCharacterGenerationSignature(members as never),
};
const out = path.join(
  root,
  `art/manifest/character_candidate_${short}_generation.json`,
);
fs.writeFileSync(out, JSON.stringify(ledger, null, 2) + "\n");
console.log(out, ledger.component_ids.length, ledger.signature);
