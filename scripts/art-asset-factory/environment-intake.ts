import fs from "fs";
import path from "path";

import {
  buildEnvironmentIntakeReport,
  evaluateEnvironmentMasterIntake,
  type AssetLineageClass,
  type AssetTargetClass,
  type EnvironmentIntakeReport,
  type EnvironmentMasterCandidate,
  type MeasuredCandidate,
  type NativeDetailState,
} from "../../src/authoring/asset-lineage";
import {
  createAssetBankEntry,
  createAssetBankManifest,
  type AssetBankManifest,
} from "../../src/authoring/asset-bank";
import { JpegStructureError, readJpegDimensions } from "./jpeg-dimensions";
import { hashArtFile } from "./content-hash";
import {
  pngHasAlphaChannel,
  pngHasVaryingAlpha,
  readPngHeader,
} from "./master-inventory";

/**
 * SYSTEM 1, filesystem half.
 *
 * Reads an INTAKE REQUEST — a JSON file in which a person has declared, for
 * each candidate, where it came from — measures the actual files, and emits a
 * deterministic intake report plus a seeded asset-bank manifest.
 *
 * The request file is the load-bearing part of the design. Intake does not
 * scan a folder and guess: it reads declarations. A file nobody has declared is
 * reported as undeclared rather than assigned a plausible lineage, because a
 * plausible lineage is exactly the thing this pipeline must never manufacture.
 * Filenames are used for nothing except finding the file on disk.
 */

export const ENVIRONMENT_INTAKE_REQUEST_VERSION = 1 as const;

export interface IntakeRequestCandidate {
  readonly asset_id: string;
  /** Path relative to the request file's own directory. */
  readonly file: string;
  readonly target_class: AssetTargetClass;
  readonly family_id?: string;
  readonly lineage_class: AssetLineageClass;
  readonly source_asset_id?: string;
  readonly source_width?: number;
  readonly source_height?: number;
  readonly native_detail_state: NativeDetailState;
  readonly native_detail_width?: number;
  readonly derivation_method?: string;
  readonly derivation_tool?: string;
  readonly rights_status?: "public-domain" | "licensed" | "owned" | "unknown";
  readonly approved_by?: string;
  readonly approval_note?: string;
}

export interface IntakeRequest {
  readonly requestVersion: number;
  readonly batchId: string;
  readonly candidates: readonly IntakeRequestCandidate[];
}

export class IntakeRequestError extends Error {}

