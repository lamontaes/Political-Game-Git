/**
 * Usage:
 *   cli-request-intake.ts file <record.json>   file one record into the queue
 *   cli-request-intake.ts list                 show the open queue
 *   cli-request-intake.ts check                validate every record, as a gate
 *
 * `file` takes the record as JSON on disk rather than as a wall of flags, so a
 * thread can write it with the tools it already has and so the thing that was
 * filed is exactly the thing that was reviewed. It exits non-zero on an invalid
 * record and writes nothing, because a queue nobody trusts is worse than no
 * queue.
 */

import fs from "fs";
import path from "path";

import {
  ART_REQUEST_INTAKE_DIRECTORY,
  openIntakeRecords,
  summarizeArtRequestIntake,
  validateArtRequestIntake,
  type ArtRequestIntakeRecord,
} from "../../src/authoring/art-request-intake";
import {
  IntakeFileExistsError,
  loadIntakeRecords,
  writeIntakeRecord,
} from "./request-intake-store";

const repositoryRoot = process.cwd();
const [command, argument] = process.argv.slice(2);

function report(records: readonly ArtRequestIntakeRecord[]): boolean {
  const validation = validateArtRequestIntake(records);
  for (const finding of validation.findings) {
    const mark = finding.severity === "error" ? "ERROR" : "warn ";
    console.error(`${mark} ${finding.requestId}: ${finding.message}`);
  }
  return validation.valid;
}

function loadAll(): readonly ArtRequestIntakeRecord[] {
  const loaded = loadIntakeRecords(repositoryRoot);
  for (const bad of loaded.unreadable) {
    console.error(`ERROR ${bad.filePath}: ${bad.reason}`);
  }
  if (loaded.unreadable.length > 0) process.exit(1);
  return loaded.records.map((entry) => entry.record);
}

if (command === "file") {
  if (!argument) {
    console.error("Usage: cli-request-intake.ts file <record.json>");
    process.exit(2);
  }
  const record = JSON.parse(
    fs.readFileSync(path.resolve(argument), "utf8"),
  ) as ArtRequestIntakeRecord;
  const existing = loadAll();
  if (!report([...existing, record])) {
    console.error("Nothing was filed.");
    process.exit(1);
  }
  try {
    const written = writeIntakeRecord(repositoryRoot, record);
    console.log(
      `Filed ${record.requestId} at ${path.relative(repositoryRoot, written)}`,
    );
  } catch (cause) {
    if (cause instanceof IntakeFileExistsError) {
      console.error(cause.message);
      process.exit(1);
    }
    throw cause;
  }
} else if (command === "list") {
  const records = loadAll();
  const open = openIntakeRecords(records);
  for (const record of open) {
    const where =
      record.jurisdiction.scope === "specific"
        ? `${record.jurisdiction.displayName}${
            record.jurisdiction.stateCode
              ? `, ${record.jurisdiction.stateCode}`
              : ""
          }`
        : "any jurisdiction";
    console.log(
      `${record.priority} ${record.requestId} — ${record.title} [${where}] (${record.requestedBy}, ${record.origin})`,
    );
  }
  const summary = summarizeArtRequestIntake(records);
  console.log(
    `\n${summary.open} open of ${summary.total} in ${ART_REQUEST_INTAKE_DIRECTORY}; P0 ${summary.byPriority.P0}, P1 ${summary.byPriority.P1}, P2 ${summary.byPriority.P2}.`,
  );
} else if (command === "check") {
  const records = loadAll();
  if (!report(records)) process.exit(1);
  console.log(`${records.length} intake record(s) valid.`);
} else {
  console.error(
    "Usage: cli-request-intake.ts <file <record.json> | list | check>",
  );
  process.exit(2);
}
