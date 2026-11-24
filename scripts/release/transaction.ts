import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  constants,
} from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, sep } from "node:path";
import type { AppliedRelease } from "./apply";

const JOURNAL_NAME = "release-transaction.json";

interface JournalTarget {
  readonly path: string;
  readonly original:
    | { readonly exists: false }
    | {
        readonly exists: true;
        readonly contentsBase64: string;
        readonly mode: number;
      };
  readonly desired:
    | { readonly exists: false }
    | { readonly exists: true; readonly sha256: string; readonly mode: number };
  readonly tempPath: string;
}

interface ReleaseJournal {
  readonly schemaVersion: 1;
  readonly transactionId: string;
  readonly state: "prepared" | "committed";
  readonly targets: readonly JournalTarget[];
}

export interface TransactionHooks {
  /** Tests use this to inject an ordinary failure after any write/delete. */
  readonly afterMutation?: (index: number, path: string) => void;
  /** Tests use this to model process loss after durable commit marking. */
  readonly afterCommitMarker?: () => void;
}

/** A test-only abrupt-stop signal. Production interruptions are process exits. */
export class SimulatedTransactionInterruption extends Error {}

function sha256(contents: Buffer | string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function fsyncFile(path: string): void {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function fsyncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function journalPath(root: string): string {
  try {
    const resolved = execFileSync(
      "git",
      ["rev-parse", "--git-path", JOURNAL_NAME],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return isAbsolute(resolved) ? resolved : join(root, resolved);
  } catch {
    return join(root, `.${JOURNAL_NAME}`);
  }
}

function assertSafeTarget(root: string, path: string): string {
  if (
    path === "" ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") ||
    normalize(path) !== path ||
    /[\0\r\n]/.test(path)
  ) {
    throw new Error(`Unsafe release transaction path '${path}'.`);
  }
  const target = join(root, path);
  const within = relative(root, target);
  if (within.startsWith(`..${sep}`) || within === ".." || isAbsolute(within)) {
    throw new Error(
      `Release transaction path '${path}' escapes the repository.`,
    );
  }

  let cursor = root;
  for (const part of path.split("/").slice(0, -1)) {
    cursor = join(cursor, part);
    const stat = lstatSync(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(
        `Release transaction parent '${relative(root, cursor)}' is not a real directory.`,
      );
    }
  }
  if (existsSync(target)) {
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(
        `Release transaction target '${path}' is not a regular file.`,
      );
    }
  }
  return target;
}

function atomicReplace(
  path: string,
  contents: Buffer | string,
  mode: number,
  tempPath: string,
): void {
  if (existsSync(tempPath)) unlinkSync(tempPath);
  writeFileSync(tempPath, contents, { flag: "wx", mode });
  fsyncFile(tempPath);
  chmodSync(tempPath, mode);
  renameSync(tempPath, path);
  fsyncDirectory(dirname(path));
}

function writeJournal(path: string, journal: ReleaseJournal): void {
  const temp = `${path}.tmp`;
  if (existsSync(temp)) unlinkSync(temp);
  writeFileSync(temp, `${JSON.stringify(journal, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  fsyncFile(temp);
  renameSync(temp, path);
  fsyncDirectory(dirname(path));
}

function removeJournal(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
    fsyncDirectory(dirname(path));
  }
  const temp = `${path}.tmp`;
  if (existsSync(temp)) unlinkSync(temp);
}

function parseJournal(path: string): ReleaseJournal {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      `${path}: release transaction journal is not a regular file.`,
    );
  }
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path}: release transaction journal is not an object.`);
  }
  const journal = parsed as Partial<ReleaseJournal>;
  if (
    journal.schemaVersion !== 1 ||
    (journal.state !== "prepared" && journal.state !== "committed") ||
    typeof journal.transactionId !== "string" ||
    !Array.isArray(journal.targets)
  ) {
    throw new Error(`${path}: malformed release transaction journal.`);
  }
  return journal as ReleaseJournal;
}

function validateJournal(root: string, journal: ReleaseJournal): void {
  if (!/^[0-9a-f]{20}$/.test(journal.transactionId)) {
    throw new Error(
      "Release transaction journal has an invalid transaction id.",
    );
  }
  const seen = new Set<string>();
  for (const [index, target] of journal.targets.entries()) {
    if (typeof target !== "object" || target === null) {
      throw new Error("Release transaction journal has a malformed target.");
    }
    assertSafeTarget(root, target.path);
    if (seen.has(target.path)) {
      throw new Error(`Release transaction journal repeats '${target.path}'.`);
    }
    seen.add(target.path);
    const expectedTemp = join(
      dirname(target.path),
      `.release-transaction-${journal.transactionId}-${index}.tmp`,
    );
    if (target.tempPath !== expectedTemp) {
      throw new Error(
        `Release transaction journal has an invalid temporary path for '${target.path}'.`,
      );
    }
    assertSafeTarget(root, target.tempPath);
    if (
      typeof target.original !== "object" ||
      target.original === null ||
      typeof target.original.exists !== "boolean" ||
      typeof target.desired !== "object" ||
      target.desired === null ||
      typeof target.desired.exists !== "boolean"
    ) {
      throw new Error(
        `Release transaction journal has malformed state for '${target.path}'.`,
      );
    }
    if (
      target.original.exists &&
      (typeof target.original.contentsBase64 !== "string" ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          target.original.contentsBase64,
        ) ||
        !Number.isInteger(target.original.mode) ||
        target.original.mode < 0 ||
        target.original.mode > 0o777)
    ) {
      throw new Error(
        `Release transaction journal has a malformed original snapshot for '${target.path}'.`,
      );
    }
    if (
      target.desired.exists &&
      (!/^[0-9a-f]{64}$/.test(target.desired.sha256) ||
        !Number.isInteger(target.desired.mode) ||
        target.desired.mode < 0 ||
        target.desired.mode > 0o777)
    ) {
      throw new Error(
        `Release transaction journal has a malformed desired snapshot for '${target.path}'.`,
      );
    }
  }
}

