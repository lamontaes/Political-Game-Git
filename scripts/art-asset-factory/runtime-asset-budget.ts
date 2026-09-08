import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ArtClass, AssetManifest } from "./schemas";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RASTER_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

export const RUNTIME_ASSET_BUDGET_SEMANTICS = {
  emittedBytesAreNetworkDemand: false,
  emittedFilesAreAutomaticallyPlayerReachable: false,
  noManifestMatchAuthorizesDeletion: false,
  sizeBudgetEnforced: false,
  explanation:
    "Emitted build bytes measure packaging output, not player network demand or runtime reachability. A missing manifest hash match is an investigation signal only and never authorizes pruning.",
} as const;

export type RuntimeAssetClassification =
  | "player-runtime"
  | "developer-evidence-qa"
  | "source-candidate-reference"
  | "unmatched-unclassified";

export interface RuntimeAssetAuditOptions {
  repositoryRoot: string;
  buildRoot?: string;
  manifestPath?: string;
  largestFileLimit?: number;
}

export interface ManifestRoleMatch {
  role: "final" | "tier";
  repositoryPath: string;
}

export interface ManifestIdentityMatch {
  assetId: string;
  assetType: string;
  artClass: ArtClass | "unspecified";
  runtimeReleaseStatus: "released" | "unreleased";
  roles: ManifestRoleMatch[];
}

export interface EmittedRasterAuditRow {
  emittedPath: string;
  byteSize: number;
  contentHash: string;
  manifestMatches: ManifestIdentityMatch[];
  repositorySourcePaths: string[];
  classification: RuntimeAssetClassification;
  classificationReason: string;
  knownPlayerRuntimeMaterial: boolean;
  developerEvidenceQa: boolean;
  sourceCandidateReference: boolean;
  unmatchedUnclassified: boolean;
  inPruningInvestigationPool: boolean;
}

export interface ByteFileRollup {
  files: number;
  bytes: number;
}

export interface ClassificationRollup extends ByteFileRollup {
  classification: RuntimeAssetClassification;
}

export interface RuntimeAssetAuditReport {
  schemaVersion: 1;
  inputs: {
    buildRoot: string;
    manifestPath: string;
    repositoryArtRoot: string;
    rasterExtensions: string[];
  };
  semantics: typeof RUNTIME_ASSET_BUDGET_SEMANTICS;
  budget: {
    approvedLimitBytes: null;
    enforced: false;
    status: "not-evaluated-no-approved-budget";
  };
  totals: {
    emitted: ByteFileRollup;
    rasters: ByteFileRollup;
    manifestHashMatchedFinalOrTier: ByteFileRollup;
    noManifestHashMatch: ByteFileRollup;
    classifications: Record<RuntimeAssetClassification, ByteFileRollup>;
  };
  largestRasterFiles: EmittedRasterAuditRow[];
  largestClassificationGroups: ClassificationRollup[];
  largestInvestigationGroups: ClassificationRollup[];
  pruningInvestigationPool: EmittedRasterAuditRow[];
  rasters: EmittedRasterAuditRow[];
}

interface FileRecord {
  absolutePath: string;
  relativePath: string;
  byteSize: number;
}

