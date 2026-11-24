/**
 * `npm run release:check | release:preview | release:apply | release:declare`
 *
 * The same code path serves a developer's laptop and the release event. There
 * is no separate CI implementation to drift from the one the tests drive, and
 * nothing here reaches the network or a language model: a release is arithmetic
 * over files that are already in the repository.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { CHANGES_DIR, loadDeclarations } from "./declarations";
import { LEDGER_PATH, consumedIds, loadLedger } from "./ledger";
import { acceptedVersions, parseNotes } from "./notes";
import { planRelease } from "./plan";
import { NOTES_PATH, commitWrites, planWrites } from "./apply";
import { readPackageVersion, resolveBuildIdentity } from "./build-identity";
import {
  assertVersionMetadataAgreement,
  readLockfileVersionMetadata,
} from "./package-metadata";
import {
  checkDeclarationTransition,
  type DeclarationComparison,
  type DeclarationComparisonMode,
} from "./transition";
import {
  hasReleaseTransaction,
  recoverReleaseTransaction,
} from "./transaction";
import { parseVersion } from "./version";
import type { ReleasePlan } from "./model";

export const REPO_ROOT = process.cwd();

/**
 * The deterministic gate `npm run validate` runs.
 */
export function check(
  root: string,
  comparison?: DeclarationComparison,
): string[] {
  const problems: string[] = [];
  const record = (error: unknown): void => {
    problems.push((error as Error).message);
  };

  let packageVersion: string | null = null;
  try {
    packageVersion = readPackageVersion(root);
    parseVersion(packageVersion);
  } catch (error) {
    record(error);
  }

  if (packageVersion !== null) {
    try {
      assertVersionMetadataAgreement(
        packageVersion,
        readLockfileVersionMetadata(root),
      );
    } catch (error) {
      record(error);
    }
    try {
      const notes = parseNotes(readFileSync(join(root, NOTES_PATH), "utf8"));
      const accepted = acceptedVersions(notes);
      if (!accepted.has(packageVersion)) {
        problems.push(
          `${NOTES_PATH} has no accepted section for the package version ${packageVersion}. ` +
            `The canonical notes and the canonical version describe the same release.`,
        );
      }
    } catch (error) {
      record(error);
    }
  }

  let declared: ReturnType<typeof loadDeclarations> = [];
  try {
    declared = loadDeclarations(root);
  } catch (error) {
    record(error);
  }

  try {
    const already = consumedIds(loadLedger(root));
    for (const declaration of declared) {
      if (already.has(declaration.id)) {
        problems.push(
          `${declaration.path}: change id '${declaration.id}' is already recorded in ${LEDGER_PATH}. ` +
            `Give this change its own id.`,
        );
      }
    }
  } catch (error) {
    record(error);
  }

  try {
    const identity = resolveBuildIdentity(root);
    if (packageVersion !== null && identity.version !== packageVersion) {
      problems.push(
        `Build identity reports version ${identity.version}, package.json reports ${packageVersion}.`,
      );
    }
  } catch (error) {
    record(error);
  }

  if (hasReleaseTransaction(root)) {
    problems.push(
      "A release transaction journal is present. Run 'npm run release:recover' before validation.",
    );
  }

  if (comparison !== undefined) {
    try {
      problems.push(...checkDeclarationTransition(root, comparison).problems);
    } catch (error) {
      record(error);
    }
  }

  return problems;
}

