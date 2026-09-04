/**
 * EXTERNAL ASSET PACK INTAKE.
 *
 * Somebody downloads a free pack, and the question is whether the project can
 * use it. Two things decide that, and they are independent: what the licence
 * permits, and whether the files are the kind of thing this renderer draws.
 *
 * The failure this contract exists to prevent is answering the second question
 * with enthusiasm and the first with a shrug. A CC0 pack of rigged 3D meshes is
 * perfectly licensed and completely unusable to a 2D compositor that has no
 * rigging step; a beautiful set of finished 2D plates with no licence file is
 * perfectly usable and legally unavailable. Both are common, and both look like
 * "assets we have" in a folder listing.
 *
 * So a pack gets ONE disposition, and it has to survive both questions:
 *
 * - `use-now`     — the licence is verified from a document in the archive AND
 *                   the pack contains finished art this renderer can draw.
 * - `archive`     — kept and catalogued; not usable as things stand. The
 *                   commonest reason is that turning it into art would need
 *                   rigging, posing or rendering that this project does not do.
 * - `reject`      — not admissible. Unverified rights are the usual cause, and
 *                   they are never upgraded by how good the art looks.
 *
 * Nothing here reads a file, and no pack's bytes enter the repository merely
 * by being recorded. A record is a statement about an archive that exists
 * somewhere else, identified by its own hash.
 */

// ---------------------------------------------------------------------------
// Licence
// ---------------------------------------------------------------------------

/**
 * How the licence claim was established.
 *
 * `archive-document` is the only answer that counts as verified: a file inside
 * the archive states the terms. A storefront page can change, a folder name is
 * not a grant, and "it was free" is not a licence.
 */
export type LicenceEvidenceKind =
  "archive-document" | "distribution-page" | "creator-statement" | "none";

export const LICENCE_EVIDENCE_KINDS: readonly LicenceEvidenceKind[] = [
  "archive-document",
  "distribution-page",
  "creator-statement",
  "none",
];

export interface ExternalPackLicence {
  /** SPDX identifier when the licence has one. Absent when rights are unknown. */
  readonly spdxId?: string;
  /** What the evidence actually says, quoted or closely paraphrased. */
  readonly statement: string;
  readonly evidence: LicenceEvidenceKind;
  /** Path inside the archive carrying the evidence, when there is one. */
  readonly evidencePath?: string;
  readonly attributionRequired: boolean;
  /** Named because CC0 still deserves a credit even where none is required. */
  readonly creator?: string;
}

/**
 * Whether the licence is established well enough to ship the bytes.
 *
 * Deliberately strict: only a document inside the archive counts. This mirrors
 * the repository rule that unknown rights stay unknown and are never inferred
 * from visibility.
 */
export function licenceIsVerified(licence: ExternalPackLicence): boolean {
  return (
    licence.evidence === "archive-document" &&
    licence.spdxId !== undefined &&
    licence.spdxId.length > 0
  );
}

// ---------------------------------------------------------------------------
// Contents
// ---------------------------------------------------------------------------

/**
 * What a group of files in the pack IS, in terms of what this project draws.
 *
 * `finished-2d-art` is the only category a 2D compositor can use directly. The
 * distinctions below it matter because they are the ones that get blurred:
 * a PBR base-colour map is a 2048x2048 PNG that looks like art in a file
 * listing and is an unwrapped UV atlas in fact, and a promotional render is a
 * picture of the asset rather than the asset.
 */
export type PackContentKind =
  /** Flat, finished raster or vector art that could become a plate or a part. */
  | "finished-2d-art"
  /** Colour/normal/roughness maps for a 3D surface. Not art on its own. */
  | "pbr-texture-map"
  /** Meshes, rigged or not. Needs a renderer this project does not have. */
  | "3d-model"
  /** Skeletal animation. Needs a rig, and then a renderer. */
  | "animation-clip"
  /** Marketing images of the pack: renders, wireframes, thumbnails, video. */
  | "promotional-render"
  /** Authoring project files: .blend, .spp, engine setup scenes. */
  | "source-project-file"
  | "licence-document"
  | "readme";

export const PACK_CONTENT_KINDS: readonly PackContentKind[] = [
  "finished-2d-art",
  "pbr-texture-map",
  "3d-model",
  "animation-clip",
  "promotional-render",
  "source-project-file",
  "licence-document",
  "readme",
];

/** Content kinds a 2D scene/character compositor can draw without a pipeline. */
export const DIRECTLY_USABLE_CONTENT_KINDS: readonly PackContentKind[] = [
  "finished-2d-art",
];

