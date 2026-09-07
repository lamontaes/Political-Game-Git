import {
  TERMINAL_ASSET_REQUEST_STATUSES,
  type AssetRequest,
} from "./asset-request";

/**
 * WHETHER THE PROJECT ALREADY OWNS WHAT IT IS ABOUT TO COMMISSION.
 *
 * `asset-request.ts` records the ask and makes each request say what was
 * searched before it was written. That check is true on the day it is written
 * and decays from then on: art arrives, gets chopped, measured and banked under
 * a name nobody put back into the queue, and the queue keeps asking for it. The
 * front-facing footwear pairs were requested for re-render while the corrected
 * front-facing source sat ingested, chopped and hash-verified in the same
 * repository.
 *
 * This module is the reconciliation that closes that gap, and it is deliberately
 * DECLARED AND VERIFIED rather than inferred. Nothing here guesses that a
 * preserved asset answers a request by matching words in its title or by
 * finding a unit's name somewhere inside a path; a person names the exact
 * preserved unit and the exact evidence, and this module refuses the
 * declaration when it does not hold together.
 *
 * Two properties carry the weight.
 *
 * EXACT IDENTITY. Every unit of preserved art is named by a stable key, and
 * every verdict that claims preserved art bears on a request says which keys.
 * A unit is linked to at least one verdict or declared unlinked; it may not be
 * both, may not be declared twice, and may not silently disappear. Substring
 * inference — a path that merely happens to contain a unit's name — is not a
 * relation and is never accepted as one.
 *
 * EXACT EVIDENCE. A cited path is canonical and repository-relative, and it
 * resolves to art the preserved evidence itself recorded for that unit, at the
 * hash it recorded. A directory proves nothing by existing: every member the
 * evidence records must be present as a regular file and hash as recorded. One
 * missing, renamed or drifted member fails the whole declaration.
 *
 * The last guard is the one that matters over time. A newly ingested family
 * that nobody has reconciled is exactly how the previous double-commission
 * happened, so it fails the check rather than passing silently.
 */

export type AssetReadinessVerdict =
  /** Preserved art answers the ask. The request must be withdrawn, not generated. */
  | "closed-by-preserved-asset"
  /** Preserved art changes what the request may claim, but does not answer it. */
  | "premise-restated-still-required"
  /** Nothing preserved bears on this ask. It stands as written. */
  | "unaffected-still-required";

export interface AssetReadinessRequestVerdict {
  readonly requestId: string;
  readonly verdict: AssetReadinessVerdict;
  /**
   * The exact preserved units this verdict rests on. Empty only when the
   * verdict is `unaffected-still-required`.
   */
  readonly preservedUnits: readonly string[];
  /** Repository paths that carry the pixels or the measurements being cited. */
  readonly evidencePaths: readonly string[];
  /** Why the evidence does or does not answer the ask, in the ask's own terms. */
  readonly reason: string;
}

/**
 * Preserved art that answers no open request. Recorded so that ingesting a
 * family and then forgetting it is a visible state rather than an absence.
 */
export interface UnlinkedPreservedAsset {
  /** Exactly one preserved unit key. */
  readonly preservedUnit: string;
  readonly evidencePaths: readonly string[];
  readonly reason: string;
  readonly nextRequiredAction: string;
}

export interface AssetReadinessDeclaration {
  readonly documentVersion: 2;
  readonly reconciledAgainst: {
    readonly preservedEvidenceGeneration: string;
    readonly mergeCommit: string;
    readonly evidenceDocuments: readonly string[];
  };
  readonly requestVerdicts: readonly AssetReadinessRequestVerdict[];
  readonly unlinkedPreservedAssets: readonly UnlinkedPreservedAsset[];
}

/** One file the preserved evidence recorded, at the hash it recorded. */
export interface PreservedEvidenceFile {
  readonly path: string;
  readonly sha256: string;
}

/**
 * A unit of preserved art, and the closed set of evidence admissible for it.
 *
 * `files` are standalone rasters. `directories` are chopped families: the
 * member list is the exact component set the preserved evidence recorded, and
 * all of it has to be there.
 */
export interface PreservedUnit {
  readonly unitKey: string;
  readonly files: readonly PreservedEvidenceFile[];
  readonly directories: readonly {
    readonly path: string;
    readonly members: readonly PreservedEvidenceFile[];
  }[];
}

/** What the repository actually holds at a declared path. */
export interface EvidenceProbe {
  readonly status:
    | "regular-file"
    | "directory"
    | "missing"
    /** Resolves, via `..` or a symlink, outside the repository root. */
    | "escapes-repository"
    /** Exists but is neither a regular file nor a directory. */
    | "irregular";
  readonly sha256?: string;
  /** Regular files directly inside the directory, for directory evidence. */
  readonly members?: readonly PreservedEvidenceFile[];
}

