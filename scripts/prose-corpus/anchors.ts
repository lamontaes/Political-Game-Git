import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  atomicWriteFile,
  sortIssued,
  type AllocationHistory,
} from "./anchor-history";
import type { ScannedLiteral } from "./scan";

/**
 * Immutable identity for prose that a function composes rather than declares.
 *
 * The first version of this derived a computed site's key from the first eight
 * words of its own text, then disambiguated same-prefix collisions with an
 * encounter-order `--2` suffix. Both halves of that are wrong, and the packet's
 * reproducer showed it against the real extractor:
 *
 *   A: "You meet with your old friend again after work."
 *   B: "You meet with your old friend again after school."
 *
 * Inserting B ahead of A handed A's ID to B — so an owner's "keep" on A
 * silently became a "keep" on B, and A quietly moved to `--2`. And editing A
 * past its eighth word left the ID untouched, so a prior approval kept
 * applying to text that had changed underneath it.
 *
 * Identity therefore stops being derived at all. Each computed site gets an
 * anchor minted once and written to a sidecar, and extraction *matches* sites
 * to anchors instead of computing keys. Matching is on the site's FULL text
 * inside its own (file, symbol) group, so a shared prefix cannot redirect
 * anything, and an unresolved match is a visible failure rather than a silent
 * rematch to the nearest neighbour.
 *
 * Three concepts stay separate, and this file owns the first two:
 *
 *   1. semantic source identity — the anchor. Immutable across rewording.
 *   2. text and context revision — digests. Change when the words change.
 *   3. rendered realization — not here; a transcript records those.
 */

/** Overridable for disposable CLI probes; see `anchor-history.ts`. */
export const ANCHOR_FILE =
  process.env.PROSE_ANCHOR_FILE ?? "scripts/prose-corpus/computed-anchors.json";
export const ANCHOR_SCHEMA = 1;

export interface ComputedAnchor {
  /** Minted once, never recomputed. Survives rewording. */
  readonly anchor: string;
  readonly sourcePath: string;
  readonly symbol: string;
  /** The exact literal this anchor was last bound to. */
  readonly text: string;
  /**
   * Which occurrence of this exact text inside the symbol, from zero.
   *
   * Only meaningful when a symbol genuinely repeats one literal. Text alone
   * identifies every other site, so this never becomes a positional key by
   * the back door.
   */
  readonly occurrence: number;
  /** Digest of `text`. A reworded site keeps its anchor and changes this. */
  readonly textRevision: string;
}

export interface AnchorFile {
  readonly schema: number;
  readonly note: string;
  readonly anchors: readonly ComputedAnchor[];
}

/**
 * Separators for composite keys and digest inputs.
 *
 * Non-printing on purpose: a source path or a grounding description may
 * contain a space, so joining on one and splitting it back is a latent
 * mis-parse. These characters cannot occur in either.
 */
const UNIT = "\u0000";
const RECORD = "\u0001";

