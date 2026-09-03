import fs from "fs";
import path from "path";

import { toCanonicalJson } from "../../src/authoring/canonical-json";
import { deriveRuntimeTiers } from "./tier-derive";

/**
 * Usage:
 *   cli-tier-derive.ts <asset-id> <master.png> <output-directory>
 *                      (--native | --native-detail-width <n> | --detail-unverified)
 *                      [--widths 1024,2048,3072,4096]
 *
 * Derives the runtime ladder from an approved master and writes
 * `tier-derivation-report.json` into the output directory.
 *
 * Exactly one detail declaration is REQUIRED, and there is deliberately no
 * default. Whether a master carries native detail, carries an external
 * upscale's lineage, or has never been checked is a claim about the art's
 * history — the sort of claim a convenient default would make silently and
 * wrongly. Pass the intake report's answer.
 */

const args = process.argv.slice(2);
const [assetId, masterPath, outputDirectory] = args;

function usage(message: string): never {
  console.error(message);
  console.error(
    "\nUsage: cli-tier-derive.ts <asset-id> <master.png> <output-directory>\n" +
      "         (--native | --native-detail-width <n> | --detail-unverified)\n" +
      "         [--widths 1024,2048,3072,4096]",
  );
  process.exit(2);
}

if (!assetId || !masterPath || !outputDirectory) {
  usage("An asset id, a master path and an output directory are required.");
}

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const declaredDetail = flagValue("--native-detail-width");
const declarations = [
  args.includes("--native"),
  declaredDetail !== undefined,
  args.includes("--detail-unverified"),
].filter(Boolean).length;

if (declarations === 0) {
  usage(
    "A detail declaration is required. Pass --native for a master whose own pixels are its detail, --native-detail-width <n> to carry an external upscale's lineage forward, or --detail-unverified when nobody has checked.",
  );
}
if (declarations > 1) {
  usage(
    "Pass exactly one detail declaration: --native, --native-detail-width or --detail-unverified are three different claims about the same master.",
  );
}

const widths = flagValue("--widths")
  ?.split(",")
  .map((entry) => Number.parseInt(entry.trim(), 10))
  .filter((entry) => Number.isFinite(entry) && entry > 0);

const nativeDetailWidth: number | null | "assume-native" = args.includes(
  "--native",
)
  ? "assume-native"
  : declaredDetail !== undefined
    ? Number.parseInt(declaredDetail, 10)
    : null;

if (
  typeof nativeDetailWidth === "number" &&
  !Number.isFinite(nativeDetailWidth)
) {
  usage("--native-detail-width needs a positive integer.");
}

const repositoryRoot = process.cwd();
const resolvedOutput = path.resolve(outputDirectory);

const result = await deriveRuntimeTiers({
  assetId,
  masterPath: path.resolve(masterPath),
  outputDirectory: resolvedOutput,
  nativeDetailWidth,
  ...(widths && widths.length > 0 ? { requestedWidths: widths } : {}),
  repositoryRoot,
});

const reportPath = path.join(resolvedOutput, "tier-derivation-report.json");
fs.writeFileSync(
  reportPath,
  toCanonicalJson({
    assetId,
    master: {
      path: result.masterPath,
      width: result.plan.masterWidth,
      height: result.plan.masterHeight,
      nativeDetailWidth: result.plan.nativeDetailWidth,
      hashBefore: result.masterHashBefore,
      hashAfter: result.masterHashAfter,
      unmodified: result.masterHashBefore === result.masterHashAfter,
    },
    tiers: result.derived,
    skipped: result.plan.skipped,
    warnings: result.plan.warnings,
  }),
);

console.log(
  `Derived ${result.derived.length} tier(s) for '${assetId}' from a ${result.plan.masterWidth}x${result.plan.masterHeight} master.`,
);
for (const tier of result.derived) {
  const detail =
    tier.nativeDetailWidth !== undefined
      ? ` (only ${tier.nativeDetailWidth}px real detail)`
      : "";
  console.log(
    `  ${String(tier.width).padStart(5)}px  ${tier.derivation}${detail}  ${tier.hash.slice(0, 12)}…`,
  );
}
for (const skipped of result.plan.skipped) {
  console.log(`  skipped ${skipped.width}px — ${skipped.message}`);
}
for (const warning of result.plan.warnings) {
  console.log(`  warning: ${warning.message}`);
}
console.log(
  result.masterHashBefore === result.masterHashAfter
    ? "\nMaster unchanged (hash verified before and after)."
    : "\nMASTER CHANGED — this is a defect; the pipeline must never write to an approved master.",
);
console.log(`Wrote ${reportPath}`);

if (result.masterHashBefore !== result.masterHashAfter) process.exit(1);
