/**
 * `npm run source:replay` — compile into a temporary tree and diff.
 *
 * This is the check that makes determinism real rather than asserted. It
 * regenerates every corpus into a scratch directory and compares byte-for-byte
 * against what is tracked, so a wall clock, an unstable sort or a formatter
 * disagreement fails the build naming the file.
 *
 * It deliberately does not consult git: the comparison is generated-tree
 * against working-tree, which is available at any checkout depth. 32A §9.3
 * notes the shallow-fetch defect that an ancestry-dependent check would inherit.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { toCanonicalJson, writeText } from "../../src/source/core/index";
import { REPO_ROOT, domainDataDir, loadDomains } from "./registry";
import { compileDomainInto } from "./compile";
import { buildManifest } from "./manifest";

export interface ReplayDifference {
  readonly path: string;
  readonly reason: string;
}

/** Regenerate everything into a scratch tree and report every difference. */
export async function replay(): Promise<readonly ReplayDifference[]> {
  const scratch = mkdtempSync(resolve(tmpdir(), "source-replay-"));
  const differences: ReplayDifference[] = [];
  try {
    for (const domain of await loadDomains()) {
      if (domain.productionGate) continue;
      const target = resolve(scratch, domain.domain);
      compileDomainInto(domain, target);

      for (const file of ["corpus.json", "corpus-manifest.json"]) {
        const tracked = resolve(domainDataDir(domain.domain), file);
        const generated = resolve(target, file);
        const relative = `data/source/${domain.domain}/${file}`;
        if (!existsSync(tracked)) {
          differences.push({
            path: relative,
            reason: "is not tracked but was generated",
          });
          continue;
        }
        const trackedText = readFileSync(tracked, "utf-8");
        const generatedText = readFileSync(generated, "utf-8");
        if (trackedText !== generatedText) {
          differences.push({
            path: relative,
            reason: describeDifference(trackedText, generatedText),
          });
        }
      }
    }

    const manifest = await buildManifest(scratch);
    const manifestPath = resolve(REPO_ROOT, "data/source/MANIFEST.json");
    const generatedManifest = toCanonicalJson(manifest);
    writeText(resolve(scratch, "MANIFEST.json"), generatedManifest);
    if (!existsSync(manifestPath)) {
      differences.push({
        path: "data/source/MANIFEST.json",
        reason: "is not tracked",
      });
    } else {
      const trackedManifest = readFileSync(manifestPath, "utf-8");
      if (trackedManifest !== generatedManifest) {
        differences.push({
          path: "data/source/MANIFEST.json",
          reason: describeDifference(trackedManifest, generatedManifest),
        });
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return differences;
}

function describeDifference(tracked: string, generated: string): string {
  const trackedLines = tracked.split("\n");
  const generatedLines = generated.split("\n");
  const limit = Math.max(trackedLines.length, generatedLines.length);
  for (let index = 0; index < limit; index += 1) {
    if (trackedLines[index] !== generatedLines[index]) {
      return `differs at line ${index + 1}: tracked ${JSON.stringify(
        trackedLines[index] ?? "<end of file>",
      )} vs generated ${JSON.stringify(generatedLines[index] ?? "<end of file>")}`;
    }
  }
  return "differs in length only";
}

async function main(): Promise<void> {
  const differences = await replay();
  for (const difference of differences) {
    console.log(`  [diff] ${difference.path} ${difference.reason}`);
  }
  if (differences.length > 0) {
    console.log(
      `source:replay: ${differences.length} tracked source artifacts do not match a clean regeneration.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    "source:replay: clean; every tracked source artifact regenerates byte-identically.",
  );
}

if (process.argv[1]?.endsWith("replay.ts")) {
  await main();
}