export function revisionOf(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/** Digest of the grounding a record's claims lean on. */
export function contextRevisionOf(
  entries: readonly { key: string; description: string }[],
): string {
  const canonical = [...entries]
    .map((entry) => `${entry.key}${UNIT}${entry.description}`)
    .sort()
    .join(RECORD);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

export function loadAnchorFile(path: string = ANCHOR_FILE): AnchorFile {
  if (!existsSync(path)) {
    return { schema: ANCHOR_SCHEMA, note: "", anchors: [] };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as AnchorFile;
  if (parsed.schema !== ANCHOR_SCHEMA) {
    throw new Error(
      `${path} declares schema ${parsed.schema}; this build understands ${ANCHOR_SCHEMA}.`,
    );
  }
  return parsed;
}

export function writeAnchorFile(
  file: AnchorFile,
  path: string = ANCHOR_FILE,
): void {
  const ordered = [...file.anchors].sort((left, right) =>
    left.anchor < right.anchor ? -1 : left.anchor > right.anchor ? 1 : 0,
  );
  atomicWriteFile(
    path,
    `${JSON.stringify({ ...file, anchors: ordered }, null, 2)}\n`,
  );
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

export interface AnchorMatch {
  readonly literal: ScannedLiteral;
  readonly anchor: ComputedAnchor;
  /** True when the anchor's recorded text is exactly this literal's. */
  readonly textUnchanged: boolean;
}

export interface AnchorProblem {
  readonly kind: "unmapped-site" | "orphaned-anchor" | "ambiguous-occurrence";
  readonly sourcePath: string;
  readonly symbol: string;
  readonly detail: string;
  /** The literal or the anchor's recorded text, for a reviewer to read. */
  readonly text: string;
}

export interface AnchorResolution {
  readonly matches: readonly AnchorMatch[];
  /**
   * Everything the sidecar could not account for.
   *
   * A non-empty list is a visible failure, never a nudge toward the closest
   * remaining anchor. Silently rematching is the exact defect being repaired.
   */
  readonly problems: readonly AnchorProblem[];
}

function groupKey(sourcePath: string, symbol: string): string {
  return `${sourcePath}${UNIT}${symbol}`;
}

/**
 * Bind extracted literals to anchors, or report why a binding is not possible.
 *
 * Matching is scoped to one (file, symbol) group and keyed on the literal's
 * FULL text. Two sentences sharing a prefix are two different keys here, so no
 * insertion can move one site's identity onto another. Where a symbol repeats
 * one literal exactly, the occurrence index separates them — and if the number
 * of repeats changed, that group's repeats are reported ambiguous rather than
 * paired up by position.
 */
export function resolveAnchors(
  literals: readonly ScannedLiteral[],
  anchors: readonly ComputedAnchor[],
): AnchorResolution {
  const matches: AnchorMatch[] = [];
  const problems: AnchorProblem[] = [];

  const literalsByGroup = new Map<string, ScannedLiteral[]>();
  for (const literal of literals) {
    const key = groupKey(literal.sourcePath, literal.enclosingSymbol);
    const list = literalsByGroup.get(key) ?? [];
    list.push(literal);
    literalsByGroup.set(key, list);
  }

  const anchorsByGroup = new Map<string, ComputedAnchor[]>();
  for (const anchor of anchors) {
    const key = groupKey(anchor.sourcePath, anchor.symbol);
    const list = anchorsByGroup.get(key) ?? [];
    list.push(anchor);
    anchorsByGroup.set(key, list);
  }

  const groups = new Set([...literalsByGroup.keys(), ...anchorsByGroup.keys()]);
  for (const group of groups) {
    const groupLiterals = literalsByGroup.get(group) ?? [];
    const groupAnchors = anchorsByGroup.get(group) ?? [];
    const [sourcePath = "", symbol = ""] = group.split(UNIT);

    const literalsByText = new Map<string, ScannedLiteral[]>();
    for (const literal of groupLiterals) {
      const list = literalsByText.get(literal.text) ?? [];
      list.push(literal);
      literalsByText.set(literal.text, list);
    }
    const anchorsByText = new Map<string, ComputedAnchor[]>();
    for (const anchor of groupAnchors) {
      const list = anchorsByText.get(anchor.text) ?? [];
      list.push(anchor);
      anchorsByText.set(anchor.text, list);
    }

    const texts = new Set([...literalsByText.keys(), ...anchorsByText.keys()]);
    for (const text of texts) {
      const sites = literalsByText.get(text) ?? [];
      const bound = [...(anchorsByText.get(text) ?? [])].sort(
        (left, right) => left.occurrence - right.occurrence,
      );

      if (
        sites.length !== bound.length &&
        sites.length > 0 &&
        bound.length > 0
      ) {
        problems.push({
          kind: "ambiguous-occurrence",
          sourcePath,
          symbol,
          detail: `${sites.length} site(s) carry this exact text but ${bound.length} anchor(s) are recorded for it. Re-mint deliberately; positions are never guessed.`,
          text,
        });
        continue;
      }
      if (sites.length > 0 && bound.length === 0) {
        for (const site of sites) {
          problems.push({
            kind: "unmapped-site",
            sourcePath,
            symbol,
            detail:
              "No anchor is recorded for this site. Run `npm run corpus:prose -- anchors` to mint one.",
            text: site.text,
          });
        }
        continue;
      }
      if (sites.length === 0 && bound.length > 0) {
        for (const anchor of bound) {
          problems.push({
            kind: "orphaned-anchor",
            sourcePath,
            symbol,
            detail: `Anchor ${anchor.anchor} records text that no longer appears here. It was reworded or removed; re-mint to record the revision.`,
            text: anchor.text,
          });
        }
        continue;
      }
      sites.forEach((site, index) => {
        const anchor = bound[index];
        if (!anchor) return;
        matches.push({
          literal: site,
          anchor,
          textUnchanged: anchor.textRevision === revisionOf(site.text),
        });
      });
    }
  }

  matches.sort((left, right) =>
    left.anchor.anchor < right.anchor.anchor ? -1 : 1,
  );
  problems.sort((left, right) =>
    `${left.kind}${left.text}` < `${right.kind}${right.text}` ? -1 : 1,
  );
  return { matches, problems };
}

/* -------------------------------------------------------------------------- */
/* Minting                                                                     */
/* -------------------------------------------------------------------------- */

export interface MintOutcome {
  readonly anchors: readonly ComputedAnchor[];
  readonly minted: readonly string[];
  /** Rewordings: an anchor kept its identity and changed its recorded text. */
  readonly rebound: readonly { anchor: string; from: string; to: string }[];
  readonly removed: readonly string[];
  /** Groups the mint refused to guess at. Nothing in them was changed. */
  readonly refused: readonly AnchorProblem[];
  /**
   * The allocation ledger after this mint: every ID ever issued, sorted.
   *
   * Grows by the newly minted IDs and by any live anchor the ledger had not
   * yet absorbed. Never shrinks — a retired ID stays here precisely so it can
   * never be handed to a different sentence.
   */
  readonly issued: readonly string[];
  /**
   * IDs the ledger burns that no live anchor holds — retired identities.
   *
   * Reported so a mint can prove it reused none of them.
   */
  readonly burned: readonly string[];
}

/**
 * The next id for a symbol: above every reservation, and above the floor.
 *
 * Two independent guards, on purpose. `reserved` is the ledger's account of
 * what has been issued; `floor` is the checkpoint's high-water mark for this
 * symbol. Starting at `floor + 1` means that even a ledger which has quietly
 * lost entries cannot offer a number back, because the mark survives in the
 * other file. A gap left by a lost reservation is burned, never recycled.
 */
function nextAnchorId(
  symbol: string,
  reserved: ReadonlySet<string>,
  floor: number,
): string {
  for (let index = Math.max(1, floor + 1); index < 100000; index += 1) {
    const candidate = `${symbol}-${String(index).padStart(4, "0")}`;
    if (!reserved.has(candidate)) return candidate;
  }
  throw new Error(
    `Cannot mint another anchor for ${symbol}: every id from ${symbol}-${String(Math.max(1, floor + 1)).padStart(4, "0")} to ${symbol}-99999 has already been issued.`,
  );
}

/**
 * Bring the sidecar up to date with the source, without ever guessing.
 *
 * A brand-new site mints a fresh anchor. A site whose text changed keeps its
 * anchor ONLY when the rebinding is unambiguous: exactly one unmapped site and
 * exactly one orphaned anchor in the same (file, symbol) group, which is what a
 * single edit in place looks like. Anything less certain — two edits at once,
 * a changed repeat count — is refused and left for a person, because a wrong
 * rebind silently moves an owner's approval onto text they never read.
 *
 * `history` carries verified allocation history in: every id ever issued, and
 * the per-symbol floor the allocator may not go below. It is REQUIRED and has
 * no default. The earlier signature defaulted it to "reserve the live sidecar
 * alone", which is the original defect written as a parameter — any caller
 * that forgot the argument silently got an allocator with no memory of
 * retirement. There is no longer a way to call this without history.
 *
 * Duplicate live ids are refused before anything is computed. Two bindings
 * carrying one id is what a hand-unioned sidecar produces, and it used to be
 * absorbed silently: the anchors were collected into a map keyed by id, so the
 * second binding overwrote the first and simply vanished from the sidecar,
 * reported as neither retired nor changed.
 */
export function mintAnchors(
  literals: readonly ScannedLiteral[],
  existing: readonly ComputedAnchor[],
  history: AllocationHistory,
): MintOutcome {
  const duplicates = existing
    .map((anchor) => anchor.anchor)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicates.length > 0) {
    const detail = [...new Set(duplicates)]
      .sort()
      .map((id) => {
        const bindings = existing
          .filter((anchor) => anchor.anchor === id)
          .map(
            (anchor) =>
              `      ${anchor.sourcePath} ${anchor.symbol} #${anchor.occurrence} ${JSON.stringify(anchor.text)}`,
          )
          .join("\n");
        return `  ${id} is bound to ${existing.filter((anchor) => anchor.anchor === id).length} live sites:\n${bindings}`;
      })
      .join("\n");
    throw new Error(
      `Refusing to mint: ${new Set(duplicates).size} anchor id(s) are bound to more than one live site. Two branches minted the same number independently, or a sidecar was union-merged by hand. Nothing was written.\n${detail}\n  Reconcile deliberately — re-mint one of the sites. The owner review recorded against an id stays with whichever binding keeps it and does not transfer to the replacement.`,
    );
  }

  const resolution = resolveAnchors(literals, existing);
  const kept = new Map<string, ComputedAnchor>();
  for (const match of resolution.matches) {
    kept.set(match.anchor.anchor, {
      ...match.anchor,
      text: match.literal.text,
      textRevision: revisionOf(match.literal.text),
    });
  }

  const reserved = new Set(history.issued);
  for (const anchor of existing) reserved.add(anchor.anchor);
  const minted: string[] = [];
  const rebound: { anchor: string; from: string; to: string }[] = [];
  const removed: string[] = [];
  const refused: AnchorProblem[] = [];

  const byGroup = new Map<string, AnchorProblem[]>();
  for (const problem of resolution.problems) {
    const key = groupKey(problem.sourcePath, problem.symbol);
    const list = byGroup.get(key) ?? [];
    list.push(problem);
    byGroup.set(key, list);
  }

  for (const [key, problems] of byGroup) {
    const [sourcePath = "", symbol = ""] = key.split(UNIT);
    const ambiguous = problems.filter(
      (problem) => problem.kind === "ambiguous-occurrence",
    );
    const unmapped = problems.filter(
      (problem) => problem.kind === "unmapped-site",
    );
    const orphaned = problems.filter(
      (problem) => problem.kind === "orphaned-anchor",
    );

    if (ambiguous.length > 0) {
      refused.push(...ambiguous);
      continue;
    }

    // The unambiguous rewording: one site changed, one anchor went stale.
    if (unmapped.length === 1 && orphaned.length === 1) {
      const site = unmapped[0]!;
      const stale = orphaned[0]!;
      const anchor = existing.find(
        (entry) =>
          entry.sourcePath === sourcePath &&
          entry.symbol === symbol &&
          entry.text === stale.text,
      );
      if (anchor) {
        kept.set(anchor.anchor, {
          ...anchor,
          text: site.text,
          textRevision: revisionOf(site.text),
        });
        rebound.push({
          anchor: anchor.anchor,
          from: stale.text,
          to: site.text,
        });
        continue;
      }
    }

    // Anything else: mint the new sites, retire the gone ones, guess nothing.
    if (unmapped.length > 0 && orphaned.length > 0) {
      refused.push(...unmapped, ...orphaned);
      continue;
    }
    for (const site of unmapped) {
      const id = nextAnchorId(symbol, reserved, history.highWater[symbol] ?? 0);
      reserved.add(id);
      const literal = literals.find(
        (entry) =>
          entry.sourcePath === sourcePath &&
          entry.enclosingSymbol === symbol &&
          entry.text === site.text,
      );
      const occurrence = [...kept.values()].filter(
        (entry) =>
          entry.sourcePath === sourcePath &&
          entry.symbol === symbol &&
          entry.text === site.text,
      ).length;
      kept.set(id, {
        anchor: id,
        sourcePath,
        symbol,
        text: literal?.text ?? site.text,
        occurrence,
        textRevision: revisionOf(literal?.text ?? site.text),
      });
      minted.push(id);
    }
    for (const stale of orphaned) {
      const anchor = existing.find(
        (entry) =>
          entry.sourcePath === sourcePath &&
          entry.symbol === symbol &&
          entry.text === stale.text,
      );
      if (anchor) removed.push(anchor.anchor);
    }
  }

  const anchors = [...kept.values()];
  const issued = sortIssued(reserved);
  const live = new Set(anchors.map((anchor) => anchor.anchor));

  return {
    anchors,
    minted: minted.sort(),
    rebound,
    removed: removed.sort(),
    refused,
    issued,
    burned: issued.filter((id) => !live.has(id)),
  };
}