export interface PackContentGroup {
  readonly kind: PackContentKind;
  readonly fileCount: number;
  /** Extensions seen, lowercased and without a dot. */
  readonly extensions: readonly string[];
  /** One representative path inside the archive, for anyone checking. */
  readonly examplePath?: string;
  readonly note?: string;
}

// ---------------------------------------------------------------------------
// Disposition
// ---------------------------------------------------------------------------

export type ExternalPackDisposition = "use-now" | "archive" | "reject";

export const EXTERNAL_PACK_DISPOSITIONS: readonly ExternalPackDisposition[] = [
  "use-now",
  "archive",
  "reject",
];

/**
 * Why a pack is not being used, in the project's own vocabulary.
 *
 * `needs-rigging-or-render` is the standing operating rule: no rigging, no
 * Blender, no manual 3D posing, and no time spent extracting static pose art
 * out of an animation rig. A pack that needs any of those is honestly
 * unusable here however good it is.
 */
export type PackRefusalReason =
  | "rights-unverified"
  | "needs-rigging-or-render"
  | "no-finished-2d-art"
  | "style-mismatch"
  | "subject-unsuitable"
  | "superseded";

export const PACK_REFUSAL_REASONS: readonly PackRefusalReason[] = [
  "rights-unverified",
  "needs-rigging-or-render",
  "no-finished-2d-art",
  "style-mismatch",
  "subject-unsuitable",
  "superseded",
];

/** A file this project actually took from the pack. */
export interface HarvestedPackAsset {
  /** Path inside the archive. */
  readonly sourcePath: string;
  /** Repository-relative path it was copied to. */
  readonly repositoryPath: string;
  readonly contentHash: string;
  readonly note?: string;
}

