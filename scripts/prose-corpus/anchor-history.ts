import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";

/**
 * Allocation history for computed anchors, and the rules that make its loss
 * detectable.
 *
 * The sidecar records which ids are ALIVE. That is a different question from
 * which ids have ever been ISSUED, and conflating the two is the defect this
 * lineage was built to close: minting used to reserve only the ids present in
 * the current sidecar, so retiring `threadMovementSentence-0002` returned that
 * number to the pool and the next unrelated sentence in the symbol was handed
 * it. An owner's recorded judgement on the retired line then reads as
 * judgement on prose nobody reviewed.
 *
 * A ledger of issued ids closes that only while the ledger itself is intact.
 * Reproduced against the production CLI, it was not enough on its own: with a
 * missing ledger, with `issued` absent, null or a bare string, or with exactly
 * one retired entry deleted from an otherwise valid ledger, the loader's
 * defaults produced a successful run that reissued the retired number. The
 * loader could not tell a legitimate first install from destroyed history.
 *
 * So history is held in TWO independent places, and neither one alone can
 * authorise an allocation:
 *
 *   1. the LEDGER — every id ever issued, in full. Append-only.
 *   2. the BASELINE — a small independent checkpoint: how many ids the ledger
 *      held, a digest of that exact list, and the highest index ever issued
 *      per symbol.
 *
 * The baseline is not recomputed from the ledger at read time; it is written
 * alongside it and read back as prior evidence. That is what makes surgical
 * truncation detectable — deleting one retired id leaves a valid-looking
 * ledger whose count and digest no longer match the checkpoint recorded before
 * the deletion. A checksum recomputed from the same truncated input would
 * prove nothing, which is why the checkpoint is a separate retained file.
 *
 * The baseline also carries the allocator's floor. `highWater` is a per-symbol
 * mark that allocation never goes below, whatever the ledger happens to say.
 * Detection and the floor are deliberately separate mechanisms: even a ledger
 * that has been quietly shrunk cannot hand back a number below the mark.
 *
 * STATED THREAT BOUNDARY. This detects the loss, truncation, corruption or
 * lagging of EITHER file. It does not, and cannot, defend against the
 * simultaneous replacement of BOTH files with a mutually consistent forgery —
 * anyone able to rewrite the ledger and the checkpoint together can declare
 * any history they like. What is offered is that such a change is a visible,
 * reviewable edit to two committed files, never a silent consequence of a
 * routine mint.
 *
 * Nothing here reads git, the network, or anything outside these two files.
 * No part of the game runtime and no save depends on this module.
 */

/**
 * Where the two history files live.
 *
 * Overridable by environment variable for one reason: the regressions that
 * matter here are about what the PRODUCTION CLI does to a corrupted file on
 * disk, and those cannot be written at all if the only reachable paths are the
 * repository's own. A probe points the real command at disposable copies
 * instead of at the sidecar an owner's review is pinned to.
 *
 * This relocates the files; it does not relax anything. Every load still runs
 * the full schema and integrity checks, and the CLI prints the paths it used
 * whenever they are not the defaults, so a run against scratch files can never
 * be mistaken for a run against the real ones.
 */
export const LEDGER_FILE =
  process.env.PROSE_ANCHOR_LEDGER_FILE ??
  "scripts/prose-corpus/computed-anchor-ledger.json";
export const LEDGER_SCHEMA = 1;

export const BASELINE_FILE =
  process.env.PROSE_ANCHOR_BASELINE_FILE ??
  "scripts/prose-corpus/computed-anchor-baseline.json";
export const BASELINE_SCHEMA = 1;

export const LEDGER_NOTE =
  "Every computed-anchor ID ever issued, including retired ones. Append-only: an ID here is burned forever and is never re-issued to another site. Written together with computed-anchor-baseline.json by `npm run corpus:prose -- anchors`; never hand-edit or prune.";

