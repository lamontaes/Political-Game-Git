/**
 * Usage:
 *   cli-research-request.ts file <record.json>   file one question into the queue
 *   cli-research-request.ts list                 show the open queue, one line each
 *   cli-research-request.ts check                validate every record, as a gate
 *   cli-research-request.ts render [--write]     the open queue as one document
 *
 * `file` takes the record as JSON on disk rather than as a wall of flags, so a
 * thread can write it with the tools it already has and so the thing that was
 * filed is exactly the thing that was reviewed. It exits non-zero on an invalid
 * record and writes nothing, because a queue nobody trusts is worse than no
 * queue.
 *
 * `render` prints the document to stdout. `--write` puts it at
 * docs/research/OPEN-QUESTIONS.md, which is generated: if two branches both
 * write it, resolve the conflict by running this again rather than by merging
 * the prose.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  renderOpenQuestions,
  summarizeOpenQuestions,
  validateResearchRequests,
  type ResearchRequestRecord,
} from "../../src/research/research-request";
import {
  ResearchRequestExistsError,
  loadResearchRequests,
  writeResearchRequest,
} from "./request-store";

const RENDERED_DOCUMENT = "docs/research/OPEN-QUESTIONS.md";

const repositoryRoot = process.cwd();
const [command, ...rest] = process.argv.slice(2);

function report(records: readonly ResearchRequestRecord[]): boolean {
  const validation = validateResearchRequests(records);
  for (const finding of validation.findings) {
    const mark = finding.severity === "error" ? "ERROR" : "warn ";
    console.error(`${mark} ${finding.questionId}: ${finding.message}`);
  }
  return validation.valid;
}

/**
 * The head this render describes, or nothing if we are not in a checkout. The
 * Drive copy is read by people who cannot see our branches, so it has to carry
 * its own provenance.
 */
function currentCommit(): string | undefined {
  try {
    const revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    const dirty =
      execFileSync("git", ["status", "--porcelain"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim().length > 0;
    return dirty ? `${revision} (working tree modified)` : revision;
  } catch {
    return undefined;
  }
}

function loadAll(): readonly ResearchRequestRecord[] {
  const loaded = loadResearchRequests(repositoryRoot);
  for (const bad of loaded.unreadable) {
    console.error(`ERROR ${bad.filePath}: ${bad.reason}`);
  }
  if (loaded.unreadable.length > 0) process.exit(1);
  return loaded.records.map((entry) => entry.record);
}

if (command === "file") {
  const [argument] = rest;
  if (!argument) {
    console.error("Usage: cli-research-request.ts file <record.json>");
    process.exit(2);
  }
  const record = JSON.parse(
    fs.readFileSync(path.resolve(argument), "utf8"),
  ) as ResearchRequestRecord;
  const existing = loadAll();
  if (!report([...existing, record])) {
    console.error("Nothing was filed.");
    process.exit(1);
  }
  try {
    const written = writeResearchRequest(repositoryRoot, record);
    console.log(
      `Filed ${record.questionId} at ${path.relative(repositoryRoot, written)}`,
    );
  } catch (cause) {
    if (cause instanceof ResearchRequestExistsError) {
      console.error(cause.message);
      process.exit(1);
    }
    throw cause;
  }
} else if (command === "list") {
  const lines = summarizeOpenQuestions(loadAll());
  if (lines.length === 0) {
    console.log("No open research questions.");
  } else {
    for (const line of lines) console.log(line);
  }
} else if (command === "check") {
  if (!report(loadAll())) process.exit(1);
  console.log("Every research question is complete enough to act on.");
} else if (command === "render") {
  const records = loadAll();
  const document = renderOpenQuestions(
    records,
    new Date().toISOString(),
    currentCommit(),
  );
  if (rest.includes("--write")) {
    const target = path.join(repositoryRoot, RENDERED_DOCUMENT);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, document);
    console.log(`Wrote ${RENDERED_DOCUMENT}`);
  } else {
    process.stdout.write(document);
  }
} else {
  console.error(
    [
      "Usage:",
      "  cli-research-request.ts file <record.json>",
      "  cli-research-request.ts list",
      "  cli-research-request.ts check",
      "  cli-research-request.ts render [--write]",
    ].join("\n"),
  );
  process.exit(2);
}