export interface ExternalPackRecord {
  readonly packId: string;
  /** The name the pack gives itself. */
  readonly title: string;
  /** The archive as the user actually has it, which may not match the title. */
  readonly archiveFileName: string;
  readonly archiveByteLength: number;
  /** SHA-256 of the archive, so the record names one exact download. */
  readonly archiveSha256: string;
  readonly creator?: string;
  readonly sourceUrl?: string;
  readonly entryCount: number;
  readonly contents: readonly PackContentGroup[];
  readonly licence: ExternalPackLicence;
  readonly disposition: ExternalPackDisposition;
  /** Required unless the disposition is `use-now`. */
  readonly refusalReasons: readonly PackRefusalReason[];
  /** Free prose for a reader; never parsed. */
  readonly rationale: string;
  /** Empty for everything not harvested, which is the normal case. */
  readonly harvested: readonly HarvestedPackAsset[];
  readonly reviewedOn: string;
  readonly reviewedBy: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ExternalPackFindingCode =
  | "unknown-disposition"
  | "unknown-content-kind"
  | "unknown-refusal-reason"
  | "use-now-without-verified-licence"
  | "use-now-without-usable-content"
  | "refusal-without-reason"
  | "reason-on-use-now"
  | "harvest-without-verified-licence"
  | "harvest-from-refused-pack"
  | "harvest-outside-references"
  | "content-group-empty"
  | "duplicate-content-kind"
  | "missing-archive-identity";

export interface ExternalPackFinding {
  readonly code: ExternalPackFindingCode;
  readonly severity: "error" | "warning";
  readonly packId: string;
  readonly message: string;
}

export interface ExternalPackValidation {
  readonly valid: boolean;
  readonly findings: readonly ExternalPackFinding[];
}

function finding(
  code: ExternalPackFindingCode,
  severity: "error" | "warning",
  packId: string,
  message: string,
): ExternalPackFinding {
  return { code, severity, packId, message };
}

/**
 * Checks a pack record against the two questions it exists to answer.
 *
 * The interesting rules are the asymmetric ones. `use-now` has to earn both a
 * verified licence and at least one directly usable file; a refusal only has to
 * say why. That asymmetry is the point: the cost of wrongly archiving a good
 * pack is that someone re-reads the record later, and the cost of wrongly
 * using a bad one is shipping art the project has no right to.
 */
export function validateExternalPackRecord(
  record: ExternalPackRecord,
): ExternalPackValidation {
  const findings: ExternalPackFinding[] = [];
  const id = record.packId;

  if (!EXTERNAL_PACK_DISPOSITIONS.includes(record.disposition)) {
    findings.push(
      finding(
        "unknown-disposition",
        "error",
        id,
        `Disposition '${record.disposition}' is not one of ${EXTERNAL_PACK_DISPOSITIONS.join(", ")}.`,
      ),
    );
  }

  if (
    record.archiveSha256.length !== 64 ||
    !/^[0-9a-f]+$/.test(record.archiveSha256) ||
    record.archiveByteLength <= 0
  ) {
    findings.push(
      finding(
        "missing-archive-identity",
        "error",
        id,
        "A pack record names one exact download, so it needs that archive's SHA-256 and byte length.",
      ),
    );
  }

  const seenKinds = new Set<PackContentKind>();
  for (const group of record.contents) {
    if (!PACK_CONTENT_KINDS.includes(group.kind)) {
      findings.push(
        finding(
          "unknown-content-kind",
          "error",
          id,
          `Content kind '${group.kind}' is not one of ${PACK_CONTENT_KINDS.join(", ")}.`,
        ),
      );
      continue;
    }
    if (seenKinds.has(group.kind)) {
      findings.push(
        finding(
          "duplicate-content-kind",
          "error",
          id,
          `Content kind '${group.kind}' is grouped twice; one group per kind keeps the counts addable.`,
        ),
      );
    }
    seenKinds.add(group.kind);
    if (group.fileCount <= 0) {
      findings.push(
        finding(
          "content-group-empty",
          "error",
          id,
          `Content group '${group.kind}' declares no files; omit the group instead.`,
        ),
      );
    }
  }

  for (const reason of record.refusalReasons) {
    if (!PACK_REFUSAL_REASONS.includes(reason)) {
      findings.push(
        finding(
          "unknown-refusal-reason",
          "error",
          id,
          `Refusal reason '${reason}' is not one of ${PACK_REFUSAL_REASONS.join(", ")}.`,
        ),
      );
    }
  }

  const verified = licenceIsVerified(record.licence);
  const usableFiles = record.contents
    .filter((group) => DIRECTLY_USABLE_CONTENT_KINDS.includes(group.kind))
    .reduce((total, group) => total + group.fileCount, 0);

  if (record.disposition === "use-now") {
    if (!verified) {
      findings.push(
        finding(
          "use-now-without-verified-licence",
          "error",
          id,
          "A pack may only be used now when a document inside the archive states the licence. Unknown rights stay unknown.",
        ),
      );
    }
    if (usableFiles === 0) {
      findings.push(
        finding(
          "use-now-without-usable-content",
          "error",
          id,
          "A pack may only be used now when it contains finished 2D art. Texture maps, meshes, animation and promotional renders are not art this project can draw.",
        ),
      );
    }
    if (record.refusalReasons.length > 0) {
      findings.push(
        finding(
          "reason-on-use-now",
          "error",
          id,
          "A pack that is being used now cannot also carry refusal reasons.",
        ),
      );
    }
  } else if (record.refusalReasons.length === 0) {
    findings.push(
      finding(
        "refusal-without-reason",
        "error",
        id,
        `A '${record.disposition}' disposition must say why, in the project's own vocabulary.`,
      ),
    );
  }

  for (const asset of record.harvested) {
    if (!verified) {
      findings.push(
        finding(
          "harvest-without-verified-licence",
          "error",
          id,
          `'${asset.sourcePath}' was copied into the repository from a pack whose licence is not verified.`,
        ),
      );
    }
    if (record.disposition === "reject") {
      findings.push(
        finding(
          "harvest-from-refused-pack",
          "error",
          id,
          `'${asset.sourcePath}' was copied from a rejected pack.`,
        ),
      );
    }
    if (!asset.repositoryPath.startsWith("art/")) {
      findings.push(
        finding(
          "harvest-outside-references",
          "error",
          id,
          `'${asset.repositoryPath}' is outside art/; external cargo belongs under the art tree with the rest of the provenance.`,
        ),
      );
    }
  }

  return {
    valid: findings.every((entry) => entry.severity !== "error"),
    findings,
  };
}

export interface ExternalPackSummary {
  readonly packCount: number;
  readonly useNow: number;
  readonly archived: number;
  readonly rejected: number;
  readonly harvestedFileCount: number;
  /** Total files across every pack, so "we downloaded a lot" stays visible. */
  readonly inspectedFileCount: number;
}

export function summarizeExternalPacks(
  records: readonly ExternalPackRecord[],
): ExternalPackSummary {
  return {
    packCount: records.length,
    useNow: records.filter((r) => r.disposition === "use-now").length,
    archived: records.filter((r) => r.disposition === "archive").length,
    rejected: records.filter((r) => r.disposition === "reject").length,
    harvestedFileCount: records.reduce((n, r) => n + r.harvested.length, 0),
    inspectedFileCount: records.reduce((n, r) => n + r.entryCount, 0),
  };
}
