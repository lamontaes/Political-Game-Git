/**
 * SYSTEM 7 — BATCH MANIFEST / ASSET BANK QA INPUT
 *
 * A normalized, machine-readable place to record what a batch of candidate art
 * actually is — so that a later multimodal QA pass, or a human with a contact
 * sheet, has a schema to write INTO rather than a document to invent.
 *
 * This PR deliberately performs no image-semantic inference. Nothing here looks
 * at pixels and decides whether a room has baked people in it or readable text
 * on the wall; doing that properly needs a model this repository does not have
 * and should not acquire as a side effect of building a schema. So every
 * judgement field starts at `unassessed`, and `unassessed` is a first-class
 * value rather than a stand-in for `false`.
 *
 * That distinction is the point. "We looked and there are no baked people" and
 * "nobody has looked" are different facts, and a batch of 200 generations is
 * exactly the situation where collapsing them lets an unreviewed asset ship.
 */

import { toCanonicalJson } from "./canonical-json";

/** Three-state answer to a question about an image nobody may have examined. */
export type Assessment = "yes" | "no" | "unassessed";

export const ASSESSMENTS: readonly Assessment[] = ["yes", "no", "unassessed"];

export type AssetBankDisposition =
  "production" | "reference" | "reject" | "undecided";

export const ASSET_BANK_DISPOSITIONS: readonly AssetBankDisposition[] = [
  "production",
  "reference",
  "reject",
  "undecided",
];

/** Who or what made the assessment, so a verdict's authority is legible. */
export type AssessmentSource =
  | "human-review"
  | "automated-measurement"
  | "external-multimodal-qa"
  | "unassessed";

export const ASSESSMENT_SOURCES: readonly AssessmentSource[] = [
  "human-review",
  "automated-measurement",
  "external-multimodal-qa",
  "unassessed",
];

/** Whether the candidate sits inside the project's established style family. */
export type StyleFamilyStatus = "in-family" | "out-of-family" | "unassessed";

/**
 * Named generation defects worth tracking across a batch. Free-form strings are
 * also accepted; this list exists so the common ones are spelled one way and
 * can be counted.
 */
export type ArtifactFlag =
  | "warped-geometry"
  | "impossible-perspective"
  | "melted-detail"
  | "duplicated-limb"
  | "malformed-lettering"
  | "seam-artifact"
  | "compression-mush"
  | "inconsistent-lighting"
  | "watermark-residue";

export const ARTIFACT_FLAGS: readonly ArtifactFlag[] = [
  "warped-geometry",
  "impossible-perspective",
  "melted-detail",
  "duplicated-limb",
  "malformed-lettering",
  "seam-artifact",
  "compression-mush",
  "inconsistent-lighting",
  "watermark-residue",
];

export interface AssetBankRegion {
  readonly regionId: string;
  readonly x_percent: number;
  readonly y_percent: number;
  readonly width_percent: number;
  readonly height_percent: number;
  readonly note?: string;
}

export interface AssetBankEntry {
  readonly entryId: string;
  /** The name this asset would take if it were promoted to production. */
  readonly proposedFilename: string;
  /** Repository-relative path of the candidate, when it is already on disk. */
  readonly sourcePath?: string;
  readonly contentHash?: string;
  readonly width?: number;
  readonly height?: number;

  readonly sceneFamilyId?: string;
  /** Free text: "eye-level three-quarter from the doorway". */
  readonly cameraAngle?: string;
  /** Whether this is a justified hero plate rather than reusable family art. */
  readonly heroSlot: Assessment;
  readonly heroJustification?: string;

  readonly floorUsable: Assessment;
  readonly seatUsable: Assessment;
  /** Named foreground objects that could serve as occluders. */
  readonly occluderCandidates: readonly string[];
  /** Regions the permanent shell would sit over. */
  readonly uiSafeRegions: readonly AssetBankRegion[];

  /** Whether people are painted into the plate, which blocks modular people. */
  readonly bakedPeople: Assessment;
  /** Whether the plate contains text a player could read. */
  readonly bakedReadableText: Assessment;

  readonly styleFamilyStatus: StyleFamilyStatus;
  readonly artifactFlags: readonly (ArtifactFlag | string)[];

  /** Semantic uses this plate could serve, by use id. */
  readonly reuseContexts: readonly string[];

  /** Entry id this is a byte-or-near duplicate of. */
  readonly duplicateOf?: string;
  readonly nearDuplicateOf?: readonly string[];

  readonly disposition: AssetBankDisposition;
  readonly assessedBy: AssessmentSource;
  readonly assessedAt?: string;
  readonly notes?: readonly string[];
}

export interface AssetBankManifest {
  readonly manifestVersion: 1;
  readonly batchId: string;
  readonly note?: string;
  /** Ascending by entryId. */
  readonly entries: readonly AssetBankEntry[];
}