interface ManifestHashIdentity {
  assetId: string;
  assetType: string;
  artClass: ArtClass | "unspecified";
  runtimeReleaseStatus: "released" | "unreleased";
  role: "final" | "tier";
  repositoryPath: string;
  hash: string;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function relativeToRepository(repositoryRoot: string, target: string): string {
  const relative = path.relative(repositoryRoot, target);
  return relative === "" ? "." : toPosix(relative);
}

/**
 * Canonical containment predicate for production-audit inputs.
 *
 * Both arguments must already be absolute and fully resolved (symlinks
 * included) so that traversal and symlink escapes cannot regain access outside
 * the repository. String prefix comparison is deliberately avoided: a sibling
 * directory such as `<root>-external` shares a textual prefix with the root
 * without being contained by it.
 */
function isRepositoryContained(
  repositoryRoot: string,
  target: string,
): boolean {
  const relative = path.relative(repositoryRoot, target);
  if (relative === "") return true;
  if (path.isAbsolute(relative)) return false;
  return !relative.split(path.sep).includes("..");
}

function resolveRealPath(target: string, label: string): string {
  try {
    return fs.realpathSync(target);
  } catch {
    throw new Error(`${label} does not exist: ${target}`);
  }
}

function assertDirectory(realPath: string, label: string): void {
  if (!fs.statSync(realPath).isDirectory()) {
    throw new Error(`${label} is not a directory: ${realPath}`);
  }
}

function assertContained(
  repositoryRoot: string,
  realPath: string,
  label: string,
): void {
  if (!isRepositoryContained(repositoryRoot, realPath)) {
    throw new Error(
      `${label} must stay inside the repository root '${repositoryRoot}': '${realPath}' is outside it.`,
    );
  }
}

/**
 * Resolve the repository root itself. Every later containment decision is made
 * against this fully resolved path.
 */
function resolveRepositoryRoot(value: string): string {
  const realPath = resolveRealPath(path.resolve(value), "Repository root");
  assertDirectory(realPath, "Repository root");
  return realPath;
}

function resolveContainedDirectory(
  repositoryRoot: string,
  value: string,
  label: string,
): string {
  const realPath = resolveRealPath(path.resolve(repositoryRoot, value), label);
  assertContained(repositoryRoot, realPath, label);
  assertDirectory(realPath, label);
  return realPath;
}

function resolveContainedFile(
  repositoryRoot: string,
  value: string,
  label: string,
): string {
  const realPath = resolveRealPath(path.resolve(repositoryRoot, value), label);
  assertContained(repositoryRoot, realPath, label);
  if (!fs.statSync(realPath).isFile()) {
    throw new Error(`${label} is not a regular file: ${realPath}`);
  }
  return realPath;
}

function enumerateFiles(root: string, rejectSymlinks: boolean): FileRecord[] {
  const files: FileRecord[] = [];

  function walk(directory: string): void {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareText(left.name, right.name));

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        if (rejectSymlinks) {
          throw new Error(
            `Symlinks are not allowed in audited build output: ${absolutePath}`,
          );
        }
        continue;
      }
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        files.push({
          absolutePath,
          relativePath: toPosix(path.relative(root, absolutePath)),
          byteSize: fs.statSync(absolutePath).size,
        });
      }
    }
  }

  walk(root);
  return files.sort((left, right) =>
    compareText(left.relativePath, right.relativePath),
  );
}

