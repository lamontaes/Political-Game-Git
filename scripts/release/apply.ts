/**
 * The only part of the release tooling that writes to disk.
 *
 * Every new file's bytes are computed before any of them are written, so a
 * rejected plan or a bad render fails before the tree has been touched. The
 * remote side is separate on purpose: this produces a local commit-shaped
 * change, and publishing it is one push that either lands whole or not at all.
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChangeDeclaration, ReleasePlan } from "./model";
import { insertReleaseSection } from "./notes";
import type { Ledger } from "./ledger";
import {
  LEDGER_PATH,
  appendEntry,
  consumedIds,
  loadLedger,
  serializeLedger,
} from "./ledger";
import { loadDeclarations } from "./declarations";
import { planRelease } from "./plan";
import { readPackageVersion } from "./build-identity";

export const NOTES_PATH = "PATCH_NOTES.md";
export const PACKAGE_PATH = "package.json";
export const LOCKFILE_PATH = "package-lock.json";

export interface PlannedWrite {
  readonly path: string;
  readonly contents: string;
}

export interface AppliedRelease {
  readonly writes: readonly PlannedWrite[];
  readonly deletions: readonly string[];
}

/**
 * Move a version string in `package.json` without reformatting the file.
 *
 * A JSON round-trip would reorder nothing but would still rewrite whitespace
 * that other lanes have their own opinions about, so the edit is the narrowest
 * one that does the job: the top-level `version` line, and nothing else.
 */
export function bumpPackageVersion(
  text: string,
  from: string,
  to: string,
): string {
  const pattern = new RegExp(
    `^(\\s*"version"\\s*:\\s*")${from.replace(/\./g, "\\.")}(")`,
    "m",
  );
  if (!pattern.test(text)) {
    throw new Error(
      `Could not find a top-level "version": "${from}" line to advance.`,
    );
  }
  return text.replace(pattern, `$1${to}$2`);
}

/**
 * The lockfile records the package's own version twice.
 *
 * `npm ci` reconciles them, so leaving one behind turns every later install
 * into a spurious diff. Both are the same literal edit, and both are required.
 */
export function bumpLockfileVersion(
  text: string,
  from: string,
  to: string,
): string {
  const escaped = from.replace(/\./g, "\\.");
  const pattern = new RegExp(
    `^(\\s*"version"\\s*:\\s*")${escaped}(",?)$`,
    "gm",
  );
  const matches = text.match(pattern);
  if (!matches || matches.length < 2) {
    throw new Error(
      `Expected the lockfile to carry version "${from}" for the root package twice; found ${matches?.length ?? 0}.`,
    );
  }
  // Only the first two occurrences belong to the root package: the top-level
  // field and packages[""]. A dependency that happens to share the version
  // number is not ours to move.
  let seen = 0;
  return text.replace(pattern, (match, prefix: string, suffix: string) => {
    seen += 1;
    return seen <= 2 ? `${prefix}${to}${suffix}` : match;
  });
}

/** Compute every byte the release writes, without writing any of them. */
export function planWrites(
  root: string,
  plan: ReleasePlan,
  ledger: Ledger,
  revision: string,
  isoDate: string,
): AppliedRelease {
  if (plan.outcome !== "release" || plan.renderedSection === undefined) {
    throw new Error(`Refusing to apply a '${plan.outcome}' plan.`);
  }
  const read = (path: string): string => readFileSync(join(root, path), "utf8");

  const writes: PlannedWrite[] = [
    {
      path: PACKAGE_PATH,
      contents: bumpPackageVersion(
        read(PACKAGE_PATH),
        plan.currentVersion,
        plan.nextVersion,
      ),
    },
    {
      path: LOCKFILE_PATH,
      contents: bumpLockfileVersion(
        read(LOCKFILE_PATH),
        plan.currentVersion,
        plan.nextVersion,
      ),
    },
    {
      path: NOTES_PATH,
      contents: insertReleaseSection(
        read(NOTES_PATH),
        plan.nextVersion,
        plan.renderedSection,
      ),
    },
    {
      path: LEDGER_PATH,
      contents: serializeLedger(
        appendEntry(ledger, {
          version: plan.nextVersion,
          releasedOn: isoDate,
          revision,
          changeIds: plan.consumed.map((entry) => entry.id).sort(),
        }),
      ),
    },
  ];

  const deletions = plan.consumed
    .map((entry: ChangeDeclaration) => entry.path)
    .filter((path): path is string => path !== undefined);

  return { writes, deletions };
}

export function commitWrites(root: string, applied: AppliedRelease): void {
  for (const write of applied.writes) {
    writeFileSync(join(root, write.path), write.contents);
  }
  for (const path of applied.deletions) {
    rmSync(join(root, path), { force: true });
  }
}

/**
 * Plan and apply one release against a tree, the way the release event does.
 *
 * The event adds a commit and a push around this; everything that decides what
 * the repository ends up containing is here, so the tests drive the same code
 * the workflow runs rather than a second implementation of it.
 */
export function releaseTree(
  root: string,
  isoDate: string,
  revision: string,
): ReleasePlan {
  const plan = planRelease({
    currentVersion: readPackageVersion(root),
    notesText: readFileSync(join(root, NOTES_PATH), "utf8"),
    declarations: loadDeclarations(root),
    alreadyConsumed: consumedIds(loadLedger(root)),
    isoDate,
  });
  if (plan.outcome !== "release") return plan;
  commitWrites(
    root,
    planWrites(root, plan, loadLedger(root), revision, isoDate),
  );
  return plan;
}
