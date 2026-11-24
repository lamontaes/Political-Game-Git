import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
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
 * A count, a digest and a per-symbol maximum were then reproduced insufficient
 * in their turn, twice over, and the current shape answers both findings:
 *
 *   3. EXACT MEMBERSHIP. The checkpoint records the precise indexes issued per
 *      symbol, not only the highest. A ledger that dropped a retired id while
 *      adding three later ones grew on the total AND on every maximum at once,
 *      so recovery read a membership loss as ordinary growth and blessed it.
 *      Only per-id membership can see that; a maximum and a total cannot.
 *   4. PER-ID BINDING PROVENANCE. Each issued id records the site it was issued
 *      for. An id-only ledger says THAT a number was issued and not for WHAT,
 *      so two branches that independently issued one id to two different sites
 *      wrote byte-identical additions, real three-way machinery merged all
 *      three files with no conflict, and the composed tree passed every gate
 *      with one historical binding simply gone. Retirement removes a live
 *      binding; it never erases the issuance provenance behind it.
 *
 * STATED THREAT BOUNDARY. This detects the loss, truncation, corruption,
 * lagging or RE-BINDING of either file, and it makes an automatic composition of
 * two conflicting issuance histories impossible: the records collide as a Git
 * conflict, and a resolution that keeps both claims is refused rather than
 * silently reduced to one.
 *
 * What it does not defend against, stated plainly:
 *
 *   - the simultaneous replacement of BOTH files with a mutually consistent
 *     forgery. Anyone able to rewrite the ledger and the checkpoint together can
 *     declare any history they like. What is offered is that such a change is a
 *     visible, reviewable edit to two committed files, never a silent
 *     consequence of a routine command.
 *   - within that boundary, one narrower case: a hand resolution of a conflicted
 *     merge that keeps one branch's history PAIR and the other branch's sidecar,
 *     where both sites share a (path, symbol, occurrence) coordinate and differ
 *     only in their prose. The site coordinate deliberately excludes the text so
 *     that an accepted rewording keeps its identity, and with no record of
 *     whether a rewording happened, that case and a legitimate reword are
 *     indistinguishable from the sidecar alone. Separating them needs a rewording
 *     record in the accepted sidecar schema, which this repair does not open.
 *     Automatic composition of that state still conflicts and still cannot
 *     become a valid tree without a deliberate two-file edit.
 *
 * Nothing here reads git, the network, or anything outside these two files.
 * No part of the game runtime and no save depends on this module.
 */

export class AnchorHistoryError extends Error {}

/* -------------------------------------------------------------------------- */
/* Coupled authoritative paths                                                */
/* -------------------------------------------------------------------------- */

/**
 * The three files that make up one authoritative state, and where they live.
 *
 * Sidecar, ledger and checkpoint are not three independent settings. They are
 * one coupled set: the sidecar says which ids are alive, the ledger says which
 * were ever issued, and the checkpoint attests the ledger. Reading one from a
 * scratch directory and another from the repository produces a hybrid that is
 * nobody's real state, and it was reproduced doing real damage — overriding
 * only the sidecar made a disposable probe absorb a scratch id into the
 * CANONICAL ledger and checkpoint, and overriding only the history files made
 * the real sidecar's ids flow into scratch history.
 *
 * So the override is ALL-OR-NONE. Either none of the three variables is set
 * and every path is the repository's own, or all three are set and every path
 * is the caller's. Anything in between fails here, before a single read or
 * write, rather than silently falling back to canonical data for whichever
 * path was left out.
 *
 * The override exists for one reason: the regressions that matter are about
 * what the PRODUCTION CLI does to real files on disk, and they cannot be
 * written at all if the only reachable paths are the repository's own. It
 * relocates files and grants no exemption — every load runs the same schema
 * and integrity checks, and the CLI prints the coupled set whenever it is
 * active, so a scratch run can never be mistaken for a real one.
 */
export const DEFAULT_ANCHOR_PATHS = {
  anchors: "scripts/prose-corpus/computed-anchors.json",
  ledger: "scripts/prose-corpus/computed-anchor-ledger.json",
  baseline: "scripts/prose-corpus/computed-anchor-baseline.json",
} as const;

const OVERRIDE_VARS = {
  anchors: "PROSE_ANCHOR_FILE",
  ledger: "PROSE_ANCHOR_LEDGER_FILE",
  baseline: "PROSE_ANCHOR_BASELINE_FILE",
} as const;

export interface AnchorPaths {
  readonly anchors: string;
  readonly ledger: string;
  readonly baseline: string;
  /** True when the caller supplied the whole set. */
  readonly overridden: boolean;
}

/**
 * The path a filesystem would actually reach, not the one it was spelled as.
 *
 * `resolve` is lexical: it normalises `..` and makes a path absolute and does
 * not follow a single link. That was reproduced defeating the whole isolation
 * guarantee — a symlink in a scratch directory pointing at the repository's own
 * ledger, and a scratch path whose PARENT directory was a link to
 * `scripts/prose-corpus`, both passed the "aimed back at a repository file"
 * guard and then read canonical authority while the CLI printed that the run
 * "does not read the repository's own files".
 *
 * So every coupled path is canonicalised before any decision is made about it.
 * A target that does not exist yet is legitimate — a scratch bundle is written
 * where nothing was — so the directory is canonicalised and the file name
 * joined onto it, which is what the write will actually resolve through.
 */