export const BASELINE_NOTE =
  "Independent checkpoint of computed-anchor-ledger.json: its size, a digest of the exact issued list, and the highest index ever issued per symbol. Retained so that losing or truncating the ledger is detectable rather than silent, and so allocation never drops below a mark already issued. Written by `npm run corpus:prose -- anchors`; never hand-edit.";

/** Sorted, de-duplicated. Append-only across the sidecar's lifetime. */
export interface AnchorLedger {
  readonly schema: number;
  readonly note: string;
  readonly issued: readonly string[];
}

export interface AnchorBaseline {
  readonly schema: number;
  readonly note: string;
  /** How many ids the ledger held when this checkpoint was written. */
  readonly count: number;
  /** Digest of that exact sorted list. */
  readonly digest: string;
  /** Highest index ever issued per symbol. Allocation never goes below it. */
  readonly highWater: Readonly<Record<string, number>>;
}

/**
 * An anchor id: a symbol, a hyphen, and a zero-padded index.
 *
 * Validated rather than assumed. A ledger entry that is not an id is a
 * corrupted ledger, and reading one as though it were a reservation is how a
 * malformed file used to pass for history.
 */
const ANCHOR_ID = /^[A-Za-z_$][A-Za-z0-9_$]*-\d{4,}$/;

export function isAnchorId(value: unknown): value is string {
  return typeof value === "string" && ANCHOR_ID.test(value);
}

export function symbolOf(id: string): string {
  return id.slice(0, id.lastIndexOf("-"));
}

export function indexOfId(id: string): number {
  return Number.parseInt(id.slice(id.lastIndexOf("-") + 1), 10);
}

