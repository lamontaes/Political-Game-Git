/**
 * SYSTEM 1 — ENVIRONMENT MASTER INTAKE CONTRACT
 *
 * What a candidate master must say about where it came from before the
 * repository will treat it as production cargo.
 *
 * The problem this solves is narrow and specific. A 2560px generation that has
 * been run through an external upscaler comes back as a 5120px file, and the
 * file itself no longer remembers that. Nothing in the pixels distinguishes it
 * from a native 5120px render. If intake trusts pixel dimensions alone the
 * repository quietly acquires a library of masters whose sharpness it has
 * overstated, and the first place that becomes visible is a player's screen.
 *
 * So the rule here is NOT "no upscales". An externally upscaled master is often
 * the best available art and is explicitly admissible. The rule is that the
 * enlargement must be DECLARED, and once declared it is carried forward
 * everywhere — into the tier plan, into the manifest, into the runtime ladder,
 * and into the fidelity warnings the debug overlay prints.
 *
 * This module is pure. It measures nothing and touches no files: the caller
 * supplies measurements taken elsewhere, and gets back a disposition it can
 * act on. `scripts/art-asset-factory/environment-intake.ts` is the filesystem
 * half.
 */

import {
  ENVIRONMENT_MASTER_MINIMUM_WIDTH,
  ENVIRONMENT_MASTER_RECOMMENDED_WIDTH,
} from "../presentation/component-masters";

// ---------------------------------------------------------------------------
// Lineage vocabulary
// ---------------------------------------------------------------------------

/**
 * What KIND of thing a candidate file is, relative to the art that came before
 * it. These are the five states Packet 26 requires intake to distinguish, and
 * they are deliberately about provenance rather than about quality.
 *
 * - `original-master` — the generated or authored render itself. Nothing
 *   upstream of it exists inside this project.
 * - `external-upscale-derivative` — produced from an earlier master by a tool
 *   OUTSIDE this repository: an upscaler, a retouch pass, a paint-over. Its
 *   pixel count exceeds the detail behind it and it must say by how much.
 * - `production-normalized` — a derivative made INSIDE this repository by a
 *   deterministic, reproducible normalization (crop, colour-space, container).
 *   Normalization never enlarges, so detail is preserved exactly.
 * - `runtime-tier` — a member of a raster ladder, derived by the tier
 *   pipeline. Registered through the tier plan, not through master intake.
 * - `reference-only` — evidence, a photograph, a plan sheet, a mood board. It
 *   informs authoring and is never shipped as a plate.
 */
export type AssetLineageClass =
  | "original-master"
  | "external-upscale-derivative"
  | "production-normalized"
  | "runtime-tier"
  | "reference-only";

export const ASSET_LINEAGE_CLASSES: readonly AssetLineageClass[] = [
  "original-master",
  "external-upscale-derivative",
  "production-normalized",
  "runtime-tier",
  "reference-only",
];

/**
 * What the submitter is willing to state about the detail behind the pixels.
 *
 * `unverified` is a real and useful answer. It is what an approver says about a
 * file whose history they genuinely do not know, and it is why it exists as a
 * state rather than being collapsed into `native`: guessing "probably native"
 * is exactly the failure this contract is built to prevent.
 */
export type NativeDetailState = "native" | "declared-upscale" | "unverified";

export interface NativeDetailDeclaration {
  readonly state: NativeDetailState;
  /**
   * The width at which real detail stops. Required for `declared-upscale`,
   * forbidden for `native` (where the file's own width is the answer), and
   * optional for `unverified` when a bound is known but not certain.
   */
  readonly nativeDetailWidth?: number;
  /** How the enlargement was performed, when it is known. */
  readonly derivationMethod?: string;
  /** The tool and version, when known. Free text; nothing parses it. */
  readonly derivationTool?: string;
  readonly note?: string;
}

/** What the candidate is being considered FOR. */
export type AssetTargetClass =
  /** A room plate the scene compositor paints. */
  | "environment-plate"
  /** A title/menu tableau background. */
  | "title-plate"
  /** Evidence and authoring reference; never shipped. */
  | "reference";

export const ASSET_TARGET_CLASSES: readonly AssetTargetClass[] = [
  "environment-plate",
  "title-plate",
  "reference",
];