export const ASSET_BANK_MANIFEST_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export interface AssetBankEntrySeed {
  readonly entryId: string;
  readonly proposedFilename: string;
  readonly sourcePath?: string;
  readonly contentHash?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sceneFamilyId?: string;
}

/**
 * A blank entry: every judgement `unassessed`, every list empty, disposition
 * `undecided`.
 *
 * This is what an intake run produces for a folder of candidates. It records
 * only measurable facts about the file, and leaves every question that needs
 * eyes explicitly unanswered.
 */
export function createAssetBankEntry(seed: AssetBankEntrySeed): AssetBankEntry {
  return {
    entryId: seed.entryId,
    proposedFilename: seed.proposedFilename,
    ...(seed.sourcePath !== undefined ? { sourcePath: seed.sourcePath } : {}),
    ...(seed.contentHash !== undefined
      ? { contentHash: seed.contentHash }
      : {}),
    ...(seed.width !== undefined ? { width: seed.width } : {}),
    ...(seed.height !== undefined ? { height: seed.height } : {}),
    ...(seed.sceneFamilyId !== undefined
      ? { sceneFamilyId: seed.sceneFamilyId }
      : {}),
    heroSlot: "unassessed",
    floorUsable: "unassessed",
    seatUsable: "unassessed",
    occluderCandidates: [],
    uiSafeRegions: [],
    bakedPeople: "unassessed",
    bakedReadableText: "unassessed",
    styleFamilyStatus: "unassessed",
    artifactFlags: [],
    reuseContexts: [],
    disposition: "undecided",
    assessedBy: "unassessed",
  };
}