function canonicalPath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    // The file is absent. Its containing directory decides where a write lands.
    try {
      return join(realpathSync(dirname(absolute)), basename(absolute));
    } catch {
      // Neither exists; nothing can be aliased through a directory that is not
      // there, so the lexical form is already the whole truth.
      return absolute;
    }
  }
}

export function resolveAnchorPaths(
  env: Record<string, string | undefined> = process.env,
): AnchorPaths {
  const roles = ["anchors", "ledger", "baseline"] as const;
  const supplied = roles.filter(
    (role) => (env[OVERRIDE_VARS[role]] ?? "").trim() !== "",
  );
  if (supplied.length === 0) {
    return { ...DEFAULT_ANCHOR_PATHS, overridden: false };
  }
  if (supplied.length !== roles.length) {
    const missing = roles.filter((role) => !supplied.includes(role));
    throw new AnchorHistoryError(
      `Partial anchor path override. ${supplied
        .map((role) => OVERRIDE_VARS[role])
        .join(", ")} is set but ${missing
        .map((role) => OVERRIDE_VARS[role])
        .join(
          ", ",
        )} is not.\n  The sidecar, ledger and checkpoint are one coupled authoritative set. Overriding some of them would read or write the repository's real files alongside scratch ones, which is how a disposable probe was reproduced writing a scratch id into the canonical ledger.\n  Set all three, or none. Nothing was read or written.`,
    );
  }
  const resolved = {
    anchors: (env[OVERRIDE_VARS.anchors] ?? "").trim(),
    ledger: (env[OVERRIDE_VARS.ledger] ?? "").trim(),
    baseline: (env[OVERRIDE_VARS.baseline] ?? "").trim(),
  };
  // An "override" aimed back at a repository file is the accident this guard
  // exists for: the caller believes they are on scratch data and are not.
  // Compared after canonicalisation, so a symlink or a linked parent directory
  // is caught rather than waved through by a lexically different spelling.
  const canonical = {
    anchors: canonicalPath(resolved.anchors),
    ledger: canonicalPath(resolved.ledger),
    baseline: canonicalPath(resolved.baseline),
  };
  for (const role of roles) {
    for (const defaultRole of roles) {
      if (
        canonical[role] === canonicalPath(DEFAULT_ANCHOR_PATHS[defaultRole])
      ) {
        const aliased = canonical[role] !== resolve(resolved[role]);
        throw new AnchorHistoryError(
          `${OVERRIDE_VARS[role]} resolves to the repository's own ${DEFAULT_ANCHOR_PATHS[defaultRole]}${
            aliased
              ? ` through a symlink or aliased directory (${resolved[role]} -> ${canonical[role]})`
              : ""
          }. An override is for disposable copies; reaching canonical data through one defeats it, and a lexical alias defeats it while the run reports that it is not reading the repository's files. Nothing was read or written.`,
        );
      }
    }
  }
  if (new Set(roles.map((role) => canonical[role])).size !== roles.length) {
    throw new AnchorHistoryError(
      `The three anchor path overrides must name three distinct files; two of them resolve to the same file (compared after following symlinks). Nothing was read or written.`,
    );
  }
  return { ...resolved, overridden: true };
}

export const ANCHOR_PATHS = resolveAnchorPaths();

export const LEDGER_FILE = ANCHOR_PATHS.ledger;
export const LEDGER_SCHEMA = 2;

export const BASELINE_FILE = ANCHOR_PATHS.baseline;
export const BASELINE_SCHEMA = 2;

/** The id-only shapes this build reads solely in order to migrate them. */
export const LEDGER_SCHEMA_V1 = 1;
export const BASELINE_SCHEMA_V1 = 1;

export const LEDGER_NOTE =
  "Every computed-anchor ID ever issued, including retired ones, each with the binding provenance history first recorded for it. Append-only and immutable: an ID here is burned forever, is never re-issued, and its recorded binding is never rewritten. Retirement removes a LIVE binding and never erases the issuance recorded here. Written together with computed-anchor-baseline.json by `npm run corpus:prose -- anchors`; never hand-edit or prune.";

export const BASELINE_NOTE =
  "Independent checkpoint of computed-anchor-ledger.json: its size, a digest of the exact issued list including binding provenance, the highest index ever issued per symbol, and the exact set of indexes issued per symbol. Retained so that losing, truncating or re-binding the ledger is detectable rather than silent, and so allocation never drops below a mark already issued. Written by `npm run corpus:prose -- anchors`; never hand-edit.";