function targetMatches(
  root: string,
  target: JournalTarget,
  desired: boolean,
): boolean {
  const path = assertSafeTarget(root, target.path);
  if (desired) {
    const state = target.desired;
    if (!state.exists) return !existsSync(path);
    if (!existsSync(path)) return false;
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
    return (
      sha256(readFileSync(path)) === state.sha256 &&
      (stat.mode & 0o777) === state.mode
    );
  }

  const state = target.original;
  if (!state.exists) return !existsSync(path);
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) return false;
  return (
    readFileSync(path).toString("base64") === state.contentsBase64 &&
    (stat.mode & 0o777) === state.mode
  );
}

function restoreOriginal(root: string, target: JournalTarget): void {
  const path = assertSafeTarget(root, target.path);
  if (target.original.exists) {
    atomicReplace(
      path,
      Buffer.from(target.original.contentsBase64, "base64"),
      target.original.mode,
      join(root, target.tempPath),
    );
  } else if (existsSync(path)) {
    unlinkSync(path);
    fsyncDirectory(dirname(path));
  }
  const tempPath = join(root, target.tempPath);
  if (existsSync(tempPath)) unlinkSync(tempPath);
}

/**
 * Recover a transaction left by process interruption.
 *
 * A prepared journal rolls every target back. A committed journal is only
 * cleanup: all desired bytes must still match before the journal is removed.
 */