export interface AssetLineageDeclaration {
  readonly lineageClass: AssetLineageClass;
  /**
   * The asset this one was derived from, when the parent is itself tracked.
   * Required for the two derivative classes: a derivative that cannot name its
   * parent is not a derivative, it is an unattributed file.
   */
  readonly sourceAssetId?: string;
  /** Dimensions of the file this candidate was derived FROM, when known. */
  readonly sourceWidth?: number;
  readonly sourceHeight?: number;
  readonly nativeDetail: NativeDetailDeclaration;
  /**
   * Rights status, carried through from the manifest vocabulary. Unknown stays
   * unknown; visibility is never evidence of a licence.
   */
  readonly rightsStatus?: "public-domain" | "licensed" | "owned" | "unknown";
  readonly approvedBy?: string;
  readonly approvalNote?: string;
}

// ---------------------------------------------------------------------------
// Candidate and measurement
// ---------------------------------------------------------------------------

/** A file as it was actually found on disk, with nothing inferred. */
export interface MeasuredCandidate {
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
  /** Container format, lowercased and without a dot: `png`, `jpg`, `webp`. */
  readonly format: string;
  /** SHA-256 of the file bytes. */
  readonly contentHash: string;
  /** Null when the container does not carry the information. */
  readonly hasAlphaChannel: boolean | null;
  /**
   * Whether the alpha channel genuinely varies. Null when the pixels were not
   * inspected, which is reported as unknown rather than assumed either way.
   */
  readonly hasVaryingAlpha: boolean | null;
}

export interface EnvironmentMasterCandidate {
  readonly assetId: string;
  /** Repository-relative POSIX path. */
  readonly path: string;
  readonly targetClass: AssetTargetClass;
  readonly lineage: AssetLineageDeclaration;
  /** Family this plate is intended to serve, when already decided. */
  readonly familyId?: string;
}

// ---------------------------------------------------------------------------
// Disposition
// ---------------------------------------------------------------------------

/**
 * - `production` — may become a plate and a runtime tier ladder.
 * - `reference` — kept and catalogued, never shipped as a plate.
 * - `reject` — not admissible; the reasons say why.
 */
export type IntakeDisposition = "production" | "reference" | "reject";

export type IntakeFindingCode =
  | "lineage-class-unknown"
  | "derivative-without-parent"
  | "upscale-without-declared-detail"
  | "declared-detail-exceeds-width"
  | "native-claim-with-detail-width"
  | "master-width-below-minimum"
  | "master-width-below-recommendation"
  | "native-detail-below-minimum"
  | "native-detail-unverified"
  | "reference-only-cannot-ship"
  | "unreadable-dimensions"
  | "rights-status-unknown"
  | "alpha-unverified";

export type IntakeFindingSeverity = "error" | "warning" | "note";

export interface IntakeFinding {
  readonly code: IntakeFindingCode;
  readonly severity: IntakeFindingSeverity;
  readonly message: string;
}

