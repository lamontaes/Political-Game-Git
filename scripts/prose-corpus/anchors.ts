import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

export const ANCHOR_FILE = "scripts/prose-corpus/computed-anchors.json";
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
  writeFileSync(
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
}

function nextAnchorId(symbol: string, taken: ReadonlySet<string>): string {
  for (let index = 1; index < 100000; index += 1) {
    const candidate = `${symbol}-${String(index).padStart(4, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Cannot mint another anchor for ${symbol}.`);
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
 */
export function mintAnchors(
  literals: readonly ScannedLiteral[],
  existing: readonly ComputedAnchor[],
): MintOutcome {
  const resolution = resolveAnchors(literals, existing);
  const kept = new Map<string, ComputedAnchor>();
  for (const match of resolution.matches) {
    kept.set(match.anchor.anchor, {
      ...match.anchor,
      text: match.literal.text,
      textRevision: revisionOf(match.literal.text),
    });
  }

  const taken = new Set(existing.map((anchor) => anchor.anchor));
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
      const id = nextAnchorId(symbol, taken);
      taken.add(id);
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

  return {
    anchors: [...kept.values()],
    minted: minted.sort(),
    rebound,
    removed: removed.sort(),
    refused,
  };
}