function optionalFlag(
  rest: readonly string[],
  name: string,
): string | undefined {
  const at = rest.indexOf(name);
  if (at === -1) return undefined;
  const value = rest[at + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function gitRevision(root: string, args: readonly string[]): string | null {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function declarationComparison(
  root: string,
  rest: readonly string[],
): DeclarationComparison {
  const baseFlag = optionalFlag(rest, "--base");
  const headFlag = optionalFlag(rest, "--head");
  const modeValue =
    optionalFlag(rest, "--mode") ??
    process.env.RELEASE_DECLARATION_MODE ??
    "pr";
  if (modeValue !== "pr" && modeValue !== "push") {
    throw new Error("--mode must be 'pr' or 'push'.");
  }
  const mode = modeValue as DeclarationComparisonMode;
  const head =
    headFlag ??
    process.env.RELEASE_DECLARATION_HEAD ??
    gitRevision(root, ["rev-parse", "HEAD"]);
  if (!head)
    throw new Error("Could not resolve a declaration comparison head.");
  const base =
    baseFlag ??
    process.env.RELEASE_DECLARATION_BASE ??
    gitRevision(root, ["rev-parse", "origin/main"]) ??
    gitRevision(root, ["rev-parse", "HEAD^"]) ??
    head;
  return { base, head, mode };
}

/** The calendar date of the revision being released — not the wall clock. */
export function revisionDate(root: string): string {
  try {
    const iso = execFileSync(
      "git",
      ["log", "-1", "--format=%cd", "--date=short"],
      {
        cwd: root,
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf8",
      },
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  } catch {
    // Fall through to the caller's problem below.
  }
  throw new Error(
    "Could not read the revision's commit date. A release is dated by the revision it describes.",
  );
}

export function currentPlan(root: string, isoDate: string): ReleasePlan {
  return planRelease({
    currentVersion: readPackageVersion(root),
    notesText: readFileSync(join(root, NOTES_PATH), "utf8"),
    declarations: loadDeclarations(root),
    alreadyConsumed: consumedIds(loadLedger(root)),
    isoDate,
  });
}

const TEMPLATE = (id: string): string =>
  `---
id: ${id}
impact: none
---

Replace this line with a one-line internal reason this change has nothing to
tell a player. If it does have something to tell a player, set impact to patch
(bugfix or polish) or minor (a visible feature or system), add a section
(Added, Improved, Fixed or Changed) and a title, and write the body as prose a
player would read in a public update.
`;

export function declare(root: string, id: string): string {
  const dir = join(root, CHANGES_DIR);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${id}.md`);
  if (existsSync(path)) {
    throw new Error(`${CHANGES_DIR}/${id}.md already exists.`);
  }
  writeFileSync(path, TEMPLATE(id));
  return `${CHANGES_DIR}/${id}.md`;
}

function describe(plan: ReleasePlan): string {
  const lines = [
    `outcome: ${plan.outcome}`,
    `current version: ${plan.currentVersion}`,
  ];
  if (plan.outcome === "release") {
    lines.push(`next version: ${plan.nextVersion}`);
    lines.push(
      `consuming: ${plan.consumed.map((entry) => entry.id).join(", ")}`,
    );
    lines.push("", plan.renderedSection ?? "");
  } else if (plan.reason) {
    lines.push(`reason: ${plan.reason}`);
  }
  return lines.join("\n");
}

export function main(argv: readonly string[], root: string): number {
  try {
    return run(argv, root);
  } catch (error) {
    // A malformed declaration or an unreadable tree is a message, not a stack
    // trace: the person reading it is usually an agent that has to fix the file.
    console.error(`release — ${(error as Error).message}`);
    return 1;
  }
}

function run(argv: readonly string[], root: string): number {
  const [command, ...rest] = argv;
  switch (command) {
    case "check": {
      const comparison = declarationComparison(root, rest);
      const problems = check(root, comparison);
      if (problems.length > 0) {
        for (const problem of problems)
          console.error(`release:check — ${problem}`);
        return 1;
      }
      const identity = resolveBuildIdentity(root);
      console.log(
        `release:check — version ${identity.version}, revision ${identity.revisionShort}${identity.dirty ? " (dirty)" : ""}, ` +
          `${loadDeclarations(root).length} pending declaration(s), declaration range ` +
          `${comparison.base}..${comparison.head} (${comparison.mode}). OK.`,
      );
      return 0;
    }
    case "preview": {
      const plan = currentPlan(root, revisionDate(root));
      if (rest.includes("--json")) {
        // A machine reading the plan wants the plan, including a blocked one.
        // Failing here would deny the release event the very reason it needs
        // in order to report the block, so --json is a data dump and exits 0.
        console.log(JSON.stringify(plan, null, 2));
        return 0;
      }
      console.log(describe(plan));
      return plan.outcome === "blocked" ? 1 : 0;
    }
    case "apply": {
      const recovery = recoverReleaseTransaction(root);
      if (recovery !== "none") {
        console.log(
          `release:apply — recovered an interrupted transaction (${recovery}).`,
        );
      }
      const isoDate = revisionDate(root);
      const plan = currentPlan(root, isoDate);
      if (plan.outcome === "blocked") {
        console.error(`release:apply — blocked. ${plan.reason ?? ""}`);
        return 1;
      }
      if (plan.outcome === "no-op") {
        console.log(`release:apply — nothing to release. ${plan.reason ?? ""}`);
        return 0;
      }
      const identity = resolveBuildIdentity(root);
      const applied = planWrites(
        root,
        plan,
        loadLedger(root),
        identity.revision,
        isoDate,
      );
      if (rest.includes("--dry-run")) {
        console.log(
          `release:apply --dry-run — would release ${plan.nextVersion}, ` +
            `writing ${applied.writes.map((write) => write.path).join(", ")} and ` +
            `consuming ${applied.deletions.length} declaration file(s).`,
        );
        return 0;
      }
      commitWrites(root, applied);
      console.log(`release:apply — released ${plan.nextVersion}.`);
      return 0;
    }
    case "recover": {
      const recovery = recoverReleaseTransaction(root);
      console.log(`release:recover — ${recovery}.`);
      return 0;
    }
    case "declare": {
      const id = rest[0];
      if (!id) {
        console.error(
          "release:declare — usage: npm run release:declare -- <change-id>",
        );
        return 1;
      }
      console.log(`release:declare — wrote ${declare(root, id)}`);
      return 0;
    }
    default:
      console.error(
        "usage: release <check [--base REV --head REV --mode pr|push]|preview [--json]|apply [--dry-run]|recover|declare <id>>",
      );
      return 1;
  }
}