function isRaster(filePath: string): boolean {
  return RASTER_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function hashFile(filePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function loadManifest(manifestPath: string): AssetManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read asset manifest '${manifestPath}': ${String(error)}`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { assets?: unknown }).assets)
  ) {
    throw new Error(
      `Asset manifest '${manifestPath}' must contain an assets array.`,
    );
  }
  return parsed as AssetManifest;
}

function validateManifestPath(value: string, label: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`${label} must be a repository-relative path: '${value}'.`);
  }
  return normalized;
}

function validateManifestHash(value: string, label: string): string {
  if (!SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function collectManifestIdentities(
  manifest: AssetManifest,
): ManifestHashIdentity[] {
  const identities: ManifestHashIdentity[] = [];

  for (const asset of manifest.assets) {
    const artClass = asset.art_class ?? "unspecified";
    const releaseStatus = asset.runtime_release_status;

    if (asset.final_path !== undefined || asset.hash !== undefined) {
      if (asset.final_path === undefined || asset.hash === undefined) {
        throw new Error(
          `Asset '${asset.asset_id}' must declare final_path and hash together.`,
        );
      }
      identities.push({
        assetId: asset.asset_id,
        assetType: asset.asset_type,
        artClass,
        runtimeReleaseStatus: releaseStatus,
        role: "final",
        repositoryPath: validateManifestPath(
          asset.final_path,
          `Asset '${asset.asset_id}' final_path`,
        ),
        hash: validateManifestHash(
          asset.hash,
          `Asset '${asset.asset_id}' hash`,
        ),
      });
    }

    for (const [tierIndex, tier] of (asset.raster_tiers ?? []).entries()) {
      identities.push({
        assetId: asset.asset_id,
        assetType: asset.asset_type,
        artClass,
        runtimeReleaseStatus: releaseStatus,
        role: "tier",
        repositoryPath: validateManifestPath(
          tier.path,
          `Asset '${asset.asset_id}' raster tier ${tierIndex} path`,
        ),
        hash: validateManifestHash(
          tier.hash,
          `Asset '${asset.asset_id}' raster tier ${tierIndex} hash`,
        ),
      });
    }
  }

  return identities.sort((left, right) =>
    compareText(
      `${left.hash}\0${left.assetId}\0${left.role}\0${left.repositoryPath}`,
      `${right.hash}\0${right.assetId}\0${right.role}\0${right.repositoryPath}`,
    ),
  );
}

function buildRepositoryHashIndex(artRoot: string): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const file of enumerateFiles(artRoot, false)) {
    if (!isRaster(file.relativePath)) continue;
    const hash = hashFile(file.absolutePath);
    const repositoryPath = `art/${file.relativePath}`;
    const paths = index.get(hash) ?? [];
    paths.push(repositoryPath);
    index.set(hash, paths);
  }
  for (const paths of index.values()) paths.sort(compareText);
  return index;
}

function validateManifestFiles(
  repositoryRoot: string,
  identities: ManifestHashIdentity[],
): void {
  const checked = new Set<string>();
  for (const identity of identities) {
    const key = `${identity.repositoryPath}\0${identity.hash}`;
    if (checked.has(key)) continue;
    checked.add(key);

    const absolutePath = path.resolve(repositoryRoot, identity.repositoryPath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(
        `Manifest identity path does not exist as a file: '${identity.repositoryPath}'.`,
      );
    }
    // Resolve symlinks before the containment decision so a repository-relative
    // link cannot point the audit at a file outside the repository.
    const realPath = fs.realpathSync(absolutePath);
    if (!isRepositoryContained(repositoryRoot, realPath)) {
      throw new Error(
        `Manifest path escapes the repository: '${identity.repositoryPath}'.`,
      );
    }
    const actualHash = hashFile(realPath);
    if (actualHash !== identity.hash) {
      throw new Error(
        `Manifest hash mismatch for '${identity.repositoryPath}': declared ${identity.hash}, actual ${actualHash}.`,
      );
    }
  }
}

function groupManifestMatches(
  identities: ManifestHashIdentity[],
): Map<string, ManifestIdentityMatch[]> {
  const byHash = new Map<string, ManifestHashIdentity[]>();
  for (const identity of identities) {
    const matches = byHash.get(identity.hash) ?? [];
    matches.push(identity);
    byHash.set(identity.hash, matches);
  }

  const grouped = new Map<string, ManifestIdentityMatch[]>();
  for (const [hash, matches] of byHash) {
    const byAsset = new Map<string, ManifestIdentityMatch>();
    for (const match of matches) {
      const existing = byAsset.get(match.assetId);
      if (existing) {
        if (
          !existing.roles.some(
            (role) =>
              role.role === match.role &&
              role.repositoryPath === match.repositoryPath,
          )
        ) {
          existing.roles.push({
            role: match.role,
            repositoryPath: match.repositoryPath,
          });
        }
      } else {
        byAsset.set(match.assetId, {
          assetId: match.assetId,
          assetType: match.assetType,
          artClass: match.artClass,
          runtimeReleaseStatus: match.runtimeReleaseStatus,
          roles: [{ role: match.role, repositoryPath: match.repositoryPath }],
        });
      }
    }
    const result = [...byAsset.values()];
    for (const match of result) {
      match.roles.sort((left, right) =>
        compareText(
          `${left.role}\0${left.repositoryPath}`,
          `${right.role}\0${right.repositoryPath}`,
        ),
      );
    }
    result.sort((left, right) => compareText(left.assetId, right.assetId));
    grouped.set(hash, result);
  }
  return grouped;
}

function isDeveloperPath(repositoryPath: string): boolean {
  return (
    repositoryPath.startsWith("art/qa/") ||
    repositoryPath.startsWith("art/fixtures/") ||
    repositoryPath.startsWith("art/generated/approved/dev-") ||
    repositoryPath.startsWith("art/references/derived_contact_sheets/")
  );
}

function isSourceCandidatePath(repositoryPath: string): boolean {
  return (
    repositoryPath.startsWith("art/references/") ||
    repositoryPath.startsWith("art/generated/candidates/") ||
    repositoryPath.startsWith("art/generated/draft/") ||
    repositoryPath.startsWith("art/generated/rejected/") ||
    repositoryPath.startsWith("art/intake/")
  );
}

function classifyRaster(
  manifestMatches: ManifestIdentityMatch[],
  repositorySourcePaths: string[],
): Pick<
  EmittedRasterAuditRow,
  | "classification"
  | "classificationReason"
  | "knownPlayerRuntimeMaterial"
  | "developerEvidenceQa"
  | "sourceCandidateReference"
  | "unmatchedUnclassified"
> {
  const knownPlayerRuntimeMaterial = manifestMatches.some(
    (match) =>
      match.artClass === "production" &&
      match.runtimeReleaseStatus === "released",
  );
  const developmentManifest = manifestMatches.some(
    (match) => match.artClass === "development-fixture",
  );
  const unreleasedManifest = manifestMatches.some(
    (match) => match.runtimeReleaseStatus === "unreleased",
  );
  const developerPath = repositorySourcePaths.some(isDeveloperPath);
  const sourceCandidatePath = repositorySourcePaths.some(isSourceCandidatePath);

  if (knownPlayerRuntimeMaterial) {
    return {
      classification: "player-runtime",
      classificationReason:
        "Content hash matches a production, runtime-released manifest final/tier identity.",
      knownPlayerRuntimeMaterial: true,
      developerEvidenceQa: developmentManifest || developerPath,
      sourceCandidateReference: unreleasedManifest || sourceCandidatePath,
      unmatchedUnclassified: false,
    };
  }

  if (developmentManifest || developerPath) {
    return {
      classification: "developer-evidence-qa",
      classificationReason: developmentManifest
        ? "Content hash matches a development-fixture manifest identity."
        : "Content hash matches a repository developer fixture, proof, or QA path.",
      knownPlayerRuntimeMaterial: false,
      developerEvidenceQa: true,
      sourceCandidateReference: unreleasedManifest || sourceCandidatePath,
      unmatchedUnclassified: false,
    };
  }

  if (unreleasedManifest || sourceCandidatePath) {
    return {
      classification: "source-candidate-reference",
      classificationReason: unreleasedManifest
        ? "Content hash matches an unreleased manifest identity."
        : "Content hash matches a repository source, candidate, reference, draft, rejected, or intake path.",
      knownPlayerRuntimeMaterial: false,
      developerEvidenceQa: false,
      sourceCandidateReference: true,
      unmatchedUnclassified: false,
    };
  }

  return {
    classification: "unmatched-unclassified",
    classificationReason:
      "No manifest final/tier hash or recognized repository source-path classification matched this emitted raster.",
    knownPlayerRuntimeMaterial: false,
    developerEvidenceQa: false,
    sourceCandidateReference: false,
    unmatchedUnclassified: true,
  };
}

function emptyClassifications(): Record<
  RuntimeAssetClassification,
  ByteFileRollup
> {
  return {
    "player-runtime": { files: 0, bytes: 0 },
    "developer-evidence-qa": { files: 0, bytes: 0 },
    "source-candidate-reference": { files: 0, bytes: 0 },
    "unmatched-unclassified": { files: 0, bytes: 0 },
  };
}

function sumRows(rows: EmittedRasterAuditRow[]): ByteFileRollup {
  return {
    files: rows.length,
    bytes: rows.reduce((total, row) => total + row.byteSize, 0),
  };
}

function groupRowsByClassification(
  rows: EmittedRasterAuditRow[],
): ClassificationRollup[] {
  const classifications = emptyClassifications();
  for (const row of rows) {
    const rollup = classifications[row.classification];
    rollup.files += 1;
    rollup.bytes += row.byteSize;
  }
  return (
    Object.entries(classifications) as Array<
      [RuntimeAssetClassification, ByteFileRollup]
    >
  )
    .map(([classification, rollup]) => ({ classification, ...rollup }))
    .filter((rollup) => rollup.files > 0)
    .sort(
      (left, right) =>
        right.bytes - left.bytes ||
        compareText(left.classification, right.classification),
    );
}

export function auditRuntimeAssets(
  options: RuntimeAssetAuditOptions,
): RuntimeAssetAuditReport {
  const largestFileLimit = options.largestFileLimit ?? 20;
  if (!Number.isSafeInteger(largestFileLimit) || largestFileLimit < 0) {
    throw new Error("largestFileLimit must be a non-negative safe integer.");
  }

  // A production audit is only trustworthy when every input it reports on is a
  // canonical repository input. External build roots and external manifests are
  // rejected outright rather than annotated, so a structurally normal-looking
  // report cannot describe files this repository does not own.
  const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
  const buildRoot = resolveContainedDirectory(
    repositoryRoot,
    options.buildRoot ?? "dist",
    "Build root",
  );
  const manifestPath = resolveContainedFile(
    repositoryRoot,
    options.manifestPath ?? "art/manifest/asset_manifest.json",
    "Asset manifest",
  );
  const artRoot = resolveContainedDirectory(
    repositoryRoot,
    "art",
    "Repository art root",
  );

  const buildFiles = enumerateFiles(buildRoot, true);
  const manifest = loadManifest(manifestPath);
  const manifestIdentities = collectManifestIdentities(manifest);
  validateManifestFiles(repositoryRoot, manifestIdentities);
  const manifestByHash = groupManifestMatches(manifestIdentities);
  const repositoryByHash = buildRepositoryHashIndex(artRoot);

  const rasterRows: EmittedRasterAuditRow[] = buildFiles
    .filter((file) => isRaster(file.relativePath))
    .map((file) => {
      const contentHash = hashFile(file.absolutePath);
      const manifestMatches = manifestByHash.get(contentHash) ?? [];
      const repositorySourcePaths = repositoryByHash.get(contentHash) ?? [];
      const classification = classifyRaster(
        manifestMatches,
        repositorySourcePaths,
      );
      return {
        emittedPath: file.relativePath,
        byteSize: file.byteSize,
        contentHash,
        manifestMatches,
        repositorySourcePaths,
        ...classification,
        inPruningInvestigationPool: manifestMatches.length === 0,
      };
    })
    .sort((left, right) => compareText(left.emittedPath, right.emittedPath));

  const classifications = emptyClassifications();
  for (const row of rasterRows) {
    const rollup = classifications[row.classification];
    rollup.files += 1;
    rollup.bytes += row.byteSize;
  }

  const manifestMatched = rasterRows.filter(
    (row) => row.manifestMatches.length > 0,
  );
  const investigationPool = rasterRows.filter(
    (row) => row.inPruningInvestigationPool,
  );

  const largestRasterFiles = [...rasterRows]
    .sort(
      (left, right) =>
        right.byteSize - left.byteSize ||
        compareText(left.emittedPath, right.emittedPath),
    )
    .slice(0, largestFileLimit);
  const largestClassificationGroups = groupRowsByClassification(rasterRows);
  const largestInvestigationGroups =
    groupRowsByClassification(investigationPool);

  return {
    schemaVersion: 1,
    inputs: {
      buildRoot: relativeToRepository(repositoryRoot, buildRoot),
      manifestPath: relativeToRepository(repositoryRoot, manifestPath),
      repositoryArtRoot: relativeToRepository(repositoryRoot, artRoot),
      rasterExtensions: [...RASTER_EXTENSIONS].sort(compareText),
    },
    semantics: RUNTIME_ASSET_BUDGET_SEMANTICS,
    budget: {
      approvedLimitBytes: null,
      enforced: false,
      status: "not-evaluated-no-approved-budget",
    },
    totals: {
      emitted: {
        files: buildFiles.length,
        bytes: buildFiles.reduce((total, file) => total + file.byteSize, 0),
      },
      rasters: sumRows(rasterRows),
      manifestHashMatchedFinalOrTier: sumRows(manifestMatched),
      noManifestHashMatch: sumRows(investigationPool),
      classifications,
    },
    largestRasterFiles,
    largestClassificationGroups,
    largestInvestigationGroups,
    pruningInvestigationPool: investigationPool,
    rasters: rasterRows,
  };
}

interface CliOptions extends RuntimeAssetAuditOptions {
  pretty: boolean;
}

function parseCliArguments(arguments_: string[]): CliOptions {
  const options: CliOptions = {
    repositoryRoot: process.cwd(),
    pretty: false,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--pretty") {
      options.pretty = true;
      continue;
    }
    const value = arguments_[index + 1];
    if (value === undefined) {
      throw new Error(`Missing value for ${argument}.`);
    }
    if (argument === "--root") options.repositoryRoot = value;
    else if (argument === "--build") options.buildRoot = value;
    else if (argument === "--manifest") options.manifestPath = value;
    else if (argument === "--largest") options.largestFileLimit = Number(value);
    else throw new Error(`Unknown argument: ${argument}`);
    index += 1;
  }

  return options;
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectExecution()) {
  try {
    const { pretty, ...options } = parseCliArguments(process.argv.slice(2));
    const report = auditRuntimeAssets(options);
    process.stdout.write(`${JSON.stringify(report, null, pretty ? 2 : 0)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