export function recoverReleaseTransaction(
  root: string,
): "none" | "rolled-back" | "finalized" {
  const path = journalPath(root);
  if (!existsSync(path)) return "none";
  const journal = parseJournal(path);
  validateJournal(root, journal);

  if (journal.state === "committed") {
    for (const target of journal.targets) {
      if (!targetMatches(root, target, true)) {
        throw new Error(
          `Committed release transaction ${journal.transactionId} no longer matches '${target.path}'; refusing to guess recovery direction.`,
        );
      }
      const temp = join(root, target.tempPath);
      if (existsSync(temp)) unlinkSync(temp);
    }
    removeJournal(path);
    return "finalized";
  }

  for (const target of [...journal.targets].reverse()) {
    restoreOriginal(root, target);
  }
  for (const target of journal.targets) {
    if (!targetMatches(root, target, false)) {
      throw new Error(
        `Release transaction rollback could not restore '${target.path}'. The journal remains at ${path}.`,
      );
    }
  }
  removeJournal(path);
  return "rolled-back";
}

export function hasReleaseTransaction(root: string): boolean {
  return existsSync(journalPath(root));
}

function prepareJournal(root: string, applied: AppliedRelease): ReleaseJournal {
  const paths = [
    ...applied.writes.map((write) => write.path),
    ...applied.deletions,
  ];
  if (new Set(paths).size !== paths.length) {
    throw new Error(
      "Release transaction contains the same target more than once.",
    );
  }
  const transactionId = sha256(
    JSON.stringify({
      writes: applied.writes.map((write) => [
        write.path,
        sha256(write.contents),
      ]),
      deletions: applied.deletions,
    }),
  ).slice(0, 20);

  const writes = new Map(applied.writes.map((write) => [write.path, write]));
  const targets = paths.map((path, index): JournalTarget => {
    const target = assertSafeTarget(root, path);
    accessSync(dirname(target), constants.W_OK);
    const stat = existsSync(target) ? lstatSync(target) : null;
    const original: JournalTarget["original"] = stat
      ? {
          exists: true,
          contentsBase64: readFileSync(target).toString("base64"),
          mode: stat.mode & 0o777,
        }
      : { exists: false };
    const write = writes.get(path);
    const desired: JournalTarget["desired"] = write
      ? {
          exists: true,
          sha256: sha256(write.contents),
          mode: stat ? stat.mode & 0o777 : 0o644,
        }
      : { exists: false };
    const tempName = `.release-transaction-${transactionId}-${index}.tmp`;
    return {
      path,
      original,
      desired,
      tempPath: join(dirname(path), tempName),
    };
  });

  return {
    schemaVersion: 1,
    transactionId,
    state: "prepared",
    targets,
  };
}

export function commitReleaseTransaction(
  root: string,
  applied: AppliedRelease,
  hooks: TransactionHooks = {},
): void {
  recoverReleaseTransaction(root);
  const journal = prepareJournal(root, applied);
  const path = journalPath(root);
  writeJournal(path, journal);

  try {
    const writes = new Map(applied.writes.map((write) => [write.path, write]));
    for (const [index, target] of journal.targets.entries()) {
      const absolute = assertSafeTarget(root, target.path);
      const write = writes.get(target.path);
      if (write !== undefined) {
        const mode = target.desired.exists ? target.desired.mode : 0o644;
        atomicReplace(
          absolute,
          write.contents,
          mode,
          join(root, target.tempPath),
        );
      } else if (existsSync(absolute)) {
        unlinkSync(absolute);
        fsyncDirectory(dirname(absolute));
      }
      hooks.afterMutation?.(index + 1, target.path);
    }

    for (const target of journal.targets) {
      if (!targetMatches(root, target, true)) {
        throw new Error(
          `Release transaction verification failed for '${target.path}'.`,
        );
      }
    }
    writeJournal(path, { ...journal, state: "committed" });
    hooks.afterCommitMarker?.();
    removeJournal(path);
  } catch (error) {
    if (error instanceof SimulatedTransactionInterruption) throw error;
    try {
      recoverReleaseTransaction(root);
    } catch (recoveryError) {
      throw new Error(
        `Release transaction failed (${(error as Error).message}) and automatic rollback also failed ` +
          `(${(recoveryError as Error).message}). Re-run release:recover before continuing.`,
      );
    }
    throw error;
  }
}
