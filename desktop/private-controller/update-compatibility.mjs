import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateRevision } from "./private-update.mjs";

// Conservative, source-bound admission until an independently verified migration
// contract exists. No schema number alone promises compatibility. UI/controller
// changes can update automatically; changed save readers/writers or World
// integrity must be reviewed rather than guessed from a matching semver.
export const COMPATIBILITY_PATHS = Object.freeze([
  "src/simulation/types.ts",
  "src/simulation/world.ts",
  "src/simulation/serialization.ts",
  "src/presentation/browser-world-repository.ts",
  "src/presentation/browser-shell-state.ts",
  "src/presentation/portable-save.ts",
]);

export function sourceCompatibility(revision, readSource) {
  if (!validateRevision(revision))
    throw new Error("Invalid compatibility source revision.");
  const surfaces = {};
  for (const filename of COMPATIBILITY_PATHS) {
    const bytes = readSource(filename);
    if (!bytes || bytes.length === 0)
      throw new Error(`Missing compatibility surface: ${filename}`);
    surfaces[filename] = createHash("sha256").update(bytes).digest("hex");
  }
  return { version: 1, sourceRevision: revision, surfaces };
}

export function checkoutCompatibility(root, revision) {
  return sourceCompatibility(revision, (filename) =>
    readFileSync(path.join(root, filename)),
  );
}

export function compatibilityRefusal(current, candidate) {
  const valid = (contract) =>
    contract?.version === 1 &&
    validateRevision(contract.sourceRevision) &&
    COMPATIBILITY_PATHS.every((filename) =>
      /^[0-9a-f]{64}$/.test(contract.surfaces?.[filename] ?? ""),
    );
  if (!valid(current) || !valid(candidate))
    return "unsupported-compatibility-contract";
  for (const filename of COMPATIBILITY_PATHS) {
    if (current.surfaces[filename] !== candidate.surfaces[filename])
      return `unverified-migration:${filename}`;
  }
  return null;
}