export function createAssetBankManifest(
  batchId: string,
  entries: readonly AssetBankEntry[],
  note?: string,
): AssetBankManifest {
  return {
    manifestVersion: ASSET_BANK_MANIFEST_VERSION,
    batchId,
    ...(note !== undefined ? { note } : {}),
    entries: [...entries].sort((a, b) =>
      a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0,
    ),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AssetBankFindingCode =
  | "duplicate-entry-id"
  | "unknown-assessment"
  | "unknown-disposition"
  | "unknown-style-status"
  | "unknown-assessment-source"
  | "duplicate-reference-unknown"
  | "self-duplicate"
  | "production-while-unassessed"
  | "production-with-baked-people"
  | "production-with-readable-text"
  | "production-out-of-family"
  | "hero-without-justification"
  | "manifest-version-unsupported";

export interface AssetBankFinding {
  readonly code: AssetBankFindingCode;
  readonly severity: "error" | "warning";
  readonly subjectId: string;
  readonly message: string;
}

export interface AssetBankValidation {
  readonly valid: boolean;
  readonly findings: readonly AssetBankFinding[];
}

/**
 * Checks a manifest for shapes that would let unreviewed art reach production.
 *
 * The interesting rule is `production-while-unassessed`: an entry may not be
 * dispositioned `production` while the questions that decide whether it CAN be
 * production are still unanswered. It is the schema-level version of refusing
 * to sign off on something nobody read.
 */
export function validateAssetBankManifest(
  manifest: AssetBankManifest,
): AssetBankValidation {
  const findings: AssetBankFinding[] = [];
  const push = (
    code: AssetBankFindingCode,
    severity: "error" | "warning",
    subjectId: string,
    message: string,
  ) => findings.push({ code, severity, subjectId, message });

  if (manifest.manifestVersion !== ASSET_BANK_MANIFEST_VERSION) {
    push(
      "manifest-version-unsupported",
      "error",
      manifest.batchId,
      `Manifest version ${manifest.manifestVersion} is not supported; this tool reads version ${ASSET_BANK_MANIFEST_VERSION}.`,
    );
  }

  const ids = new Set<string>();
  const knownIds = new Set(manifest.entries.map((entry) => entry.entryId));

  for (const entry of manifest.entries) {
    const id = entry.entryId;
    if (ids.has(id)) {
      push(
        "duplicate-entry-id",
        "error",
        id,
        `Entry id '${id}' appears more than once.`,
      );
    }
    ids.add(id);

    for (const [label, value] of [
      ["heroSlot", entry.heroSlot],
      ["floorUsable", entry.floorUsable],
      ["seatUsable", entry.seatUsable],
      ["bakedPeople", entry.bakedPeople],
      ["bakedReadableText", entry.bakedReadableText],
    ] as const) {
      if (!ASSESSMENTS.includes(value)) {
        push(
          "unknown-assessment",
          "error",
          id,
          `Entry '${id}' field '${label}' has unknown assessment '${value}'.`,
        );
      }
    }
    if (!ASSET_BANK_DISPOSITIONS.includes(entry.disposition)) {
      push(
        "unknown-disposition",
        "error",
        id,
        `Entry '${id}' has unknown disposition '${entry.disposition}'.`,
      );
    }
    if (
      !(
        ["in-family", "out-of-family", "unassessed"] as readonly string[]
      ).includes(entry.styleFamilyStatus)
    ) {
      push(
        "unknown-style-status",
        "error",
        id,
        `Entry '${id}' has unknown style family status '${entry.styleFamilyStatus}'.`,
      );
    }
    if (!ASSESSMENT_SOURCES.includes(entry.assessedBy)) {
      push(
        "unknown-assessment-source",
        "error",
        id,
        `Entry '${id}' has unknown assessment source '${entry.assessedBy}'.`,
      );
    }

    if (entry.duplicateOf !== undefined) {
      if (entry.duplicateOf === id) {
        push(
          "self-duplicate",
          "error",
          id,
          `Entry '${id}' is recorded as a duplicate of itself.`,
        );
      } else if (!knownIds.has(entry.duplicateOf)) {
        push(
          "duplicate-reference-unknown",
          "warning",
          id,
          `Entry '${id}' is a duplicate of '${entry.duplicateOf}', which is not in this batch.`,
        );
      }
    }
    for (const near of entry.nearDuplicateOf ?? []) {
      if (near === id) {
        push(
          "self-duplicate",
          "error",
          id,
          `Entry '${id}' is recorded as a near-duplicate of itself.`,
        );
      } else if (!knownIds.has(near)) {
        push(
          "duplicate-reference-unknown",
          "warning",
          id,
          `Entry '${id}' is a near-duplicate of '${near}', which is not in this batch.`,
        );
      }
    }

    if (entry.disposition === "production") {
      const unassessed = (
        [
          ["bakedPeople", entry.bakedPeople],
          ["bakedReadableText", entry.bakedReadableText],
          ["floorUsable", entry.floorUsable],
        ] as const
      )
        .filter(([, value]) => value === "unassessed")
        .map(([label]) => label);
      if (unassessed.length > 0) {
        push(
          "production-while-unassessed",
          "error",
          id,
          `Entry '${id}' is dispositioned production while ${unassessed.join(", ")} ${unassessed.length === 1 ? "is" : "are"} still unassessed. Nobody has looked at the thing that decides whether it can be production.`,
        );
      }
      if (entry.bakedPeople === "yes") {
        push(
          "production-with-baked-people",
          "error",
          id,
          `Entry '${id}' has people painted into the plate, so modular people cannot be placed in it. It is not a production environment plate.`,
        );
      }
      if (entry.bakedReadableText === "yes") {
        push(
          "production-with-readable-text",
          "error",
          id,
          `Entry '${id}' contains readable baked text. Information belongs in a declared dynamic surface, never in the picture.`,
        );
      }
      if (entry.styleFamilyStatus === "out-of-family") {
        push(
          "production-out-of-family",
          "warning",
          id,
          `Entry '${id}' is out of the established style family but is dispositioned production; it will read as a different game beside its neighbours.`,
        );
      }
    }

    if (entry.heroSlot === "yes" && !entry.heroJustification) {
      push(
        "hero-without-justification",
        "warning",
        id,
        `Entry '${id}' claims a hero slot without a justification. Hero art is the exception to family reuse and has to earn it.`,
      );
    }
  }

  return { valid: !findings.some((f) => f.severity === "error"), findings };
}

// ---------------------------------------------------------------------------
// Import / export seam
// ---------------------------------------------------------------------------

/** Deterministic, sorted-key JSON. The same manifest always serializes alike. */
export function serializeAssetBankManifest(
  manifest: AssetBankManifest,
): string {
  return toCanonicalJson(
    createAssetBankManifest(manifest.batchId, manifest.entries, manifest.note),
  );
}

export class AssetBankParseError extends Error {}

function requireString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new AssetBankParseError(
      `${context} is missing a non-empty '${key}'.`,
    );
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function assessment(record: Record<string, unknown>, key: string): Assessment {
  const value = record[key];
  return typeof value === "string" && ASSESSMENTS.includes(value as Assessment)
    ? (value as Assessment)
    : "unassessed";
}

/**
 * Parses a manifest written by a person or by an external QA tool.
 *
 * Unrecognised judgement values degrade to `unassessed` rather than throwing:
 * an external tool inventing a fourth answer should not destroy a 200-entry
 * batch, and `unassessed` is the safe reading of "we do not understand what you
 * told us". Structural problems — a missing id, a non-object entry — do throw,
 * because there is nothing safe to assume there.
 */
export function parseAssetBankManifest(json: string): AssetBankManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new AssetBankParseError(
      `Asset bank manifest is not valid JSON: ${(cause as Error).message}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AssetBankParseError("Asset bank manifest must be an object.");
  }
  const root = parsed as Record<string, unknown>;
  const batchId = requireString(root, "batchId", "Asset bank manifest");
  const rawEntries = root.entries;
  if (!Array.isArray(rawEntries)) {
    throw new AssetBankParseError(
      "Asset bank manifest must carry an 'entries' array.",
    );
  }

  const entries = rawEntries.map((raw, index) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new AssetBankParseError(
        `Entry at index ${index} must be an object.`,
      );
    }
    const record = raw as Record<string, unknown>;
    const context = `Entry at index ${index}`;
    const entryId = requireString(record, "entryId", context);
    const disposition = record.disposition;
    const styleFamilyStatus = record.styleFamilyStatus;
    const assessedBy = record.assessedBy;

    const regions = Array.isArray(record.uiSafeRegions)
      ? record.uiSafeRegions
          .filter(
            (region): region is Record<string, unknown> =>
              typeof region === "object" && region !== null,
          )
          .map((region) => ({
            regionId: String(region.regionId ?? ""),
            x_percent: Number(region.x_percent ?? 0),
            y_percent: Number(region.y_percent ?? 0),
            width_percent: Number(region.width_percent ?? 0),
            height_percent: Number(region.height_percent ?? 0),
            ...(typeof region.note === "string" ? { note: region.note } : {}),
          }))
      : [];

    const entry: AssetBankEntry = {
      entryId,
      proposedFilename: requireString(record, "proposedFilename", context),
      ...(optionalString(record, "sourcePath") !== undefined
        ? { sourcePath: optionalString(record, "sourcePath")! }
        : {}),
      ...(optionalString(record, "contentHash") !== undefined
        ? { contentHash: optionalString(record, "contentHash")! }
        : {}),
      ...(optionalNumber(record, "width") !== undefined
        ? { width: optionalNumber(record, "width")! }
        : {}),
      ...(optionalNumber(record, "height") !== undefined
        ? { height: optionalNumber(record, "height")! }
        : {}),
      ...(optionalString(record, "sceneFamilyId") !== undefined
        ? { sceneFamilyId: optionalString(record, "sceneFamilyId")! }
        : {}),
      ...(optionalString(record, "cameraAngle") !== undefined
        ? { cameraAngle: optionalString(record, "cameraAngle")! }
        : {}),
      heroSlot: assessment(record, "heroSlot"),
      ...(optionalString(record, "heroJustification") !== undefined
        ? { heroJustification: optionalString(record, "heroJustification")! }
        : {}),
      floorUsable: assessment(record, "floorUsable"),
      seatUsable: assessment(record, "seatUsable"),
      occluderCandidates: stringArray(record, "occluderCandidates"),
      uiSafeRegions: regions,
      bakedPeople: assessment(record, "bakedPeople"),
      bakedReadableText: assessment(record, "bakedReadableText"),
      styleFamilyStatus:
        styleFamilyStatus === "in-family" ||
        styleFamilyStatus === "out-of-family"
          ? styleFamilyStatus
          : "unassessed",
      artifactFlags: stringArray(record, "artifactFlags"),
      reuseContexts: stringArray(record, "reuseContexts"),
      ...(optionalString(record, "duplicateOf") !== undefined
        ? { duplicateOf: optionalString(record, "duplicateOf")! }
        : {}),
      ...(Array.isArray(record.nearDuplicateOf)
        ? { nearDuplicateOf: stringArray(record, "nearDuplicateOf") }
        : {}),
      disposition:
        typeof disposition === "string" &&
        ASSET_BANK_DISPOSITIONS.includes(disposition as AssetBankDisposition)
          ? (disposition as AssetBankDisposition)
          : "undecided",
      assessedBy:
        typeof assessedBy === "string" &&
        ASSESSMENT_SOURCES.includes(assessedBy as AssessmentSource)
          ? (assessedBy as AssessmentSource)
          : "unassessed",
      ...(optionalString(record, "assessedAt") !== undefined
        ? { assessedAt: optionalString(record, "assessedAt")! }
        : {}),
      ...(Array.isArray(record.notes)
        ? { notes: stringArray(record, "notes") }
        : {}),
    };
    return entry;
  });

  return createAssetBankManifest(
    batchId,
    entries,
    optionalString(root, "note"),
  );
}

/** Counts by disposition, for a batch summary line. */
export function summarizeAssetBank(
  manifest: AssetBankManifest,
): Readonly<Record<AssetBankDisposition, number>> {
  const counts: Record<AssetBankDisposition, number> = {
    production: 0,
    reference: 0,
    reject: 0,
    undecided: 0,
  };
  for (const entry of manifest.entries) counts[entry.disposition] += 1;
  return counts;
}
