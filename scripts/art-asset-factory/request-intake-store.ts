/**
 * The filesystem half of `src/authoring/art-request-intake.ts`.
 *
 * Reading is a directory listing; filing is one new file. Nothing here appends
 * to a shared document, because two threads filing gaps from two branches must
 * never be able to lose one of them to a merge.
 */

import fs from "fs";
import path from "path";

import { writeFormatted } from "./write-formatted";
import {
  ART_REQUEST_INTAKE_DIRECTORY,
  type ArtRequestIntakeRecord,
} from "../../src/authoring/art-request-intake";

export interface LoadedIntakeRecord {
  readonly filePath: string;
  readonly record: ArtRequestIntakeRecord;
}

export interface IntakeLoadResult {
  readonly records: readonly LoadedIntakeRecord[];
  /** Files that are not readable records. Never silently skipped. */
  readonly unreadable: readonly {
    readonly filePath: string;
    readonly reason: string;
  }[];
}

export function intakeDirectory(repositoryRoot: string): string {
  return path.join(repositoryRoot, ART_REQUEST_INTAKE_DIRECTORY);
}

/** Read every record in the queue, newest filing last. */
export function loadIntakeRecords(repositoryRoot: string): IntakeLoadResult {
  const directory = intakeDirectory(repositoryRoot);
  if (!fs.existsSync(directory)) {
    return { records: [], unreadable: [] };
  }
  const records: LoadedIntakeRecord[] = [];
  const unreadable: { filePath: string; reason: string }[] = [];

  for (const entry of fs.readdirSync(directory).sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(directory, entry);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (cause) {
      unreadable.push({
        filePath,
        reason: `Not parseable JSON: ${(cause as Error).message}`,
      });
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) {
      unreadable.push({ filePath, reason: "Not a JSON object." });
      continue;
    }
    const record = parsed as ArtRequestIntakeRecord;
    const expected = `${record.requestId}.json`;
    if (entry !== expected) {
      unreadable.push({
        filePath,
        reason: `File is named '${entry}' but its requestId is '${record.requestId}', so the file expected is '${expected}'. The filename is how the queue stays collision-free.`,
      });
      continue;
    }
    records.push({ filePath, record });
  }

  records.sort((a, b) => a.record.filedAt.localeCompare(b.record.filedAt));
  return { records, unreadable };
}

export class IntakeFileExistsError extends Error {}

/**
 * Write one record. Refuses to overwrite: a second ask about the same gap is
 * either the same request (leave it) or a different one (give it its own id).
 *
 * The record goes out through `writeFormatted` rather than canonical JSON
 * because `art/requests/incoming/` is checked in and `npm run format` checks
 * it. Canonical JSON expands every array one entry per line; Prettier collapses
 * a short one. The two disagree on every record carrying a `seasons` or
 * `builtForm` list, so filing a request used to leave the formatter red for
 * whoever pushed next.
 */
export async function writeIntakeRecord(
  repositoryRoot: string,
  record: ArtRequestIntakeRecord,
): Promise<string> {
  const directory = intakeDirectory(repositoryRoot);
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${record.requestId}.json`);
  if (fs.existsSync(filePath)) {
    throw new IntakeFileExistsError(
      `'${record.requestId}' is already filed at ${filePath}. Read it first: if it is the same gap, nothing more is needed; if it is a different one, give it its own id.`,
    );
  }
  await writeFormatted(filePath, `${JSON.stringify(record, null, 2)}\n`);
  return filePath;
}