/**
 * Looks at the repository. Supplied by the caller so this module stays free of
 * the filesystem and can be reasoned about on literals.
 */
export type ProbeEvidence = (declaredPath: string) => EvidenceProbe;

export type AssetReadinessFindingCode =
  | "open-request-without-verdict"
  | "verdict-for-unknown-request"
  | "duplicate-verdict"
  | "closed-request-still-open"
  | "verdict-without-evidence"
  | "unaffected-verdict-cites-evidence"
  | "preserved-unit-unreconciled"
  | "missing-evidence-path"
  | "unknown-preserved-unit"
  | "duplicate-preserved-unit"
  | "duplicate-unlinked-unit"
  | "unit-linked-and-unlinked"
  | "unlinked-without-evidence"
  | "preserved-unit-without-evidence"
  | "evidence-path-not-canonical"
  | "evidence-escapes-repository"
  | "evidence-kind-mismatch"
  | "evidence-hash-drift"
  | "evidence-member-missing"
  | "evidence-outside-declared-universe";

export interface AssetReadinessFinding {
  readonly code: AssetReadinessFindingCode;
  readonly severity: "error";
  readonly subject: string;
  readonly message: string;
}

export interface AssetReadinessReport {
  readonly valid: boolean;
  readonly findings: readonly AssetReadinessFinding[];
  readonly closedByPreservedAsset: readonly string[];
  readonly premiseRestated: readonly string[];
  readonly stillRequired: readonly string[];
  readonly linkedPreservedUnits: readonly string[];
  readonly unlinkedPreservedUnits: readonly string[];
}

function isOpen(request: AssetRequest): boolean {
  return !TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status);
}

/**
 * Why a declared path is not a canonical repository-relative path, or null.
 *
 * This is the first gate and it is deliberately syntactic: a path that is
 * absolute, that climbs with `..`, or that is spelled in a way two readers
 * would resolve differently never reaches the filesystem at all.
 */
export function nonCanonicalReason(declaredPath: string): string | null {
  if (declaredPath.length === 0) return "it is empty";
  if (declaredPath.includes("\\"))
    return "it uses backslashes rather than repository-relative '/' separators";
  if (declaredPath.startsWith("/")) return "it is an absolute path";
  if (/^[A-Za-z]:/.test(declaredPath)) return "it is an absolute path";
  if (declaredPath.endsWith("/")) return "it has a trailing separator";
  if (declaredPath.includes("\0")) return "it contains a null byte";
  const segments = declaredPath.split("/");
  for (const segment of segments) {
    if (segment === "") return "it has an empty path segment";
    if (segment === ".") return "it has a '.' segment";
    if (segment === "..") return "it climbs out of the repository with '..'";
  }
  return null;
}

interface UnitUniverse {
  readonly files: ReadonlyMap<string, string>;
  readonly directories: ReadonlyMap<string, readonly PreservedEvidenceFile[]>;
}

function universeOf(unit: PreservedUnit): UnitUniverse {
  return {
    files: new Map(unit.files.map((file) => [file.path, file.sha256])),
    directories: new Map(
      unit.directories.map((directory) => [directory.path, directory.members]),
    ),
  };
}

/**
 * Reconciles the queue against the declaration.
 *
 * `preservedUnits` is every unit of preserved art the reconciliation must
 * account for, each carrying the closed set of evidence admissible for it.
 */