export function parseIntakeRequest(json: string): IntakeRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new IntakeRequestError(
      `Intake request is not valid JSON: ${(cause as Error).message}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new IntakeRequestError("Intake request must be an object.");
  }
  const root = parsed as Record<string, unknown>;
  if (root.requestVersion !== ENVIRONMENT_INTAKE_REQUEST_VERSION) {
    throw new IntakeRequestError(
      `Intake request version ${String(root.requestVersion)} is not supported; this tool reads version ${ENVIRONMENT_INTAKE_REQUEST_VERSION}.`,
    );
  }
  if (typeof root.batchId !== "string" || root.batchId.length === 0) {
    throw new IntakeRequestError("Intake request must name a batchId.");
  }
  if (!Array.isArray(root.candidates)) {
    throw new IntakeRequestError(
      "Intake request must carry a 'candidates' array. Intake reads declarations; it does not scan a folder and infer lineage.",
    );
  }
  for (const [index, candidate] of root.candidates.entries()) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).asset_id !== "string" ||
      typeof (candidate as Record<string, unknown>).file !== "string"
    ) {
      throw new IntakeRequestError(
        `Candidate at index ${index} must declare at least 'asset_id' and 'file'.`,
      );
    }
  }
  return parsed as IntakeRequest;
}

/** Measures PNG/JPEG; malformed JPEGs throw a reportable structural error. */
export function measureCandidateFile(
  filePath: string,
): MeasuredCandidate | null {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const header = readPngHeader(buffer);
  if (!header) {
    // A suffix cannot establish a format. JPEG-looking paths with other bytes
    // are an explicit structural failure; valid JPEGs must also name JPEG.
    const extension = path.extname(filePath).toLowerCase();
    const jpegExtension = extension === ".jpg" || extension === ".jpeg";
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      if (jpegExtension)
        throw new JpegStructureError("JPEG structure: missing SOI signature.");
      return null;
    }
    if (!jpegExtension)
      throw new JpegStructureError(
        "JPEG structure: signature conflicts with file extension.",
      );
    const dimensions = readJpegDimensions(buffer);
    return {
      ...dimensions,
      byteLength: buffer.length,
      format: "jpg",
      contentHash: hashArtFile(filePath),
      hasAlphaChannel: false,
      hasVaryingAlpha: false,
    };
  }
  const hasAlphaChannel = pngHasAlphaChannel(header.colorType);
  return {
    width: header.width,
    height: header.height,
    byteLength: buffer.length,
    format: path.extname(filePath).replace(/^\./, "").toLowerCase(),
    contentHash: hashArtFile(filePath),
    hasAlphaChannel,
    hasVaryingAlpha: hasAlphaChannel
      ? pngHasVaryingAlpha(buffer, header)
      : false,
  };
}

function toCandidate(
  declared: IntakeRequestCandidate,
  repoRelativePath: string,
): EnvironmentMasterCandidate {
  return {
    assetId: declared.asset_id,
    path: repoRelativePath,
    targetClass: declared.target_class,
    ...(declared.family_id !== undefined
      ? { familyId: declared.family_id }
      : {}),
    lineage: {
      lineageClass: declared.lineage_class,
      ...(declared.source_asset_id !== undefined
        ? { sourceAssetId: declared.source_asset_id }
        : {}),
      ...(declared.source_width !== undefined
        ? { sourceWidth: declared.source_width }
        : {}),
      ...(declared.source_height !== undefined
        ? { sourceHeight: declared.source_height }
        : {}),
      nativeDetail: {
        state: declared.native_detail_state,
        ...(declared.native_detail_width !== undefined
          ? { nativeDetailWidth: declared.native_detail_width }
          : {}),
        ...(declared.derivation_method !== undefined
          ? { derivationMethod: declared.derivation_method }
          : {}),
        ...(declared.derivation_tool !== undefined
          ? { derivationTool: declared.derivation_tool }
          : {}),
      },
      ...(declared.rights_status !== undefined
        ? { rightsStatus: declared.rights_status }
        : {}),
      ...(declared.approved_by !== undefined
        ? { approvedBy: declared.approved_by }
        : {}),
      ...(declared.approval_note !== undefined
        ? { approvalNote: declared.approval_note }
        : {}),
    },
  };
}

export interface EnvironmentIntakeResult {
  readonly report: EnvironmentIntakeReport;
  /** A seeded asset bank, every judgement still unassessed. */
  readonly assetBank: AssetBankManifest;
  /**
   * Files present in the candidate directory that no declaration mentions.
   * Reported, never adopted: intake will not invent a lineage for a stray file.
   */
  readonly undeclaredFiles: readonly string[];
}

const MEDIA_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function listMediaFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const found: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        found.push(full);
      }
    }
  };
  walk(directory);
  return found;
}

/**
 * Runs intake for one request file.
 *
 * `repositoryRoot` only shapes the paths written into the report, so the
 * artefact is portable between checkouts.
 */
export function runEnvironmentIntake(
  requestPath: string,
  repositoryRoot: string,
): EnvironmentIntakeResult {
  const resolvedRequestPath = path.resolve(requestPath);
  const requestDirectory = path.dirname(resolvedRequestPath);
  const request = parseIntakeRequest(
    fs.readFileSync(resolvedRequestPath, "utf8"),
  );

  const declaredAbsolutePaths = new Set<string>();
  const records = request.candidates.map((declared) => {
    const absolute = path.resolve(requestDirectory, declared.file);
    declaredAbsolutePaths.add(absolute);
    const repoRelative = path
      .relative(repositoryRoot, absolute)
      .replace(/\\/g, "/");
    const candidate = toCandidate(declared, repoRelative);
    try {
      return evaluateEnvironmentMasterIntake(
        candidate,
        measureCandidateFile(absolute),
      );
    } catch (error) {
      if (!(error instanceof JpegStructureError)) throw error;
      const record = evaluateEnvironmentMasterIntake(candidate, null);
      return {
        ...record,
        findings: record.findings.map((finding) =>
          finding.code === "unreadable-dimensions"
            ? { ...finding, message: error.message }
            : finding,
        ),
      };
    }
  });

  const report = buildEnvironmentIntakeReport(records);

  const assetBank = createAssetBankManifest(
    request.batchId,
    report.records.map((record) =>
      createAssetBankEntry({
        entryId: record.assetId,
        proposedFilename: path.basename(record.path),
        sourcePath: record.path,
        ...(record.contentHash ? { contentHash: record.contentHash } : {}),
        ...(record.width !== null ? { width: record.width } : {}),
        ...(record.height !== null ? { height: record.height } : {}),
        ...(record.familyId !== null ? { sceneFamilyId: record.familyId } : {}),
      }),
    ),
    "Seeded by environment intake. Every judgement is unassessed until a reviewer or an external QA pass fills it in.",
  );

  const undeclaredFiles = listMediaFiles(requestDirectory)
    .filter((file) => !declaredAbsolutePaths.has(file))
    .map((file) => path.relative(repositoryRoot, file).replace(/\\/g, "/"))
    .sort();

  return { report, assetBank, undeclaredFiles };
}
