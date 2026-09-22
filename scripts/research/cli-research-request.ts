/**
 * Usage:
 *   cli-research-request.ts file <record.json>   file one question into the queue
 *   cli-research-request.ts list                 show the open queue, one line each
 *   cli-research-request.ts check                validate every record, as a gate
 *   cli-research-request.ts render [--write] [--allow-drop]
 *                                                the open queue as one document
 *
 * `file` takes the record as JSON on disk rather than as a wall of flags, so a
 * thread can write it with the tools it already has and so the thing that was
 * filed is exactly the thing that was reviewed. It exits non-zero on an invalid
 * record and writes nothing, because a queue nobody trusts is worse than no
 * queue.
 *
 * `render` refuses when this checkout holds fewer questions than the document
 * already on disk, because the document is a function of whichever request
 * files the branch happens to hold and a short render is indistinguishable
 * from a complete one. `--allow-drop` says the missing ones were withdrawn on
 * purpose.
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
  droppedQuestionIds,
  filedRecordNotice,
  renderOpenQuestions,
  summarizeOpenQuestions,
  validateResearchRequests,
  type FiledRecordPlacement,
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

/**
 * The branch this render came from, because the document is a function of
 * whichever request files this checkout holds and not of the queue as a whole.
 */
function currentBranch(): string | undefined {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    return branch === "HEAD" ? undefined : branch;
  } catch {
    return undefined;
  }
}

function git(...args: readonly string[]): string | undefined {
  try {
    return execFileSync("git", [...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * The default branch this repository publishes from, read rather than assumed:
 * a fork or a rename should not make the warning lie.
 */
function defaultBranch(): string {
  const head = git(
    "symbolic-ref",
    "--quiet",
    "--short",
    "refs/remotes/origin/HEAD",
  );
  return head?.replace(/^origin\//, "") ?? "main";
}

/**
 * Where the record just written can actually be seen from. The pull-request
 * half needs the network, so it is allowed to come back unknown; see
 * `filedRecordNotice` for why that must not read as "there is none".
 */
function placeFiledRecord(): FiledRecordPlacement {
  const base = defaultBranch();
  const branch = currentBranch();
  if (branch === undefined) {
    return { isDefaultBranch: false, pushed: false, pullRequest: "unknown" };
  }
  if (branch === base) {
    return { branch, isDefaultBranch: true, pushed: true, pullRequest: "none" };
  }
  const pushed =
    git("rev-parse", "--verify", `refs/remotes/origin/${branch}`) !== undefined;
  const aheadCount = git("rev-list", "--count", `origin/${base}..HEAD`);
  const ahead = aheadCount === undefined ? undefined : Number(aheadCount);
  return {
    branch,
    isDefaultBranch: false,
    pushed,
    commitsAhead: Number.isFinite(ahead) ? ahead : undefined,
    pullRequest: pushed ? openPullRequest(branch) : "none",
  };
}

/**
 * Whether the branch has an open pull request, when that can be established
 * without a network call we may not be able to make. `gh` is the only probe
 * tried: a missing binary, no credentials or no network all mean unknown, and
 * unknown is reported as unknown.
 */
function openPullRequest(branch: string): "open" | "none" | "unknown" {
  try {
    const found = execFileSync(
      "gh",
      ["pr", "list", "--head", branch, "--state", "open", "--json", "number"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const parsed: unknown = JSON.parse(found);
    return Array.isArray(parsed) && parsed.length > 0 ? "open" : "none";
  } catch {
    return "unknown";
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
    const written = await writeResearchRequest(repositoryRoot, record);
    console.log(
      `Filed ${record.questionId} at ${path.relative(repositoryRoot, written)}`,
    );
    // A filed record that never reaches the branch the render is built from
    // has asked nobody anything. Two sweeps an hour apart on 2026-09-22 found
    // nine of them stranded across four branches, every one written by
    // somebody who thought the question had been asked.
    for (const line of filedRecordNotice(
      record.questionId,
      placeFiledRecord(),
    )) {
      console.warn(line);
    }
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
  const target = path.join(repositoryRoot, RENDERED_DOCUMENT);
  // Compare against the document already on disk before producing a new one.
  // The failure this guards against is not a bad record, it is a branch that
  // never held one: the render is complete-looking either way, so the only
  // moment the loss is visible is right here.
  if (fs.existsSync(target)) {
    const dropped = droppedQuestionIds(
      fs.readFileSync(target, "utf8"),
      records,
    );
    if (dropped.length > 0) {
      const allowed = rest.includes("--allow-drop");
      console.error(
        `${allowed ? "warn " : "ERROR"} this render drops ${dropped.length} question(s) the last one carried:`,
      );
      for (const id of dropped) console.error(`  ${id}`);
      console.error(
        allowed
          ? "Continuing because --allow-drop was given."
          : [
              "This branch does not hold them. Fetch the branches that do, or",
              "pass --allow-drop if they were withdrawn on purpose. Publishing",
              "this document as it stands would delete them from the copy",
              "people read.",
            ].join("\n"),
      );
      if (!allowed) process.exit(1);
    }
  }
  const document = renderOpenQuestions(
    records,
    new Date().toISOString(),
    currentCommit(),
    currentBranch(),
  );
  if (rest.includes("--write")) {
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
      "  cli-research-request.ts render [--write] [--allow-drop]",
    ].join("\n"),
  );
  process.exit(2);
}