/**
 * One issued id, and the binding history first recorded for it.
 *
 * An issued anchor is not merely a number. 128A3 composed two ordinary stale
 * branches that had independently issued `RETURN_SUMMARY-0023` to two different
 * sites — one of which had since retired it — and real three-way machinery
 * merged sidecar, ledger and checkpoint with no conflict at all, because an
 * id-only ledger records THAT an id was issued and not WHICH site holds it.
 * Both files agreed afterwards, the production gate passed, and one historical
 * binding identity was simply gone.
 *
 * So each id carries the binding recorded when it first entered history:
 *
 *   `site` — a digest of the site COORDINATE (source path, symbol, occurrence).
 *     Invariant for the life of a binding: rewording keeps the coordinate, and
 *     a site that moves file or symbol is retired and re-minted rather than
 *     carried across. This is what a live binding is checked against.
 *   `text` — a digest of the literal as first recorded. Two branches adding
 *     DIFFERENT prose at the same coordinate produce the same `site` and
 *     different `text`, so this is the half that separates them.
 *
 * Either may be genuinely unrecoverable, and then it is named in `unknown`
 * rather than defaulted, zeroed or guessed. That is the honest state for ids
 * inherited from the id-only schema, and for ids a conservative recovery
 * reconstructs from a checkpoint that never held a binding. An unknown is a
 * recorded absence of evidence; it is never evidence of absence, and a LIVE
 * binding is never allowed to rest on one.
 */
export interface AnchorIssuance {
  readonly id: string;
  /** Digest of (source path, symbol, occurrence), or null when unrecoverable. */
  readonly site: string | null;
  /** Digest of the literal first recorded, or null when unrecoverable. */
  readonly text: string | null;
}

export type IssuanceProvenancePart = "site" | "text";

/** Sorted, de-duplicated. Append-only and immutable across the whole lineage. */
export interface AnchorLedger {
  readonly schema: number;
  readonly note: string;
  /** Every id ever issued, with its recorded binding. Sorted by id. */
  readonly issuances: readonly AnchorIssuance[];
  /** The same ids alone, sorted. A view over `issuances`, never a substitute. */
  readonly issued: readonly string[];
}

