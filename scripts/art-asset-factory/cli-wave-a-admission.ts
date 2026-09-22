import path from "path";
import { fileURLToPath } from "url";

import { validateCharacterComponentCandidates } from "../../src/presentation/character-components";
import {
  runWaveAAdmission,
  WAVE_A_ADMISSION_VERSION,
  WAVE_A_OBSERVATION_METHOD,
  WAVE_A_REGISTRY_PATH,
  WAVE_A_REGISTRY_SCHEMA,
  WAVE_A_REPORT_PATH,
  WAVE_A_REPORT_SCHEMA,
  WAVE_A_REVIEW_SOURCE,
  type WaveAAdmissionRow,
} from "./wave-a-candidate-admission";
import {
  OCD_ADMISSION_VERSION,
  OCD_DESPILL_SOURCE,
  OCD_INTAKE_SOURCE,
  OCD_OBSERVATION_METHOD,
  OCD_REPORT_PATH,
  OCD_REPORT_SCHEMA,
  runOcdAdmission,
  type OcdAdmissionRow,
} from "./ocd-candidate-admission";
import { writeFormatted } from "./write-formatted";

/**
 * `npm run admit:wave-a-candidates`
 *
 * Writes the candidate-only registry and the admission evidence reports. Every
 * output is generated and checked in, so re-running on an unchanged tree must
 * produce identical bytes; `--check` asserts exactly that without writing.
 *
 * There are two admission passes over two different sets of rasters, and one
 * registry. They are run together here deliberately: the registry is a
 * generated file, so a second writer for it would mean whichever pass ran last
 * silently dropped the other one's records.
 */

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function summarizeOcd(rows: readonly OcdAdmissionRow[]) {
  const byDisposition = new Map<string, number>();
  for (const row of rows) {
    byDisposition.set(
      row.disposition,
      (byDisposition.get(row.disposition) ?? 0) + 1,
    );
  }
  const admitted = rows.filter(
    (row) => row.disposition === "admitted-candidate-body",
  );
  return {
    measured: rows.length,
    admitted: admitted.length,
    admittedPoseFamilies: [
      ...new Set(admitted.map((row) => row.registeredPoseFamily!)),
    ].sort(),
    byDisposition: Object.fromEntries(
      [...byDisposition.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    ),
    lineageIntact: rows.every((row) => row.provenance.lineageIntact),
    rowsDisagreeingWithPriorClaim: rows.filter(
      (row) => row.priorClaimDisagreements.length > 0,
    ).length,
  };
}

function summarize(rows: readonly WaveAAdmissionRow[]) {
  const byDisposition = new Map<string, number>();
  for (const row of rows) {
    byDisposition.set(
      row.disposition,
      (byDisposition.get(row.disposition) ?? 0) + 1,
    );
  }
  const admitted = rows.filter(
    (row) => row.disposition === "admitted-candidate-body",
  );
  return {
    measured: rows.length,
    admitted: admitted.length,
    admittedFamilies: [...new Set(admitted.map((row) => row.family))].sort(),
    admittedPoseFamilies: [
      ...new Set(admitted.map((row) => row.registeredPoseFamily!)),
    ].sort(),
    byDisposition: Object.fromEntries(
      [...byDisposition.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    ),
    sourceBytesUnchanged: rows.every((row) => row.sourceBytesUnchanged),
    rowsDisagreeingWithPriorClaim: rows.filter(
      (row) => row.priorClaimDisagreements.length > 0,
    ).length,
  };
}

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const { rows, records } = await runWaveAAdmission(REPOSITORY_ROOT);
  const ocd = await runOcdAdmission(REPOSITORY_ROOT);

  const allRecords = [...records, ...ocd.records].sort((a, b) =>
    a.asset_id < b.asset_id ? -1 : 1,
  );
  const candidateErrors = validateCharacterComponentCandidates(allRecords);
  if (candidateErrors.length > 0) {
    throw new Error(
      `Candidate admission produced records that are not honest candidates:\n${candidateErrors.join("\n")}`,
    );
  }

  const unchanged = rows.filter((row) => !row.sourceBytesUnchanged);
  if (unchanged.length > 0) {
    throw new Error(
      `Wave A source crops changed since the sweep recorded them:\n${unchanged
        .map(
          (row) =>
            `${row.outputPath}: recorded ${row.recordedOutputSha256}, observed ${row.observedOutputSha256}`,
        )
        .join("\n")}`,
    );
  }

  const registry = {
    schema: WAVE_A_REGISTRY_SCHEMA,
    generator: "character-candidate-registry-writer-v1",
    admission_passes: [WAVE_A_ADMISSION_VERSION, OCD_ADMISSION_VERSION],
    release_status: "CANDIDATE_REFERENCE_ONLY",
    production_pixels_released: false,
    note: "Append-only candidate registry. Nothing here is in any catalog generation, nothing here is runtime-released, and no player-facing selection can reach it. It exists so banked evidence can be composed and reviewed. Promotion is a separate authorized act; see promoteCandidateComponent.",
    assets: allRecords,
  };

  const report = {
    schema: WAVE_A_REPORT_SCHEMA,
    generator: WAVE_A_ADMISSION_VERSION,
    evidence_source: WAVE_A_REVIEW_SOURCE,
    observation_method: WAVE_A_OBSERVATION_METHOD,
    release_status: "CANDIDATE_REFERENCE_ONLY",
    summary: summarize(rows),
    candidates: rows,
  };

  const ocdReport = {
    schema: OCD_REPORT_SCHEMA,
    generator: OCD_ADMISSION_VERSION,
    intake_source: OCD_INTAKE_SOURCE,
    despill_source: OCD_DESPILL_SOURCE,
    observation_method: OCD_OBSERVATION_METHOD,
    release_status: "CANDIDATE_REFERENCE_ONLY",
    summary: summarizeOcd(ocd.rows),
    candidates: ocd.rows,
  };

  const registryPath = path.join(REPOSITORY_ROOT, WAVE_A_REGISTRY_PATH);
  const reportPath = path.join(REPOSITORY_ROOT, WAVE_A_REPORT_PATH);
  const ocdReportPath = path.join(REPOSITORY_ROOT, OCD_REPORT_PATH);

  if (check) {
    const fs = await import("fs");
    for (const [filePath, value] of [
      [registryPath, registry],
      [reportPath, report],
      [ocdReportPath, ocdReport],
    ] as const) {
      const existing = fs.readFileSync(filePath, "utf8");
      const parsed: unknown = JSON.parse(existing);
      if (JSON.stringify(parsed) !== JSON.stringify(value)) {
        throw new Error(
          `${path.relative(REPOSITORY_ROOT, filePath)} is out of date; run 'npm run admit:wave-a-candidates'.`,
        );
      }
    }
    process.stdout.write("Candidate admission outputs are up to date.\n");
    return;
  }

  await writeFormatted(registryPath, JSON.stringify(registry));
  await writeFormatted(reportPath, JSON.stringify(report));
  await writeFormatted(ocdReportPath, JSON.stringify(ocdReport));
  process.stdout.write(
    `${WAVE_A_ADMISSION_VERSION}\n${JSON.stringify(summarize(rows), null, 2)}\n` +
      `${OCD_ADMISSION_VERSION}\n${JSON.stringify(summarizeOcd(ocd.rows), null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
