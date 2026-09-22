/**
 * The filesystem half of `src/research/research-request.ts`.
 *
 * Reading is a directory listing; filing is one new file. Nothing here appends
 * to a shared document, because two threads filing questions from two branches
 * must never be able to lose one of them to a merge.
 */

import fs from "fs";
import path from "path";

import { toCanonicalJson } from "../../src/authoring/canonical-json";
import {
  RESEARCH_REQUEST_DIRECTORY,
  type ResearchRequestRecord,
} from "../../src/research/research-request";

export interface LoadedResearchRequest {
  readonly filePath: string;
  readonly record: ResearchRequestRecord;
}

export interface ResearchLoadResult {
  readonly records: readonly LoadedResearchRequest[];
  /** Files that are not readable records. Never silently skipped. */
  readonly unreadable: readonly {
    readonly filePath: string;
    readonly reason: string;
  }[];
}

export function researchRequestDirectory(repositoryRoot: string): string {
  return path.join(repositoryRoot, RESEARCH_REQUEST_DIRECTORY);
}

/** Read every question in the queue, oldest filing first. */
export function loadResearchRequests(
  repositoryRoot: string,
): ResearchLoadResult {
  const directory = researchRequestDirectory(repositoryRoot);
  if (!fs.existsSync(directory)) {
    return { records: [], unreadable: [] };
  }
  const records: LoadedResearchRequest[] = [];
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
    const record = parsed as ResearchRequestRecord;
    const expected = `${record.questionId}.json`;
    if (entry !== expected) {
      unreadable.push({
        filePath,
        reason: `File is named '${entry}' but its questionId is '${record.questionId}', so the file expected is '${expected}'. The filename is how the queue stays collision-free.`,
      });
      continue;
    }
    records.push({ filePath, record });
  }

  records.sort((left, right) =>
    String(left.record.filedAt).localeCompare(String(right.record.filedAt)),
  );
  return { records, unreadable };
}

export class ResearchRequestExistsError extends Error {}

/**
 * Write one question. Refuses to overwrite: a second ask about the same thing
 * is either the same question (leave it) or a different one (give it its own
 * id). Answering an existing question is an edit to its file, not a new file.
 */
export function writeResearchRequest(
  repositoryRoot: string,
  record: ResearchRequestRecord,
): string {
  const directory = researchRequestDirectory(repositoryRoot);
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${record.questionId}.json`);
  if (fs.existsSync(filePath)) {
    throw new ResearchRequestExistsError(
      `'${record.questionId}' is already filed at ${filePath}. Read it first: if it is the same question, nothing more is needed; if it is a different one, give it its own id.`,
    );
  }
  fs.writeFileSync(filePath, `${toCanonicalJson(record)}\n`);
  return filePath;
}
