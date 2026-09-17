import fs from "node:fs";
import { computeCharacterGenerationSignature } from "../../../src/presentation/character-components";
const [candidate, destination, reportPath] = process.argv.slice(2);
if (!candidate || !destination || !reportPath)
  throw new Error("candidate destination report required");
const registry = JSON.parse(fs.readFileSync(candidate, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const existing = JSON.parse(fs.readFileSync(destination, "utf8"));
if (report.errors?.length) throw new Error("Refused fits cannot be frozen");
for (const prior of existing.assets) {
  if (
    JSON.stringify(
      registry.assets.find(
        (a: { asset_id: string }) => a.asset_id === prior.asset_id,
      ),
    ) !== JSON.stringify(prior)
  )
    throw new Error(`Existing asset changed: ${prior.asset_id}`);
}
for (const [id, template] of Object.entries(existing.templates)) {
  if (JSON.stringify(registry.templates[id]) !== JSON.stringify(template))
    throw new Error(`Existing template changed: ${id}`);
}
for (const [id, parts] of Object.entries(existing.familyAdditions)) {
  for (const part of parts as { id: string }[]) {
    if (
      JSON.stringify(
        registry.familyAdditions[id]?.find(
          (p: { id: string }) => p.id === part.id,
        ),
      ) !== JSON.stringify(part)
    )
      throw new Error(`Existing prepared part changed: ${part.id}`);
  }
}
if (
  JSON.stringify(registry.generations) !== JSON.stringify(existing.generations)
)
  throw new Error("Older generations changed");
if (
  registry.generations.some(
    (g: { generation: number }) => g.generation === report.generation,
  )
)
  throw new Error("Generation already frozen");
const ids = new Set<string>(report.newIds);
const members = registry.assets.filter((a: { asset_id: string }) =>
  ids.has(a.asset_id),
);
if (
  !ids.size ||
  ids.size !== members.length ||
  ids.size !== report.newIds.length
)
  throw new Error("Generation membership is incomplete or duplicated");
registry.generations.push({
  generation: report.generation,
  component_ids: [...ids].sort(),
  signature: computeCharacterGenerationSignature(
    members.map((a: { asset_id: string; candidate_component: object }) => ({
      assetId: a.asset_id,
      definition: {
        ...a.candidate_component,
        catalog_generation: report.generation,
      },
    })),
  ),
});
fs.writeFileSync(destination, JSON.stringify(registry, null, 2) + "\n");
console.log(
  `Frozen candidate generation ${report.generation}: ${ids.size} additive parts. Human acceptance pending.`,
);