export interface AnchorBaseline {
  readonly schema: number;
  readonly note: string;
  /** How many ids the ledger held when this checkpoint was written. */
  readonly count: number;
  /** Digest of that exact sorted list, binding provenance included. */
  readonly digest: string;
  /** Highest index ever issued per symbol. Allocation never goes below it. */
  readonly highWater: Readonly<Record<string, number>>;
  /**
   * The exact indexes issued per symbol, as compact ascending ranges.
   *
   * The count-and-high-water pair is necessary and was reproduced insufficient:
   * a ledger that DROPPED retired `RETURN_SUMMARY-0023` while adding `-0031`,
   * `-0032` and `-0033` grew on both measures at once, so recovery read a
   * membership loss as ordinary growth and blessed it, printing "every id the
   * old checkpoint attested is still issued" while that id was gone.
   *
   * Ranges make membership itself independently checkable per id, which is what
   * a maximum and a total can never do.
   */
  readonly issuedIndexes: Readonly<Record<string, string>>;
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

/* -------------------------------------------------------------------------- */
/* Issuance provenance                                                        */
/* -------------------------------------------------------------------------- */

const PROVENANCE_DIGEST = /^[0-9a-f]{12}$/;

/**
 * The site coordinate digest: what an id was issued FOR, not what it says.
 *
 * Deliberately excludes the text. Rewording is an accepted operation that keeps
 * an anchor's identity, so a coordinate that changed when the words changed
 * could not be checked against a live binding at all.
 */
export function siteDigest(
  sourcePath: string,
  symbol: string,
  occurrence: number,
): string {
  return createHash("sha256")
    .update(`${sourcePath} ${symbol} ${occurrence}`)
    .digest("hex")
    .slice(0, 12);
}

export function issuanceOf(
  id: string,
  site: string,
  text: string,
): AnchorIssuance {
  return { id, site, text };
}

/**
 * An id whose binding provenance no retained evidence covers.
 *
 * Named, not implied. Every caller that produces one is stating that it looked
 * and there was nothing there — inherited id-only history, or a conservative
 * rebuild from a checkpoint that never carried a binding. Nothing is guessed
 * into the gap.
 */
export function unrecoverableIssuance(
  id: string,
  known: Partial<Record<IssuanceProvenancePart, string>> = {},
): AnchorIssuance {
  return { id, site: known.site ?? null, text: known.text ?? null };
}

export function unknownPartsOf(
  issuance: AnchorIssuance,
): IssuanceProvenancePart[] {
  const unknown: IssuanceProvenancePart[] = [];
  if (issuance.site === null) unknown.push("site");
  if (issuance.text === null) unknown.push("text");
  return unknown;
}

export function sortIssuances(
  issuances: Iterable<AnchorIssuance>,
): AnchorIssuance[] {
  const byId = new Map<string, AnchorIssuance>();
  for (const issuance of issuances) {
    const seen = byId.get(issuance.id);
    if (seen && (seen.site !== issuance.site || seen.text !== issuance.text)) {
      throw new AnchorHistoryError(
        `${issuance.id} is offered twice with different binding provenance (${describeIssuance(seen)} and ${describeIssuance(issuance)}). Two branches issued one id to two different sites; that collision is reconciled deliberately, never by whichever record is written last.`,
      );
    }
    if (!seen) byId.set(issuance.id, issuance);
  }
  return [...byId.values()].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}

export function describeIssuance(issuance: AnchorIssuance): string {
  const unknown = unknownPartsOf(issuance);
  const parts = [
    `site ${issuance.site ?? "unrecoverable"}`,
    `text ${issuance.text ?? "unrecoverable"}`,
  ];
  return unknown.length === 2 ? "no retained binding" : parts.join(", ");
}

/** True when both records say exactly the same thing about the same id. */
export function sameIssuance(
  left: AnchorIssuance,
  right: AnchorIssuance,
): boolean {
  return (
    left.id === right.id && left.site === right.site && left.text === right.text
  );
}

/**
 * Digest of an exact issued list, binding provenance included.
 *
 * Order-independent: the list is sorted first. Covering the bindings and not
 * only the ids is what makes a re-binding of an already-issued number show up
 * as a checkpoint disagreement instead of passing unnoticed.
 */
export function issuedDigest(issuances: Iterable<AnchorIssuance>): string {
  return createHash("sha256")
    .update(
      sortIssuances(issuances)
        .map(
          (issuance) =>
            `${issuance.id} ${issuance.site ?? "?"} ${issuance.text ?? "?"}`,
        )
        .join(""),
    )
    .digest("hex")
    .slice(0, 16);
}

/** Digest of an id-only list. Retained only to validate inherited v1 files. */
export function issuedDigestV1(issued: Iterable<string>): string {
  return createHash("sha256")
    .update(sortIssued(issued).join(" "))
    .digest("hex")
    .slice(0, 16);
}

/* -------------------------------------------------------------------------- */
/* Exact issued membership, compactly                                         */
/* -------------------------------------------------------------------------- */

/** Ascending indexes as `1-22,25,30-31`. Deterministic and reviewable. */
export function formatIndexRanges(indexes: Iterable<number>): string {
  const sorted = [...new Set(indexes)].sort((left, right) => left - right);
  const ranges: string[] = [];
  let start: number | null = null;
  let end: number | null = null;
  for (const index of sorted) {
    if (start === null || end === null) {
      start = index;
      end = index;
      continue;
    }
    if (index === end + 1) {
      end = index;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    start = index;
    end = index;
  }
  if (start !== null && end !== null) {
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }
  return ranges.join(",");
}

export function parseIndexRanges(spec: string): number[] {
  if (spec.trim() === "") return [];
  const indexes: number[] = [];
  for (const part of spec.split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!match) {
      throw new AnchorHistoryError(
        `${JSON.stringify(spec)} is not a list of ascending index ranges (expected e.g. "1-22,25").`,
      );
    }
    const from = Number.parseInt(match[1]!, 10);
    const to = match[2] === undefined ? from : Number.parseInt(match[2], 10);
    if (to < from) {
      throw new AnchorHistoryError(
        `${JSON.stringify(part)} runs backwards; index ranges are ascending.`,
      );
    }
    for (let index = from; index <= to; index += 1) indexes.push(index);
  }
  return indexes;
}

/** The exact indexes issued per symbol, as ranges. */
export function issuedIndexesOf(
  issued: Iterable<string>,
): Record<string, string> {
  const bySymbol = new Map<string, number[]>();
  for (const id of issued) {
    const index = indexOfId(id);
    if (!Number.isFinite(index)) continue;
    const symbol = symbolOf(id);
    const list = bySymbol.get(symbol) ?? [];
    list.push(index);
    bySymbol.set(symbol, list);
  }
  const ranges: Record<string, string> = {};
  for (const symbol of [...bySymbol.keys()].sort()) {
    ranges[symbol] = formatIndexRanges(bySymbol.get(symbol)!);
  }
  return ranges;
}

/** Every id a checkpoint's index ranges attest were issued. */
export function attestedIds(baseline: AnchorBaseline): string[] {
  const ids: string[] = [];
  for (const [symbol, spec] of Object.entries(baseline.issuedIndexes)) {
    for (const index of parseIndexRanges(spec)) {
      ids.push(`${symbol}-${String(index).padStart(4, "0")}`);
    }
  }
  return sortIssued(ids);
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
  if (parsed.schema === LEDGER_SCHEMA_V1) {
    throw new AnchorHistoryError(
      `${path} declares schema ${LEDGER_SCHEMA_V1}, which records only WHICH ids were issued and not which site each was issued for. That is insufficient: two branches that independently issue one id to two different sites compose with no conflict under it, and one binding identity is lost silently.\n  Migrate it once, deliberately: \`npm run corpus:prose -- migrate\`. The migration is one-way, deterministic, and refuses any v1 pair that does not already agree with itself. Nothing was read or written.`,
    );
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

  const issuances: AnchorIssuance[] = [];
  for (const entry of parsed.issued) {
    issuances.push(readIssuance(entry, path));
  }

  // Declared duplicate policy: the ledger is always written sorted and
  // de-duplicated, so a repeated id means the file was hand-edited or
  // hand-merged. That is a corrupt authoritative file, not a convenience to
  // absorb silently — and when the two records disagree about the binding it is
  // precisely the cross-branch collision, reported as such.
  const byId = new Map<string, AnchorIssuance>();
  for (const issuance of issuances) {
    const seen = byId.get(issuance.id);
    if (seen && !sameIssuance(seen, issuance)) {
      throw new AnchorHistoryError(
        `${path} records ${JSON.stringify(issuance.id)} twice with DIFFERENT bindings (${describeIssuance(seen)}; ${describeIssuance(issuance)}). This is one id issued for two different sites — two branches allocated the same number independently and the collision was carried into one file rather than resolved.\n  Both claims are preserved here on purpose so that this refusal is possible. Reconcile deliberately: one of the two sites must be re-minted, and the owner review recorded against ${issuance.id} stays with whichever binding keeps it.`,
      );
    }
    if (seen) {
      throw new AnchorHistoryError(
        `${path} lists ${JSON.stringify(issuance.id)} more than once. This file is written de-duplicated; a repeat means it was hand-edited or hand-merged.`,
      );
    }
    byId.set(issuance.id, issuance);
  }

  const sorted = sortIssuances(issuances);
  return {
    schema: LEDGER_SCHEMA,
    note: parsed.note,
    issuances: sorted,
    issued: sorted.map((issuance) => issuance.id),
  };
}

/**
 * One ledger record, with every part of its provenance accounted for.
 *
 * Nothing is defaulted. A record must either carry a digest for a part or name
 * that part in `unknown`; a record that simply omits it is rejected, because
 * "the field was missing so treat it as empty" is the precise shape of the
 * defect this lineage started from.
 */
function readIssuance(entry: unknown, path: string): AnchorIssuance {
  if (!isRecord(entry)) {
    throw new AnchorHistoryError(
      `${path} lists ${JSON.stringify(entry ?? null)} where an issuance record was expected. Schema ${LEDGER_SCHEMA} records an object per issued id, not a bare id.`,
    );
  }
  if (!isAnchorId(entry.id)) {
    throw new AnchorHistoryError(
      `${path} lists an issuance whose \`id\` is not an anchor id: ${JSON.stringify(entry.id ?? null)}.`,
    );
  }
  const id = entry.id;
  const unknown = entry.unknown ?? [];
  if (
    !Array.isArray(unknown) ||
    unknown.some((part) => part !== "site" && part !== "text")
  ) {
    throw new AnchorHistoryError(
      `${path}: ${id} has an \`unknown\` that is not a list of "site" and/or "text" (found ${JSON.stringify(entry.unknown ?? null)}).`,
    );
  }
  const declaredUnknown = new Set(unknown as IssuanceProvenancePart[]);

  const read = (part: IssuanceProvenancePart): string | null => {
    const value = entry[part];
    if (declaredUnknown.has(part)) {
      if (value !== undefined) {
        throw new AnchorHistoryError(
          `${path}: ${id} declares its ${part} unrecoverable and also records one (${JSON.stringify(value)}). A record states what is retained or that nothing is; it may not do both.`,
        );
      }
      return null;
    }
    if (typeof value !== "string" || !PROVENANCE_DIGEST.test(value)) {
      throw new AnchorHistoryError(
        `${path}: ${id} has no valid \`${part}\` provenance digest (found ${JSON.stringify(value ?? null)}). Record the digest, or name ${JSON.stringify(part)} in \`unknown\` to state that no evidence was retained. It is never defaulted.`,
      );
    }
    return value;
  };

  return { id, site: read("site"), text: read("text") };
}

/** An inherited id-only ledger, read for migration only. */
export function loadAnchorLedgerV1(
  path: string = LEDGER_FILE,
): { readonly note: string; readonly issued: readonly string[] } | null {
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (!isRecord(parsed)) {
    throw new AnchorHistoryError(`${path} is not a JSON object.`);
  }
  if (parsed.schema !== LEDGER_SCHEMA_V1) {
    throw new AnchorHistoryError(
      `${path} declares schema ${JSON.stringify(parsed.schema ?? null)}, not the id-only schema ${LEDGER_SCHEMA_V1} this migration reads.`,
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
  if (new Set(issued).size !== issued.length) {
    const seen = new Set<string>();
    const repeated = issued.find((id) => seen.size === seen.add(id).size);
    throw new AnchorHistoryError(
      `${path} lists ${JSON.stringify(repeated ?? null)} more than once. This file is written de-duplicated; a repeat means it was hand-edited or hand-merged.`,
    );
  }
  return { note: parsed.note, issued: sortIssued(issued) };
}

export function loadAnchorBaseline(
  path: string = BASELINE_FILE,
): AnchorBaseline | null {
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (!isRecord(parsed)) {
    throw new AnchorHistoryError(`${path} is not a JSON object.`);
  }
  if (parsed.schema === BASELINE_SCHEMA_V1) {
    throw new AnchorHistoryError(
      `${path} declares schema ${BASELINE_SCHEMA_V1}, which attests a count, a digest and a per-symbol maximum. Those were reproduced insufficient: a ledger that dropped a retired id while adding later ones grew on every one of those measures at once, and recovery blessed the loss as growth.\n  Migrate once, deliberately: \`npm run corpus:prose -- migrate\`. Nothing was read or written.`,
    );
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

  if (!isRecord(parsed.issuedIndexes)) {
    throw new AnchorHistoryError(
      `${path} has no \`issuedIndexes\` object (found ${JSON.stringify(parsed.issuedIndexes ?? null)}). Exact issued membership is what makes a dropped id detectable when a count and a maximum both still grow; it is required and never defaulted.`,
    );
  }
  const issuedIndexes: Record<string, string> = {};
  for (const symbol of Object.keys(parsed.issuedIndexes).sort()) {
    const spec = parsed.issuedIndexes[symbol];
    if (typeof spec !== "string") {
      throw new AnchorHistoryError(
        `${path} records non-string issued indexes for ${symbol}: ${JSON.stringify(spec)}.`,
      );
    }
    // Throws on a malformed or descending range.
    const indexes = parseIndexRanges(spec);
    if (formatIndexRanges(indexes) !== spec.trim()) {
      throw new AnchorHistoryError(
        `${path} records the issued indexes for ${symbol} as ${JSON.stringify(spec)}, which is not their canonical form ${JSON.stringify(formatIndexRanges(indexes))}. This file is written canonically; a difference means it was hand-edited.`,
      );
    }
    const mark = highWater[symbol];
    const highest = indexes.length === 0 ? 0 : Math.max(...indexes);
    if (mark === undefined || highest !== mark) {
      throw new AnchorHistoryError(
        `${path} attests issued indexes for ${symbol} reaching ${highest} but a high-water mark of ${JSON.stringify(mark ?? null)}. The two halves of one checkpoint must agree.`,
      );
    }
    issuedIndexes[symbol] = spec.trim();
  }
  for (const symbol of Object.keys(highWater)) {
    if (!(symbol in issuedIndexes)) {
      throw new AnchorHistoryError(
        `${path} records a high-water mark for ${symbol} but no issued indexes for it. The two halves of one checkpoint must agree.`,
      );
    }
  }

  return {
    schema: BASELINE_SCHEMA,
    note: parsed.note,
    count: parsed.count,
    digest: parsed.digest,
    highWater,
    issuedIndexes,
  };
}

/** An inherited checkpoint without exact membership, read for migration only. */
export function loadAnchorBaselineV1(path: string = BASELINE_FILE): {
  readonly note: string;
  readonly count: number;
  readonly digest: string;
  readonly highWater: Readonly<Record<string, number>>;
} | null {
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (!isRecord(parsed)) {
    throw new AnchorHistoryError(`${path} is not a JSON object.`);
  }
  if (parsed.schema !== BASELINE_SCHEMA_V1) {
    throw new AnchorHistoryError(
      `${path} declares schema ${JSON.stringify(parsed.schema ?? null)}, not the schema ${BASELINE_SCHEMA_V1} this migration reads.`,
    );
  }
  if (
    typeof parsed.note !== "string" ||
    typeof parsed.count !== "number" ||
    !Number.isInteger(parsed.count) ||
    parsed.count < 0 ||
    typeof parsed.digest !== "string" ||
    !/^[0-9a-f]{16}$/.test(parsed.digest) ||
    !isRecord(parsed.highWater)
  ) {
    throw new AnchorHistoryError(
      `${path} is not a well-formed schema ${BASELINE_SCHEMA_V1} checkpoint, so it cannot be migrated. Restore it from version control.`,
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

export function ledgerOf(issuances: Iterable<AnchorIssuance>): AnchorLedger {
  const sorted = sortIssuances(issuances);
  return {
    schema: LEDGER_SCHEMA,
    note: LEDGER_NOTE,
    issuances: sorted,
    issued: sorted.map((issuance) => issuance.id),
  };
}

export function baselineOf(
  issuances: Iterable<AnchorIssuance>,
): AnchorBaseline {
  const sorted = sortIssuances(issuances);
  const ids = sorted.map((issuance) => issuance.id);
  return {
    schema: BASELINE_SCHEMA,
    note: BASELINE_NOTE,
    count: sorted.length,
    digest: issuedDigest(sorted),
    highWater: highWaterOf(ids),
    issuedIndexes: issuedIndexesOf(ids),
  };
}

/**
 * The ledger, one issuance to a line.
 *
 * Not cosmetic. The cross-branch blocker was that two branches issuing one id
 * to two different sites produced BYTE-IDENTICAL ledger additions, so real
 * three-way machinery merged them with no conflict and one binding was lost. A
 * record on its own line means two branches writing the same id write differing
 * text at the same position, which Git reports as a conflict instead of quietly
 * choosing one. The refusal in the loader and the conflict here are two
 * independent guards on the same failure; neither is trusted alone.
 */
export function writeAnchorLedger(
  ledger: AnchorLedger,
  path: string = LEDGER_FILE,
): void {
  const records = sortIssuances(ledger.issuances).map((issuance) => {
    const fields = [`"id": ${JSON.stringify(issuance.id)}`];
    if (issuance.site !== null) fields.push(`"site": "${issuance.site}"`);
    if (issuance.text !== null) fields.push(`"text": "${issuance.text}"`);
    const unknown = unknownPartsOf(issuance);
    if (unknown.length > 0) {
      fields.push(
        `"unknown": [${unknown.map((part) => `"${part}"`).join(", ")}]`,
      );
    }
    return `    { ${fields.join(", ")} }`;
  });
  const body = [
    "{",
    `  "schema": ${ledger.schema},`,
    `  "note": ${JSON.stringify(ledger.note)},`,
    records.length === 0 ? '  "issued": []' : '  "issued": [',
    ...(records.length === 0 ? [] : [records.join(",\n"), "  ]"]),
    "}",
  ].join("\n");
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
  const issuedIndexes: Record<string, string> = {};
  for (const symbol of Object.keys(baseline.issuedIndexes).sort()) {
    issuedIndexes[symbol] = baseline.issuedIndexes[symbol]!;
  }
  const body = JSON.stringify(
    {
      schema: baseline.schema,
      note: baseline.note,
      count: baseline.count,
      digest: baseline.digest,
      highWater,
      issuedIndexes,
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
  | "duplicate-live-id"
  | "binding-mismatch"
  | "unattested-live-binding";

export interface HistoryProblem {
  readonly kind: HistoryProblemKind;
  readonly detail: string;
}

/** A live sidecar binding, reduced to what history can be checked against. */
export interface LiveBinding {
  readonly id: string;
  /** Digest of this binding's site coordinate. */
  readonly site: string;
  /** Where it is, in words, for a diagnostic a person can act on. */
  readonly where: string;
}

export interface AllocationHistory {
  /** Every id ever issued, as far as the intact ledger records. */
  readonly issued: ReadonlySet<string>;
  /** Per-symbol floor. Allocation never returns an index at or below it. */
  readonly highWater: Readonly<Record<string, number>>;
  /** The recorded issuance for every id, carried forward untouched. */
  readonly issuances: ReadonlyMap<string, AnchorIssuance>;
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
  readonly live: readonly LiveBinding[];
  readonly ledgerPath?: string;
  readonly baselinePath?: string;
}): HistoryProblem[] {
  const ledgerPath = input.ledgerPath ?? LEDGER_FILE;
  const baselinePath = input.baselinePath ?? BASELINE_FILE;
  const problems: HistoryProblem[] = [];
  const liveIds = input.live.map((binding) => binding.id);

  const duplicates = liveIds.filter(
    (id, index) => liveIds.indexOf(id) !== index,
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
  // The digest covers the recorded bindings as well as the ids, so re-pointing
  // an already-issued number at another site disagrees with the checkpoint
  // instead of passing as the same history.
  const digest = issuedDigest(input.ledger.issuances);
  if (
    issued.length !== input.baseline.count ||
    digest !== input.baseline.digest
  ) {
    problems.push({
      kind: "history-mismatch",
      detail: `${ledgerPath} holds ${issued.length} issuances digesting to ${digest}, but ${baselinePath} attests ${input.baseline.count} digesting to ${input.baseline.digest}. The ledger has been truncated, replaced, re-bound, or written without its checkpoint. Allocation stops here rather than declaring a new lineage.`,
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

  // Exact membership, per id. A maximum and a total both grew in the reproduced
  // blocker while an issued id in the middle had been dropped; only this can
  // see that, and it is checked independently of the digest so a hand-written
  // digest cannot cover it up.
  const missing = attestedIds(input.baseline).filter((id) => !known.has(id));
  if (missing.length > 0) {
    problems.push({
      kind: "history-regressed",
      detail: `${baselinePath} attests ${missing.length} id(s) that ${ledgerPath} no longer records, e.g. ${missing
        .slice(0, 3)
        .map((id) => JSON.stringify(id))
        .join(
          ", ",
        )}. An issuance is never un-issued, and a ledger that grew overall has still LOST these. Restore the pair from version control.`,
    });
  }

  for (const binding of [...input.live].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  )) {
    if (!known.has(binding.id)) {
      problems.push({
        kind: "unreserved-live-id",
        detail: `${binding.id} is bound to a live site but is absent from ${ledgerPath}. A merge brought in anchors the ledger never saw. Absorb them explicitly with \`npm run corpus:prose -- ledger\` — a mint will not seed history from the live sidecar on its own.`,
      });
      continue;
    }
    const issuance = input.ledger.issuances.find(
      (entry) => entry.id === binding.id,
    )!;
    if (issuance.site === null) {
      problems.push({
        kind: "unattested-live-binding",
        detail: `${binding.id} is live at ${binding.where}, but ${ledgerPath} retains no site provenance for it, so this binding cannot be checked against the issuance it claims. A burned id never returns to a live site, so this state means history was rebuilt or hand-edited under a live binding. Restore ${ledgerPath} from version control.`,
      });
      continue;
    }
    if (issuance.site !== binding.site) {
      problems.push({
        kind: "binding-mismatch",
        detail: `${binding.id} is live at ${binding.where}, whose site coordinate digests to ${binding.site}, but ${ledgerPath} records it as issued for a DIFFERENT site (${issuance.site}). A previously issued id has been moved onto another site — two branches each issued this number and a composition kept one side's history with the other side's binding. The id cannot become valid for a site it was not issued for: re-mint this site, and the owner review recorded against ${binding.id} stays with the binding it was issued for.`,
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
  // Also the floor the checkpoint's exact membership implies, so a symbol the
  // high-water map somehow omits is still bounded by what it attests.
  for (const id of attestedIds(baseline)) {
    issued.add(id);
    const symbol = symbolOf(id);
    highWater[symbol] = Math.max(highWater[symbol] ?? 0, indexOfId(id));
  }
  const issuances = new Map<string, AnchorIssuance>();
  for (const issuance of ledger.issuances) issuances.set(issuance.id, issuance);
  return { issued, highWater, issuances };
}

/**
 * The one rule no write path may break: history never goes backwards.
 *
 * Called immediately before the ledger and checkpoint are replaced, by every
 * command that replaces them. It is deliberately a separate, last-line guard
 * rather than a property each command is trusted to maintain, because the
 * reproduced blocker was exactly a command that meant to synchronise and in
 * fact re-based trust downward: `-- ledger` accepted a ledger with one retired
 * id surgically removed, wrote a checkpoint agreeing with the shortened file
 * (count 420 to 419, `RETURN_SUMMARY` high-water 23 to 22), and the next mint
 * handed `RETURN_SUMMARY-0023` to unrelated prose.
 *
 * A checkpoint may only ever advance, and it may only advance over evidence
 * that already contains everything the previous checkpoint attested.
 */
export function assertMonotonicAdvance(input: {
  readonly next: Iterable<AnchorIssuance>;
  readonly priorLedger: AnchorLedger | null;
  readonly priorBaseline: AnchorBaseline | null;
  readonly operation: string;
}): void {
  const nextIssuances = new Map<string, AnchorIssuance>();
  for (const issuance of input.next) {
    const seen = nextIssuances.get(issuance.id);
    if (seen && !sameIssuance(seen, issuance)) {
      throw new AnchorHistoryError(
        `Refusing to write: ${input.operation} would record ${issuance.id} for two different sites at once (${describeIssuance(seen)}; ${describeIssuance(issuance)}). One id is issued for one site. Nothing was written.`,
      );
    }
    nextIssuances.set(issuance.id, issuance);
  }
  const next = new Set(nextIssuances.keys());
  const failures: string[] = [];

  if (input.priorLedger) {
    const dropped = input.priorLedger.issued.filter((id) => !next.has(id));
    if (dropped.length > 0) {
      failures.push(
        `${dropped.length} id(s) recorded in ${LEDGER_FILE} are absent from what ${input.operation} would write, e.g. ${dropped
          .slice(0, 3)
          .map((id) => JSON.stringify(id))
          .join(", ")}. An issued id is never un-issued.`,
      );
    }
    // A record, once written, is history. Rewriting one is how a retired id's
    // issuance provenance would be quietly re-pointed at whichever site wanted
    // it next, which is exactly the loss this representation exists to prevent.
    for (const prior of input.priorLedger.issuances) {
      const candidate = nextIssuances.get(prior.id);
      if (!candidate || sameIssuance(prior, candidate)) continue;
      failures.push(
        `${input.operation} would rewrite the recorded issuance of ${prior.id} from (${describeIssuance(prior)}) to (${describeIssuance(candidate)}). Retirement removes a live binding and never rewrites the issuance behind it; a recorded binding is immutable.`,
      );
    }
  }

  if (input.priorBaseline) {
    if (next.size < input.priorBaseline.count) {
      failures.push(
        `${input.operation} would record ${next.size} ids where ${BASELINE_FILE} attests ${input.priorBaseline.count}. A checkpoint only advances.`,
      );
    }
    const derived = highWaterOf(next);
    for (const [symbol, mark] of Object.entries(
      input.priorBaseline.highWater,
    )) {
      const now = derived[symbol] ?? 0;
      if (now < mark) {
        failures.push(
          `${input.operation} would lower the ${symbol} high-water mark from ${mark} to ${now}. Ids at or below a mark already reached were issued and can never be offered again.`,
        );
      }
    }
    // Membership, not just its summary statistics. This is the guard the
    // reproduced recovery blocker walked straight past: it dropped an issued id
    // and added three later ones, so the count rose, every mark rose, and the
    // loss was read as growth.
    const lost = attestedIds(input.priorBaseline).filter((id) => !next.has(id));
    if (lost.length > 0) {
      failures.push(
        `${input.operation} would record a set that is NOT a superset of the ${input.priorBaseline.count} issuances ${BASELINE_FILE} attests: ${lost.length} attested id(s) are missing, e.g. ${lost
          .slice(0, 3)
          .map((id) => JSON.stringify(id))
          .join(
            ", ",
          )}. Growth in the total and in every per-symbol maximum does not make a set a superset.`,
      );
    }
  }

  if (failures.length > 0) {
    throw new AnchorHistoryError(
      `Refusing to write: ${input.operation} would move allocation history BACKWARDS. Nothing was written.\n${failures
        .map((failure) => `  ${failure}`)
        .join(
          "\n",
        )}\n  A regression is never converted into a new accepted baseline. Restore the pair from version control.`,
    );
  }
}

export function describeHistoryProblems(
  problems: readonly HistoryProblem[],
): string {
  return problems
    .map((problem) => `  [${problem.kind}] ${problem.detail}`)
    .join("\n");
}