export function sortIssued(issued: Iterable<string>): string[] {
  return [...new Set(issued)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

/** Digest of an exact issued list. Order-independent: the list is sorted. */
export function issuedDigest(issued: Iterable<string>): string {
  return createHash("sha256")
    .update(sortIssued(issued).join(" "))
    .digest("hex")
    .slice(0, 16);
}

export function highWaterOf(issued: Iterable<string>): Record<string, number> {
  const marks: Record<string, number> = {};
  for (const id of issued) {
    const index = indexOfId(id);
    if (!Number.isFinite(index)) continue;
    const symbol = symbolOf(id);
    marks[symbol] = Math.max(marks[symbol] ?? 0, index);
  }
  return marks;
}

/* -------------------------------------------------------------------------- */
/* Loading, strictly                                                          */
/* -------------------------------------------------------------------------- */

export class AnchorHistoryError extends Error {}

function readJson(path: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (cause) {
    throw new AnchorHistoryError(
      `${path} exists but could not be read: ${String(cause)}`,
    );
  }
  if (raw.trim() === "") {
    throw new AnchorHistoryError(
      `${path} is empty. An empty history file is a lost file, not an empty history.`,
    );
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new AnchorHistoryError(
      `${path} is not valid JSON — it is truncated or corrupt: ${String(cause)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The ledger, or `null` when the file is genuinely absent.
 *
 * `null` is only ever legitimate before an explicit bootstrap. Anything
 * present but wrong throws here, at the loader boundary, before a caller can
 * mutate a sidecar on the strength of it. The old loader coerced a missing,
 * null or mistyped `issued` to an empty list and carried on; that coercion is
 * what let destroyed history pass for a fresh install.
 */
export function loadAnchorLedger(
  path: string = LEDGER_FILE,
): AnchorLedger | null {
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (!isRecord(parsed)) {
    throw new AnchorHistoryError(`${path} is not a JSON object.`);
  }
  if (parsed.schema !== LEDGER_SCHEMA) {
    throw new AnchorHistoryError(
      `${path} declares schema ${JSON.stringify(parsed.schema ?? null)}; this build understands ${LEDGER_SCHEMA}.`,
    );
  }
  if (typeof parsed.note !== "string") {
    throw new AnchorHistoryError(`${path} has no string \`note\`.`);
  }
  if (!Array.isArray(parsed.issued)) {
    throw new AnchorHistoryError(
      `${path} has no \`issued\` array (found ${JSON.stringify(parsed.issued ?? null)}). Established allocation history is required and is never defaulted to empty.`,
    );
  }
  const bad = parsed.issued.filter((entry) => !isAnchorId(entry));
  if (bad.length > 0) {
    throw new AnchorHistoryError(
      `${path} lists ${bad.length} entry/entries that are not anchor ids, e.g. ${JSON.stringify(bad[0] ?? null)}.`,
    );
  }
  const issued = parsed.issued as string[];
  // Declared duplicate policy: the ledger is always written sorted and
  // de-duplicated, so a repeated entry means the file was hand-edited or
  // hand-merged. That is a corrupt authoritative file, not a convenience to
  // absorb silently.
  if (new Set(issued).size !== issued.length) {
    const seen = new Set<string>();
    const repeated = issued.find((id) => seen.size === seen.add(id).size);
    throw new AnchorHistoryError(
      `${path} lists ${JSON.stringify(repeated ?? null)} more than once. This file is written de-duplicated; a repeat means it was hand-edited or hand-merged.`,
    );
  }
  return {
    schema: LEDGER_SCHEMA,
    note: parsed.note,
    issued: sortIssued(issued),
  };
}

export function loadAnchorBaseline(
  path: string = BASELINE_FILE,
): AnchorBaseline | null {
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (!isRecord(parsed)) {
    throw new AnchorHistoryError(`${path} is not a JSON object.`);
  }
  if (parsed.schema !== BASELINE_SCHEMA) {
    throw new AnchorHistoryError(
      `${path} declares schema ${JSON.stringify(parsed.schema ?? null)}; this build understands ${BASELINE_SCHEMA}.`,
    );
  }
  if (typeof parsed.note !== "string") {
    throw new AnchorHistoryError(`${path} has no string \`note\`.`);
  }
  if (
    typeof parsed.count !== "number" ||
    !Number.isInteger(parsed.count) ||
    parsed.count < 0
  ) {
    throw new AnchorHistoryError(
      `${path} has no non-negative integer \`count\` (found ${JSON.stringify(parsed.count ?? null)}).`,
    );
  }
  if (
    typeof parsed.digest !== "string" ||
    !/^[0-9a-f]{16}$/.test(parsed.digest)
  ) {
    throw new AnchorHistoryError(
      `${path} has no valid \`digest\` (found ${JSON.stringify(parsed.digest ?? null)}).`,
    );
  }
  if (!isRecord(parsed.highWater)) {
    throw new AnchorHistoryError(
      `${path} has no \`highWater\` object (found ${JSON.stringify(parsed.highWater ?? null)}).`,
    );
  }
  const highWater: Record<string, number> = {};
  for (const [symbol, mark] of Object.entries(parsed.highWater)) {
    if (typeof mark !== "number" || !Number.isInteger(mark) || mark < 0) {
      throw new AnchorHistoryError(
        `${path} records a non-integer high-water mark for ${symbol}: ${JSON.stringify(mark)}.`,
      );
    }
    highWater[symbol] = mark;
  }
  return {
    schema: BASELINE_SCHEMA,
    note: parsed.note,
    count: parsed.count,
    digest: parsed.digest,
    highWater,
  };
}

/* -------------------------------------------------------------------------- */
/* Writing, atomically                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Write the whole file, or leave the old one exactly as it was.
 *
 * `writeFileSync` truncates in place, so an interruption mid-write leaves a
 * half-written authoritative file — which the strict loader would then reject,
 * turning a crash into a wedged workspace. Writing a sibling temp file,
 * flushing it, and renaming over the target makes the replacement a single
 * filesystem step: a reader sees the old file or the new one, never half.
 */
export function atomicWriteFile(path: string, body: string): void {
  const temp = `${path}.tmp-${process.pid}`;
  try {
    const handle = openSync(temp, "w");
    try {
      writeSync(handle, body);
      fsyncSync(handle);
    } finally {
      closeSync(handle);
    }
    renameSync(temp, path);
  } catch (cause) {
    try {
      if (existsSync(temp)) unlinkSync(temp);
    } catch {
      // The temp file is debris, not state. Report the original failure.
    }
    throw cause;
  }
}

export function ledgerOf(issued: Iterable<string>): AnchorLedger {
  return {
    schema: LEDGER_SCHEMA,
    note: LEDGER_NOTE,
    issued: sortIssued(issued),
  };
}

export function baselineOf(issued: Iterable<string>): AnchorBaseline {
  const sorted = sortIssued(issued);
  return {
    schema: BASELINE_SCHEMA,
    note: BASELINE_NOTE,
    count: sorted.length,
    digest: issuedDigest(sorted),
    highWater: highWaterOf(sorted),
  };
}

export function writeAnchorLedger(
  ledger: AnchorLedger,
  path: string = LEDGER_FILE,
): void {
  const body = JSON.stringify(
    {
      schema: ledger.schema,
      note: ledger.note,
      issued: sortIssued(ledger.issued),
    },
    null,
    2,
  );
  atomicWriteFile(path, `${body}\n`);
}

export function writeAnchorBaseline(
  baseline: AnchorBaseline,
  path: string = BASELINE_FILE,
): void {
  const highWater: Record<string, number> = {};
  for (const symbol of Object.keys(baseline.highWater).sort()) {
    highWater[symbol] = baseline.highWater[symbol]!;
  }
  const body = JSON.stringify(
    {
      schema: baseline.schema,
      note: baseline.note,
      count: baseline.count,
      digest: baseline.digest,
      highWater,
    },
    null,
    2,
  );
  atomicWriteFile(path, `${body}\n`);
}

/* -------------------------------------------------------------------------- */
/* Integrity                                                                  */
/* -------------------------------------------------------------------------- */

export type HistoryProblemKind =
  | "no-history"
  | "lost-ledger"
  | "lost-baseline"
  | "history-mismatch"
  | "history-regressed"
  | "unreserved-live-id"
  | "duplicate-live-id";

export interface HistoryProblem {
  readonly kind: HistoryProblemKind;
  readonly detail: string;
}

export interface AllocationHistory {
  /** Every id ever issued, as far as the intact ledger records. */
  readonly issued: ReadonlySet<string>;
  /** Per-symbol floor. Allocation never returns an index at or below it. */
  readonly highWater: Readonly<Record<string, number>>;
}

/**
 * Everything wrong with the two history files and the live sidecar, together.
 *
 * Read-only by construction: it takes loaded values and returns findings. The
 * check path calls it and reports; the mint path calls it and refuses. Neither
 * repairs an authoritative file as a side effect of looking at it — a
 * validator that rewrites what it is validating cannot be trusted to have
 * found anything.
 */
export function verifyAllocationHistory(input: {
  readonly ledger: AnchorLedger | null;
  readonly baseline: AnchorBaseline | null;
  readonly liveIds: readonly string[];
  readonly ledgerPath?: string;
  readonly baselinePath?: string;
}): HistoryProblem[] {
  const ledgerPath = input.ledgerPath ?? LEDGER_FILE;
  const baselinePath = input.baselinePath ?? BASELINE_FILE;
  const problems: HistoryProblem[] = [];

  const duplicates = input.liveIds.filter(
    (id, index) => input.liveIds.indexOf(id) !== index,
  );
  for (const id of sortIssued(duplicates)) {
    problems.push({
      kind: "duplicate-live-id",
      detail: `${id} is bound to more than one live site. Two branches minted it independently, or a sidecar was union-merged by hand. Reconcile deliberately: one of these sites must be re-minted, and the review recorded against ${id} stays with whichever binding keeps it.`,
    });
  }

  if (input.ledger === null && input.baseline === null) {
    problems.push({
      kind: "no-history",
      detail: `Neither ${ledgerPath} nor ${baselinePath} exists. If this project has never allocated an anchor, seed it explicitly with \`npm run corpus:prose -- bootstrap\`. If it has, this is lost history: restore both files from version control.`,
    });
    return problems;
  }
  if (input.ledger === null) {
    problems.push({
      kind: "lost-ledger",
      detail: `${baselinePath} records ${input.baseline?.count ?? 0} ids ever issued, but ${ledgerPath} is missing. Established history cannot be re-seeded from the live sidecar — the retired ids are exactly the ones the sidecar does not contain. Restore the ledger from version control, or rebuild it with \`npm run corpus:prose -- recover\`.`,
    });
    return problems;
  }
  if (input.baseline === null) {
    problems.push({
      kind: "lost-baseline",
      detail: `${ledgerPath} exists but its checkpoint ${baselinePath} is missing, so the ledger has no independent evidence behind it and a truncation could not be detected. Restore it from version control, or re-derive it with \`npm run corpus:prose -- recover\`.`,
    });
    return problems;
  }

  const issued = input.ledger.issued;
  const digest = issuedDigest(issued);
  if (
    issued.length !== input.baseline.count ||
    digest !== input.baseline.digest
  ) {
    problems.push({
      kind: "history-mismatch",
      detail: `${ledgerPath} holds ${issued.length} ids digesting to ${digest}, but ${baselinePath} attests ${input.baseline.count} ids digesting to ${input.baseline.digest}. The ledger has been truncated, replaced, or written without its checkpoint. Allocation stops here rather than declaring a new lineage.`,
    });
  }

  const derived = highWaterOf(issued);
  for (const [symbol, mark] of Object.entries(input.baseline.highWater)) {
    const now = derived[symbol] ?? 0;
    if (now < mark) {
      problems.push({
        kind: "history-regressed",
        detail: `${symbol} reached ${symbol}-${String(mark).padStart(4, "0")} in ${baselinePath}, but ${ledgerPath} now goes no higher than ${now}. Ids at or below the recorded mark were issued and can never be offered again.`,
      });
    }
  }

  const known = new Set(issued);
  for (const id of sortIssued(input.liveIds)) {
    if (!known.has(id)) {
      problems.push({
        kind: "unreserved-live-id",
        detail: `${id} is bound to a live site but is absent from ${ledgerPath}. A merge brought in anchors the ledger never saw. Absorb them explicitly with \`npm run corpus:prose -- ledger\` — a mint will not seed history from the live sidecar on its own.`,
      });
    }
  }

  return problems;
}

/**
 * The reservation set and floor a mint allocates against.
 *
 * Only ever built from verified history. The union with the live sidecar is
 * belt-and-braces, not a seed: `verifyAllocationHistory` has already refused
 * any live id the ledger does not know about, so by this point the union adds
 * nothing. Seeding history from live ids is precisely the behaviour that made
 * a destroyed ledger look survivable.
 */
export function allocationHistory(
  ledger: AnchorLedger,
  baseline: AnchorBaseline,
  liveIds: readonly string[] = [],
): AllocationHistory {
  const issued = new Set(ledger.issued);
  for (const id of liveIds) issued.add(id);
  const derived = highWaterOf(issued);
  const highWater: Record<string, number> = { ...derived };
  for (const [symbol, mark] of Object.entries(baseline.highWater)) {
    highWater[symbol] = Math.max(highWater[symbol] ?? 0, mark);
  }
  return { issued, highWater };
}

export function describeHistoryProblems(
  problems: readonly HistoryProblem[],
): string {
  return problems
    .map((problem) => `  [${problem.kind}] ${problem.detail}`)
    .join("\n");
}