export function reconcileAssetReadiness(
  requests: readonly AssetRequest[],
  declaration: AssetReadinessDeclaration,
  preservedUnits: readonly PreservedUnit[],
  probe: ProbeEvidence,
): AssetReadinessReport {
  const findings: AssetReadinessFinding[] = [];
  const error = (
    code: AssetReadinessFindingCode,
    subject: string,
    message: string,
  ) => findings.push({ code, severity: "error", subject, message });

  const universes = new Map(
    preservedUnits.map((unit) => [unit.unitKey, universeOf(unit)]),
  );

  /**
   * Verifies one cited path against the units it is declared under. The path
   * has to be canonical, has to be admissible evidence for at least one of
   * those units, and has to be on disk exactly as the preserved evidence
   * recorded it.
   */
  const verifyEvidence = (
    subject: string,
    declaredPath: string,
    declaredUnits: readonly string[],
  ): string[] => {
    const nonCanonical = nonCanonicalReason(declaredPath);
    if (nonCanonical !== null) {
      error(
        "evidence-path-not-canonical",
        subject,
        `Cited evidence '${declaredPath}' is not a canonical repository-relative path: ${nonCanonical}.`,
      );
      return [];
    }

    const owning = declaredUnits.filter((unitKey) => {
      const universe = universes.get(unitKey);
      if (!universe) return false;
      return (
        universe.files.has(declaredPath) ||
        universe.directories.has(declaredPath)
      );
    });
    if (owning.length === 0) {
      error(
        "evidence-outside-declared-universe",
        subject,
        `Cited evidence '${declaredPath}' is not evidence the preserved record holds for any unit this declaration names (${declaredUnits.join(", ") || "none"}). A path that merely resembles a unit's name is not a relation to it.`,
      );
      return [];
    }

    const found = probe(declaredPath);
    if (found.status === "escapes-repository") {
      error(
        "evidence-escapes-repository",
        subject,
        `Cited evidence '${declaredPath}' resolves outside the repository root.`,
      );
      return owning;
    }
    if (found.status === "missing") {
      error(
        "missing-evidence-path",
        subject,
        `Cited evidence '${declaredPath}' is not in the repository.`,
      );
      return owning;
    }
    if (found.status === "irregular") {
      error(
        "evidence-kind-mismatch",
        subject,
        `Cited evidence '${declaredPath}' is neither a regular file nor a directory.`,
      );
      return owning;
    }

    for (const unitKey of owning) {
      const universe = universes.get(unitKey)!;
      const expectedFileHash = universe.files.get(declaredPath);
      if (expectedFileHash !== undefined) {
        if (found.status !== "regular-file") {
          error(
            "evidence-kind-mismatch",
            subject,
            `Cited evidence '${declaredPath}' is recorded as a file of '${unitKey}' but is a directory in the repository.`,
          );
          continue;
        }
        if (found.sha256 !== expectedFileHash) {
          error(
            "evidence-hash-drift",
            subject,
            `Cited evidence '${declaredPath}' hashes ${found.sha256 ?? "nothing"} but the preserved record for '${unitKey}' says ${expectedFileHash}.`,
          );
        }
        continue;
      }

      const expectedMembers = universe.directories.get(declaredPath)!;
      if (found.status !== "directory") {
        error(
          "evidence-kind-mismatch",
          subject,
          `Cited evidence '${declaredPath}' is recorded as the family directory of '${unitKey}' but is a regular file in the repository.`,
        );
        continue;
      }
      const present = new Map(
        (found.members ?? []).map((member) => [member.path, member.sha256]),
      );
      for (const member of expectedMembers) {
        const actual = present.get(member.path);
        if (actual === undefined) {
          error(
            "evidence-member-missing",
            subject,
            `'${declaredPath}' is cited for '${unitKey}', but the recorded component '${member.path}' is not a regular file there. A directory that exists is not evidence; its recorded members are.`,
          );
          continue;
        }
        if (actual !== member.sha256) {
          error(
            "evidence-hash-drift",
            subject,
            `Component '${member.path}' of '${unitKey}' hashes ${actual} but the preserved record says ${member.sha256}.`,
          );
        }
      }
    }
    return owning;
  };

  const byId = new Map(requests.map((request) => [request.requestId, request]));
  const seen = new Set<string>();
  /** unit key -> the request ids that link it. */
  const linked = new Map<string, string[]>();

  for (const verdict of declaration.requestVerdicts) {
    const request = byId.get(verdict.requestId);
    if (!request) {
      error(
        "verdict-for-unknown-request",
        verdict.requestId,
        `The reconciliation rules on '${verdict.requestId}', which is not in the request queue.`,
      );
      continue;
    }
    if (seen.has(verdict.requestId)) {
      error(
        "duplicate-verdict",
        verdict.requestId,
        `Two verdicts for '${verdict.requestId}'. A request is reconciled once or not at all.`,
      );
    }
    seen.add(verdict.requestId);

    if (
      verdict.verdict === "closed-by-preserved-asset" &&
      request.status !== "withdrawn-already-covered"
    ) {
      error(
        "closed-request-still-open",
        verdict.requestId,
        `Preserved art is declared to answer '${verdict.requestId}', but the queue still carries status '${request.status}'. A request answered by art the project already owns is withdrawn, not generated.`,
      );
    }

    const declaredUnits: string[] = [];
    const declaredHere = new Set<string>();
    for (const unitKey of verdict.preservedUnits) {
      if (!universes.has(unitKey)) {
        error(
          "unknown-preserved-unit",
          verdict.requestId,
          `'${verdict.requestId}' names preserved unit '${unitKey}', which is not a unit of the preserved evidence.`,
        );
        continue;
      }
      if (declaredHere.has(unitKey)) {
        error(
          "duplicate-preserved-unit",
          verdict.requestId,
          `'${verdict.requestId}' names preserved unit '${unitKey}' twice.`,
        );
        continue;
      }
      declaredHere.add(unitKey);
      declaredUnits.push(unitKey);
    }

    if (verdict.verdict === "unaffected-still-required") {
      if (
        verdict.evidencePaths.length > 0 ||
        verdict.preservedUnits.length > 0
      ) {
        error(
          "unaffected-verdict-cites-evidence",
          verdict.requestId,
          `'${verdict.requestId}' is declared unaffected yet names preserved art. Evidence that bears on a request restates it; evidence that does not is not evidence.`,
        );
      }
      continue;
    }

    if (verdict.evidencePaths.length === 0 || declaredUnits.length === 0) {
      error(
        "verdict-without-evidence",
        verdict.requestId,
        `'${verdict.requestId}' claims preserved art bears on it but names no preserved unit and evidence path for that art.`,
      );
    }

    const backed = new Set<string>();
    for (const evidencePath of verdict.evidencePaths) {
      for (const unitKey of verifyEvidence(
        verdict.requestId,
        evidencePath,
        declaredUnits,
      )) {
        backed.add(unitKey);
      }
    }
    for (const unitKey of declaredUnits) {
      if (!backed.has(unitKey)) {
        error(
          "preserved-unit-without-evidence",
          verdict.requestId,
          `'${verdict.requestId}' rests on preserved unit '${unitKey}' but cites no evidence path belonging to it.`,
        );
        continue;
      }
      const already = linked.get(unitKey);
      if (already) already.push(verdict.requestId);
      else linked.set(unitKey, [verdict.requestId]);
    }
  }

  for (const request of requests) {
    if (!isOpen(request)) continue;
    if (!seen.has(request.requestId)) {
      error(
        "open-request-without-verdict",
        request.requestId,
        `'${request.requestId}' is open and has not been reconciled against the preserved assets. An unreconciled open request is how the project commissions a second copy of art it owns.`,
      );
    }
  }

  const unlinked = new Set<string>();
  for (const entry of declaration.unlinkedPreservedAssets) {
    if (!universes.has(entry.preservedUnit)) {
      error(
        "unknown-preserved-unit",
        entry.preservedUnit,
        `'${entry.preservedUnit}' is recorded as unlinked but is not a unit of the preserved evidence.`,
      );
      continue;
    }
    if (unlinked.has(entry.preservedUnit)) {
      error(
        "duplicate-unlinked-unit",
        entry.preservedUnit,
        `'${entry.preservedUnit}' is recorded as unlinked twice.`,
      );
      continue;
    }
    unlinked.add(entry.preservedUnit);

    if (entry.evidencePaths.length === 0) {
      error(
        "unlinked-without-evidence",
        entry.preservedUnit,
        `'${entry.preservedUnit}' is recorded as unlinked but cites no evidence that the art is here at all.`,
      );
      continue;
    }
    const backed = new Set<string>();
    for (const evidencePath of entry.evidencePaths) {
      for (const unitKey of verifyEvidence(entry.preservedUnit, evidencePath, [
        entry.preservedUnit,
      ])) {
        backed.add(unitKey);
      }
    }
    if (!backed.has(entry.preservedUnit)) {
      error(
        "unlinked-without-evidence",
        entry.preservedUnit,
        `'${entry.preservedUnit}' is recorded as unlinked but none of its cited paths is evidence the preserved record holds for it.`,
      );
    }
  }

  for (const unitKey of unlinked) {
    if (linked.has(unitKey)) {
      error(
        "unit-linked-and-unlinked",
        unitKey,
        `'${unitKey}' is both linked to ${linked.get(unitKey)!.join(", ")} and recorded as answering no request. It is one or the other.`,
      );
    }
  }

  for (const unit of preservedUnits) {
    if (linked.has(unit.unitKey) || unlinked.has(unit.unitKey)) continue;
    error(
      "preserved-unit-unreconciled",
      unit.unitKey,
      `Preserved art '${unit.unitKey}' answers no request and is not recorded as unlinked. Ingested art nobody reconciled is invisible to the queue that would otherwise ask for it again.`,
    );
  }

  const idsWith = (verdict: AssetReadinessVerdict) =>
    declaration.requestVerdicts
      .filter((entry) => entry.verdict === verdict)
      .map((entry) => entry.requestId)
      .sort();

  return {
    valid: findings.length === 0,
    findings,
    closedByPreservedAsset: idsWith("closed-by-preserved-asset"),
    premiseRestated: idsWith("premise-restated-still-required"),
    stillRequired: idsWith("unaffected-still-required"),
    linkedPreservedUnits: [...linked.keys()].sort(),
    unlinkedPreservedUnits: [...unlinked].sort(),
  };
}
