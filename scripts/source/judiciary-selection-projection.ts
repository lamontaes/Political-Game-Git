/** Regenerate the compact runtime projection from the locked 92L corpus. */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { format } from "prettier";

const ROOT = resolve(import.meta.dirname, "../..");
const INPUT = resolve(
  ROOT,
  "data/source/judicial-office-selection/corpus.json",
);
const OUTPUT = resolve(
  ROOT,
  "src/simulation/judiciary/generated/selection-profiles.ts",
);

interface SourceRecord {
  readonly recordId: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly officeFamily: string;
  readonly officeExists: unknown;
  readonly courtName: unknown;
  readonly geography: unknown;
  readonly initialSelection: unknown;
  readonly interimVacancy: unknown;
  readonly tenure: unknown;
  readonly renewal: unknown;
  readonly mandatoryRetirement: unknown;
  readonly qualifications: unknown;
  readonly reportedAuthority: unknown;
  readonly researchProvenance: {
    readonly evidenceTier: string;
    readonly primaryAuthorityStatus: string;
  };
}

/** Keep source states and reasons, removing repeated locator bytes only. */
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value === null || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(object)) {
    if (["evidence", "investigated", "asOf", "release"].includes(key)) continue;
    result[key] = compact(entry);
  }
  return result;
}

export function projectJudicialSelectionRecord(record: SourceRecord): unknown {
  return {
    recordId: record.recordId,
    jurisdictionId: record.jurisdictionId,
    jurisdictionName: record.jurisdictionName,
    officeFamily: record.officeFamily,
    officeExists: compact(record.officeExists),
    courtName: compact(record.courtName),
    geography: compact(record.geography),
    initialSelection: compact(record.initialSelection),
    interimVacancy: compact(record.interimVacancy),
    tenure: compact(record.tenure),
    renewal: compact(record.renewal),
    mandatoryRetirement: compact(record.mandatoryRetirement),
    qualifications: compact(record.qualifications),
    reportedAuthority: compact(record.reportedAuthority),
    evidenceTier: record.researchProvenance.evidenceTier,
    primaryAuthorityStatus: record.researchProvenance.primaryAuthorityStatus,
  };
}

async function main(): Promise<void> {
  const bytes = readFileSync(INPUT);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const records = JSON.parse(bytes.toString("utf8")) as SourceRecord[];
  const profiles = records.map(projectJudicialSelectionRecord);
  const source = `/** Generated from locked 92L corpus. Do not edit by hand. Research citations are reported, not retrieved primary authorities. */\nimport type { JudicialSelectionProfile } from "../profiles";\n\nexport const JUDICIAL_SELECTION_CORPUS_SHA256 = "${sha256}";\nexport const JUDICIAL_SELECTION_PROFILES: readonly JudicialSelectionProfile[] = JSON.parse(${JSON.stringify(JSON.stringify(profiles))}) as readonly JudicialSelectionProfile[];\n`;
  const formatted = await format(source, { parser: "typescript" });
  if (process.argv.includes("--check")) {
    const actual = readFileSync(OUTPUT, "utf8");
    if (actual !== formatted)
      throw new Error("Judicial selection projection is stale.");
    console.log(
      `Judicial selection projection current: ${records.length} records, ${sha256}`,
    );
  } else {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, formatted);
    console.log(
      `Judicial selection projection written: ${records.length} records, ${sha256}`,
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await main();
}
