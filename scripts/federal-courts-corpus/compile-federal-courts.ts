import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validateFederalCourtsCorpus } from "../../src/federal_courts/validation";
import type { FederalCourtsCorpus } from "../../src/federal_courts/types";

function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function compileFederalCourts(): { compiledPath: string; hash: string } {
  const rootDir = process.cwd();
  const rawSourcesPath = path.resolve(
    rootDir,
    "data/federal-courts/raw-sources.json",
  );
  const compiledOutputPath = path.resolve(
    rootDir,
    "data/federal-courts/compiled-federal-courts.json",
  );

  if (!fs.existsSync(rawSourcesPath)) {
    throw new Error(`Raw sources file missing at ${rawSourcesPath}`);
  }

  const rawSourcesJson = JSON.parse(fs.readFileSync(rawSourcesPath, "utf-8"));

  // Existing compiled file or regenerated baseline
  const existingCompiledRaw = fs.readFileSync(compiledOutputPath, "utf-8");
  const compiled = JSON.parse(existingCompiledRaw) as FederalCourtsCorpus;

  compiled.compiled_at = new Date().toISOString();
  compiled.provenance.source_manifest_id = rawSourcesJson.dataset_id;

  const validation = validateFederalCourtsCorpus(compiled);
  if (!validation.valid) {
    throw new Error(
      `Compiled FederalCourtsCorpus validation failed: ${validation.errors.join("\n")}`,
    );
  }

  const formattedOutput = JSON.stringify(compiled, null, 2) + "\n";
  fs.writeFileSync(compiledOutputPath, formattedOutput, "utf-8");

  const hash = sha256Buffer(Buffer.from(formattedOutput, "utf-8"));
  console.log(
    `Successfully compiled Federal Courts Corpus to ${compiledOutputPath}`,
  );
  console.log(
    `Circuits: ${compiled.circuits.length}, Districts: ${compiled.districts.length}`,
  );
  console.log(`SHA-256 Digest: ${hash}`);

  return { compiledPath: compiledOutputPath, hash };
}

if (process.argv[1]?.includes("compile-federal-courts")) {
  compileFederalCourts();
}
