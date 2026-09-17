import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
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
// Catalog signatures cover selectable components; this closure additionally
// freezes every prepared corrective, pose layer and expression used by them.
const closureParts = (
  Object.values(registry.familyAdditions).flat() as {
    id: string;
    introducedGeneration?: number;
    svgPath: string;
    sha256: string;
    expressionVariants?: Record<string, { svgPath: string; sha256: string }>;
  }[]
).filter((part) => part.introducedGeneration === report.generation);
const closureFiles = new Map<string, string>();
function pin(file: string, expected?: string) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(process.cwd() + path.sep))
    throw new Error(`Closure escapes root: ${file}`);
  const hash = createHash("sha256")
    .update(fs.readFileSync(resolved))
    .digest("hex");
  if (expected && hash !== expected)
    throw new Error(`Closure hash mismatch: ${file}`);
  closureFiles.set(file, hash);
}
for (const part of closureParts) {
  if (registry.templates[part.id]?.sourceSha256 !== part.sha256)
    throw new Error(`Prepared template mismatch: ${part.id}`);
  pin(part.svgPath, part.sha256);
  const base = part.svgPath.replace(/\.svg$/, "");
  for (const file of fs.readdirSync(path.dirname(base))) {
    if (file.startsWith(path.basename(base)) && file.endsWith(".png"))
      pin(path.join(path.dirname(base), file));
  }
  for (const variant of Object.values(part.expressionVariants ?? {}))
    pin(variant.svgPath, variant.sha256);
}
if (
  !closureParts.length ||
  !members.every((member: { asset_id: string }) =>
    closureParts.some((part) => part.id === member.asset_id),
  )
)
  throw new Error("Prepared closure does not include every new catalog member");
// Pin the actual source descriptors and every referenced painted/map file,
// plus all runtime pose PNGs. A catalog-only signature cannot protect these.
function pinReferences(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const ref = value as { path?: unknown; sha256?: unknown };
  if (typeof ref.path === "string" && typeof ref.sha256 === "string")
    pin(ref.path, ref.sha256);
  for (const child of Object.values(value)) pinReferences(child);
}
for (const input of report.closureInputs ?? []) {
  pin(input);
  pinReferences(JSON.parse(fs.readFileSync(input, "utf8")));
}
for (const member of members) pin(member.final_path, member.hash);
const closure = {
  generation: report.generation,
  partIds: closureParts.map((part) => part.id).sort(),
  preparedParts: [...closureParts].sort((a, b) => a.id.localeCompare(b.id)),
  templates: Object.fromEntries(
    closureParts
      .map((p) => [p.id, registry.templates[p.id]])
      .sort(([a], [b]) => a.localeCompare(b)),
  ),
  profiles: registry.preparedProfiles,
  files: Object.fromEntries(
    [...closureFiles].sort(([a], [b]) => a.localeCompare(b)),
  ),
};
registry.preparedClosures = [
  ...(registry.preparedClosures ?? []),
  {
    ...closure,
    sha256: createHash("sha256").update(JSON.stringify(closure)).digest("hex"),
  },
];
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