export interface EnvironmentMasterIntakeRecord {
  readonly assetId: string;
  readonly path: string;
  readonly targetClass: AssetTargetClass;
  readonly lineageClass: AssetLineageClass;
  readonly familyId: string | null;
  readonly width: number | null;
  readonly height: number | null;
  /** width / height, rounded to four places, or null when unmeasured. */
  readonly aspectRatio: number | null;
  readonly format: string;
  readonly contentHash: string;
  readonly byteLength: number;
  readonly hasAlphaChannel: boolean | null;
  readonly hasVaryingAlpha: boolean | null;
  /**
   * The width at which real detail stops. Equal to the pixel width for a
   * native master; lower for a declared upscale; null when the submitter would
   * not vouch for it.
   */
  readonly nativeDetailWidth: number | null;
  readonly nativeDetailState: NativeDetailState;
  readonly derivationMethod: string | null;
  readonly sourceAssetId: string | null;
  readonly sourceWidth: number | null;
  readonly sourceHeight: number | null;
  readonly rightsStatus: string;
  readonly disposition: IntakeDisposition;
  readonly findings: readonly IntakeFinding[];
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function finding(
  code: IntakeFindingCode,
  severity: IntakeFindingSeverity,
  message: string,
): IntakeFinding {
  return { code, severity, message };
}

/**
 * Detail actually behind a candidate's pixels.
 *
 * A declared upscale reports the width it was enlarged from. A native master
 * reports its own width. An `unverified` file reports whatever bound was given
 * and otherwise nothing — deliberately NOT its pixel width, because the whole
 * point of `unverified` is that nobody has vouched for that number.
 */
export function effectiveNativeDetailWidth(
  declaration: NativeDetailDeclaration,
  pixelWidth: number,
): number | null {
  switch (declaration.state) {
    case "native":
      return pixelWidth;
    case "declared-upscale":
      return declaration.nativeDetailWidth ?? null;
    case "unverified":
      return declaration.nativeDetailWidth ?? null;
  }
}

/** Whether this target class may ever be painted as a runtime plate. */
export function targetClassShips(targetClass: AssetTargetClass): boolean {
  return targetClass !== "reference";
}

/**
 * The whole intake judgement for one candidate, as a value.
 *
 * Nothing here reads a filename to decide anything that matters. Naming
 * conventions are a convenience for humans and a source of confident errors for
 * machines; the lineage a submitter DECLARED is the only input that carries
 * authority.
 */
export function evaluateEnvironmentMasterIntake(
  candidate: EnvironmentMasterCandidate,
  measured: MeasuredCandidate | null,
): EnvironmentMasterIntakeRecord {
  const findings: IntakeFinding[] = [];
  const { lineage } = candidate;
  const detail = lineage.nativeDetail;

  if (!ASSET_LINEAGE_CLASSES.includes(lineage.lineageClass)) {
    findings.push(
      finding(
        "lineage-class-unknown",
        "error",
        `Lineage class '${lineage.lineageClass}' is not one this pipeline recognises.`,
      ),
    );
  }

  const isDerivative =
    lineage.lineageClass === "external-upscale-derivative" ||
    lineage.lineageClass === "production-normalized";
  if (isDerivative && !lineage.sourceAssetId) {
    findings.push(
      finding(
        "derivative-without-parent",
        "error",
        `'${lineage.lineageClass}' must name the sourceAssetId it was derived from. A derivative that cannot name its parent is an unattributed file.`,
      ),
    );
  }

  // --- The declaration must be internally coherent -------------------------
  if (
    detail.state === "declared-upscale" &&
    detail.nativeDetailWidth === undefined
  ) {
    findings.push(
      finding(
        "upscale-without-declared-detail",
        "error",
        "A declared upscale must state the nativeDetailWidth its detail stops at. Without it the enlargement is untracked, which is the state this contract exists to prevent.",
      ),
    );
  }
  if (detail.state === "native" && detail.nativeDetailWidth !== undefined) {
    findings.push(
      finding(
        "native-claim-with-detail-width",
        "error",
        "A master claiming native detail must not also declare a nativeDetailWidth; its own width is the answer, and stating a second number invites the two to disagree.",
      ),
    );
  }
  if (
    lineage.lineageClass === "external-upscale-derivative" &&
    detail.state !== "declared-upscale"
  ) {
    findings.push(
      finding(
        "upscale-without-declared-detail",
        "error",
        `An external upscale derivative must declare nativeDetail.state 'declared-upscale'; '${detail.state}' would let an enlargement enter the library as native detail.`,
      ),
    );
  }

  if (measured === null) {
    findings.push(
      finding(
        "unreadable-dimensions",
        "error",
        "Dimensions could not be read, so no contract could be applied to this file.",
      ),
    );
    return {
      assetId: candidate.assetId,
      path: candidate.path,
      targetClass: candidate.targetClass,
      lineageClass: lineage.lineageClass,
      familyId: candidate.familyId ?? null,
      width: null,
      height: null,
      aspectRatio: null,
      format: "unknown",
      contentHash: "",
      byteLength: 0,
      hasAlphaChannel: null,
      hasVaryingAlpha: null,
      nativeDetailWidth: null,
      nativeDetailState: detail.state,
      derivationMethod: detail.derivationMethod ?? null,
      sourceAssetId: lineage.sourceAssetId ?? null,
      sourceWidth: lineage.sourceWidth ?? null,
      sourceHeight: lineage.sourceHeight ?? null,
      rightsStatus: lineage.rightsStatus ?? "unknown",
      disposition: "reject",
      findings,
    };
  }

  if (
    detail.nativeDetailWidth !== undefined &&
    detail.nativeDetailWidth > measured.width
  ) {
    findings.push(
      finding(
        "declared-detail-exceeds-width",
        "error",
        `Declared nativeDetailWidth ${detail.nativeDetailWidth}px exceeds the file's own ${measured.width}px. A file cannot carry more detail than it has pixels.`,
      ),
    );
  }

  const nativeDetailWidth = effectiveNativeDetailWidth(detail, measured.width);

  // --- Size contract, applied to plates only -------------------------------
  const ships = targetClassShips(candidate.targetClass);
  if (ships) {
    if (measured.width < ENVIRONMENT_MASTER_MINIMUM_WIDTH) {
      findings.push(
        finding(
          "master-width-below-minimum",
          "error",
          `Width ${measured.width}px is below the ${ENVIRONMENT_MASTER_MINIMUM_WIDTH}px absolute minimum for an environment master.`,
        ),
      );
    } else if (measured.width < ENVIRONMENT_MASTER_RECOMMENDED_WIDTH) {
      findings.push(
        finding(
          "master-width-below-recommendation",
          "warning",
          `Width ${measured.width}px clears the absolute minimum but is below the ${ENVIRONMENT_MASTER_RECOMMENDED_WIDTH}px recommendation; a 4096 tier will not survive a crop.`,
        ),
      );
    }

    if (
      nativeDetailWidth !== null &&
      nativeDetailWidth < ENVIRONMENT_MASTER_MINIMUM_WIDTH
    ) {
      findings.push(
        finding(
          "native-detail-below-minimum",
          "warning",
          `Real detail stops at ${nativeDetailWidth}px, below the ${ENVIRONMENT_MASTER_MINIMUM_WIDTH}px master minimum, even though the file is ${measured.width}px. This master is admissible with its lineage declared, but its top tiers will carry interpolated pixels and will say so.`,
        ),
      );
    }
    if (detail.state === "unverified") {
      findings.push(
        finding(
          "native-detail-unverified",
          "warning",
          "Nobody has vouched for the detail behind these pixels. The asset may be used, and every tier derived from it will report unverified detail rather than claiming its pixel width.",
        ),
      );
    }
  } else {
    findings.push(
      finding(
        "reference-only-cannot-ship",
        "note",
        "Catalogued as reference. It informs authoring and is never painted as a plate.",
      ),
    );
  }

  if ((lineage.rightsStatus ?? "unknown") === "unknown") {
    findings.push(
      finding(
        "rights-status-unknown",
        "warning",
        "Rights status is unknown and stays unknown. Visibility is not evidence of a licence.",
      ),
    );
  }
  if (measured.hasAlphaChannel === true && measured.hasVaryingAlpha === null) {
    findings.push(
      finding(
        "alpha-unverified",
        "note",
        "The file carries an alpha channel whose variation was not inspected.",
      ),
    );
  }

  const hasError = findings.some((entry) => entry.severity === "error");
  const disposition: IntakeDisposition = hasError
    ? "reject"
    : ships
      ? "production"
      : "reference";

  return {
    assetId: candidate.assetId,
    path: candidate.path,
    targetClass: candidate.targetClass,
    lineageClass: lineage.lineageClass,
    familyId: candidate.familyId ?? null,
    width: measured.width,
    height: measured.height,
    aspectRatio: round4(measured.width / measured.height),
    format: measured.format,
    contentHash: measured.contentHash,
    byteLength: measured.byteLength,
    hasAlphaChannel: measured.hasAlphaChannel,
    hasVaryingAlpha: measured.hasVaryingAlpha,
    nativeDetailWidth,
    nativeDetailState: detail.state,
    derivationMethod: detail.derivationMethod ?? null,
    sourceAssetId: lineage.sourceAssetId ?? null,
    sourceWidth: lineage.sourceWidth ?? null,
    sourceHeight: lineage.sourceHeight ?? null,
    rightsStatus: lineage.rightsStatus ?? "unknown",
    disposition,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export const ENVIRONMENT_INTAKE_TOOL = "environment-master-intake-v1";

export interface EnvironmentIntakeReport {
  readonly tool: string;
  readonly candidateCount: number;
  readonly productionCount: number;
  readonly referenceCount: number;
  readonly rejectCount: number;
  /** Ascending by assetId, so a rerun over the same inputs is byte-identical. */
  readonly records: readonly EnvironmentMasterIntakeRecord[];
}

export function buildEnvironmentIntakeReport(
  records: readonly EnvironmentMasterIntakeRecord[],
): EnvironmentIntakeReport {
  const ordered = [...records].sort((a, b) =>
    a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
  );
  return {
    tool: ENVIRONMENT_INTAKE_TOOL,
    candidateCount: ordered.length,
    productionCount: ordered.filter((r) => r.disposition === "production")
      .length,
    referenceCount: ordered.filter((r) => r.disposition === "reference").length,
    rejectCount: ordered.filter((r) => r.disposition === "reject").length,
    records: ordered,
  };
}
