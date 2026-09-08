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
import { parseVersion } from "./version";
import type { ReleasePlan } from "./model";

export const REPO_ROOT = process.cwd();

function lockfileVersion(root: string): string | null {
  const path = join(root, "package-lock.json");
  if (!existsSync(path)) return null;
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  const version = (parsed as { version?: unknown }).version;
  return typeof version === "string" ? version : null;
}

/**
 * The deterministic gate `npm run validate` runs.
 *
 * It checks what is in the tree; it does not require a declaration to be there.
 * Demanding one would retroactively fail every branch cut before this
 * convention existed, and would push agents into writing a fake player note for
 * a parser change rather than admitting the change has nothing to say.
 */
export function check(root: string): string[] {
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
    const locked = lockfileVersion(root);
    if (locked !== null && locked !== packageVersion) {
      problems.push(
        `package-lock.json records version ${locked} while package.json records ${packageVersion}. ` +
          `The accepted release version has one source; the lockfile mirrors it.`,
      );
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

  return problems;
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
      const problems = check(root);
      if (problems.length > 0) {
        for (const problem of problems)
          console.error(`release:check — ${problem}`);
        return 1;
      }
      const identity = resolveBuildIdentity(root);
      console.log(
        `release:check — version ${identity.version}, revision ${identity.revisionShort}${identity.dirty ? " (dirty)" : ""}, ` +
          `${loadDeclarations(root).length} pending declaration(s). OK.`,
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
        "usage: release <check|preview [--json]|apply [--dry-run]|declare <id>>",
      );
      return 1;
  }
}
