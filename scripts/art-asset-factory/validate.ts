import fs from "fs";
import path from "path";
import { hashArtFile, isArtContentHash } from "./content-hash";
import type {
  AssetManifest,
  AssetManifestEntry,
  EnvironmentFamiliesData,
  JurisdictionDeltasData,
  MeasurementConfidence,
  ProvenanceData,
  ProvenanceEntry,
} from "./schemas";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  runtimeEligibleAssetIds: string[];
}

export interface ArtValidationOptions {
  repositoryRoot?: string;
}

const VALID_CONFIDENCE_LEVELS: MeasurementConfidence[] = [
  "exact",
  "plan-derived",
  "specified",
  "bounded-estimate",
  "visual-estimate",
];

const VALID_RIGHTS_STATUS = ["public-domain", "licensed", "owned", "unknown"];
const VALID_APPROVAL_STATUS = ["approved", "rejected", "pending"];
const VALID_GENERATION_STATUS = ["draft", "approved", "rejected", "pending"];
const VALID_RUNTIME_RELEASE_STATUS = ["unreleased", "released"];

function hasRequiredRuntimeStates(asset: AssetManifestEntry): boolean {
  return (
    asset.generation_status === "approved" &&
    asset.qa_status === "approved" &&
    asset.runtime_release_status === "released"
  );
}

function resultWith(errors: string[]): ValidationResult {
  return { valid: false, errors, runtimeEligibleAssetIds: [] };
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function resolveValidFinalPath(
  asset: AssetManifestEntry,
  repositoryRoot: string,
  errors: string[],
): string | undefined {
  const declaredPath = asset.final_path as unknown;
  if (declaredPath === undefined) return undefined;
  if (typeof declaredPath !== "string" || declaredPath.trim().length === 0) {
    errors.push(
      `Asset '${asset.asset_id}' final_path must be a non-empty repository-relative path under art/.`,
    );
    return undefined;
  }

  if (
    path.isAbsolute(declaredPath) ||
    path.win32.isAbsolute(declaredPath) ||
    declaredPath.includes("\\")
  ) {
    errors.push(
      `Asset '${asset.asset_id}' final_path '${declaredPath}' must be a repository-relative POSIX path under art/.`,
    );
    return undefined;
  }

  if (declaredPath.split("/").includes("..")) {
    errors.push(
      `Asset '${asset.asset_id}' final_path '${declaredPath}' contains forbidden path traversal.`,
    );
    return undefined;
  }

  const artRoot = path.resolve(repositoryRoot, "art");
  const resolvedPath = path.resolve(repositoryRoot, declaredPath);
  if (!isPathInside(artRoot, resolvedPath)) {
    errors.push(
      `Asset '${asset.asset_id}' final_path '${declaredPath}' escapes the repository art root.`,
    );
    return undefined;
  }

  if (!fs.existsSync(resolvedPath)) {
    errors.push(
      `Asset '${asset.asset_id}' final_path '${declaredPath}' does not exist.`,
    );
    return undefined;
  }

  try {
    const realArtRoot = fs.realpathSync(artRoot);
    const realPath = fs.realpathSync(resolvedPath);
    if (!isPathInside(realArtRoot, realPath)) {
      errors.push(
        `Asset '${asset.asset_id}' final_path '${declaredPath}' resolves outside the repository art root.`,
      );
      return undefined;
    }
    if (!fs.statSync(realPath).isFile()) {
      errors.push(
        `Asset '${asset.asset_id}' final_path '${declaredPath}' is not a regular file.`,
      );
      return undefined;
    }
    return realPath;
  } catch {
    errors.push(
      `Asset '${asset.asset_id}' final_path '${declaredPath}' could not be safely resolved.`,
    );
    return undefined;
  }
}

function isAiGenerated(entry: ProvenanceEntry): boolean {
  return entry.reference_type?.trim().toLowerCase() === "ai-generated";
}

function isValidGenerationDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  return (
    new Date(value).toISOString().slice(0, 10) === match.slice(1).join("-")
  );
}

export function validateArtAssets(
  manifest: AssetManifest,
  familiesData: EnvironmentFamiliesData,
  deltasData: JurisdictionDeltasData,
  provenanceData: ProvenanceData,
  options: ArtValidationOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());

  if (
    !familiesData ||
    typeof familiesData !== "object" ||
    !Array.isArray(familiesData.families)
  ) {
    errors.push("Top-level structure error: 'families' is not an array.");
    return resultWith(errors);
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !Array.isArray(manifest.assets)
  ) {
    errors.push("Top-level structure error: 'assets' is not an array.");
    return resultWith(errors);
  }
  if (
    !deltasData ||
    typeof deltasData !== "object" ||
    !Array.isArray(deltasData.deltas)
  ) {
    errors.push("Top-level structure error: 'deltas' is not an array.");
    return resultWith(errors);
  }
  if (
    !provenanceData ||
    typeof provenanceData !== "object" ||
    !Array.isArray(provenanceData.entries)
  ) {
    errors.push(
      "Top-level structure error: 'entries' is not an array in provenance.",
    );
    return resultWith(errors);
  }

  const familyIds = new Set<string>();
  for (const family of familiesData.families) {
    if (!family.family_id) {
      errors.push("A family entry is missing its required 'family_id'.");
    } else {
      familyIds.add(family.family_id);
    }
  }

  const assetIds = new Set<string>();
  for (const asset of manifest.assets) {
    if (!asset.asset_id) continue;
    if (assetIds.has(asset.asset_id)) {
      errors.push(`Duplicate asset_id found: '${asset.asset_id}'.`);
    }
    assetIds.add(asset.asset_id);
  }

  const provenanceIds = new Set<string>();
  const provenanceByAsset = new Map<string, ProvenanceEntry[]>();
  for (const entry of provenanceData.entries) {
    if (!entry.provenance_id) {
      errors.push(
        "A provenance entry is missing its required 'provenance_id'.",
      );
    } else if (provenanceIds.has(entry.provenance_id)) {
      errors.push(`Duplicate provenance_id found: '${entry.provenance_id}'.`);
    } else {
      provenanceIds.add(entry.provenance_id);
    }

    if (!VALID_RIGHTS_STATUS.includes(entry.rights_license_status)) {
      errors.push(
        `Provenance '${entry.provenance_id}' has invalid rights_license_status '${entry.rights_license_status}'.`,
      );
    }
    if (
      entry.approval_status &&
      !VALID_APPROVAL_STATUS.includes(entry.approval_status)
    ) {
      errors.push(
        `Provenance '${entry.provenance_id}' has invalid approval_status '${entry.approval_status}'.`,
      );
    }
    if (entry.asset_id) {
      if (!assetIds.has(entry.asset_id)) {
        errors.push(
          `Provenance '${entry.provenance_id}' references missing asset_id '${entry.asset_id}'.`,
        );
      }
      const entries = provenanceByAsset.get(entry.asset_id) ?? [];
      entries.push(entry);
      provenanceByAsset.set(entry.asset_id, entries);
    }
  }

  for (const delta of deltasData.deltas) {
    if (!delta.delta_id) {
      errors.push("A delta entry is missing its required 'delta_id'.");
    }
    if (!delta.base_family_id || !familyIds.has(delta.base_family_id)) {
      errors.push(
        `Delta '${delta.delta_id}' references invalid base_family_id '${delta.base_family_id}'.`,
      );
    }
  }

  const assetHashes = new Map<string, string>();
  const runtimeReleaseCandidates: string[] = [];
  for (const asset of manifest.assets) {
    if (!asset.asset_id) {
      errors.push("Asset is missing required field 'asset_id'.");
      continue;
    }

    if (
      asset.asset_type === undefined ||
      asset.hero_asset === undefined ||
      asset.reuse_allowed === undefined ||
      asset.generation_status === undefined ||
      asset.qa_status === undefined ||
      asset.runtime_release_status === undefined
    ) {
      errors.push(
        `Asset '${asset.asset_id}' is missing one or more required fields (asset_type, hero_asset, reuse_allowed, generation_status, qa_status, runtime_release_status).`,
      );
    }

    if (
      asset.generation_status &&
      !VALID_GENERATION_STATUS.includes(asset.generation_status)
    ) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid generation_status '${asset.generation_status}'.`,
      );
    }
    if (asset.qa_status && !VALID_APPROVAL_STATUS.includes(asset.qa_status)) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid qa_status '${asset.qa_status}'.`,
      );
    }
    if (
      asset.runtime_release_status &&
      !VALID_RUNTIME_RELEASE_STATUS.includes(asset.runtime_release_status)
    ) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid runtime_release_status '${asset.runtime_release_status}'.`,
      );
    }

    if (asset.family_id && !familyIds.has(asset.family_id)) {
      errors.push(
        `Asset '${asset.asset_id}' references invalid family_id '${asset.family_id}'.`,
      );
    }
    if (asset.hero_asset && !asset.hero_justification) {
      errors.push(
        `Asset '${asset.asset_id}' is marked as hero_asset but lacks a hero_justification.`,
      );
    }

    if (asset.era_start !== undefined && asset.era_end !== undefined) {
      if (asset.era_start > asset.era_end) {
        errors.push(
          `Asset '${asset.asset_id}' has invalid era range: start (${asset.era_start}) is greater than end (${asset.era_end}).`,
        );
      }
    } else if (asset.era_start !== undefined || asset.era_end !== undefined) {
      errors.push(
        `Asset '${asset.asset_id}' has a one-sided era range. Both era_start and era_end must be defined, or both omitted.`,
      );
    }

    if (asset.dimensions) {
      for (const [key, dimension] of Object.entries(asset.dimensions)) {
        if (key === "drawing_source_scale") continue;
        const measure = dimension as {
          value?: number;
          confidence?: string;
          source?: string;
        };
        if (!measure) continue;

        if (
          measure.confidence &&
          !VALID_CONFIDENCE_LEVELS.includes(
            measure.confidence as MeasurementConfidence,
          )
        ) {
          errors.push(
            `Asset '${asset.asset_id}' dimension '${key}' has invalid confidence '${measure.confidence}'.`,
          );
        }
        if (measure.value !== undefined && !measure.confidence) {
          errors.push(
            `Asset '${asset.asset_id}' dimension '${key}' has a precise measurement but lacks valid confidence metadata.`,
          );
        }
        if (measure.value !== undefined && !measure.source) {
          errors.push(
            `Asset '${asset.asset_id}' dimension '${key}' has a precise measurement but lacks required source metadata.`,
          );
        }
        if (!measure.confidence) {
          errors.push(
            `Asset '${asset.asset_id}' dimension '${key}' is missing confidence.`,
          );
        }
      }
    }

    if (asset.hash) {
      if (assetHashes.has(asset.hash)) {
        errors.push(
          `Asset '${asset.asset_id}' has duplicate hash '${asset.hash}' (also used by '${assetHashes.get(asset.hash)}').`,
        );
      } else {
        assetHashes.set(asset.hash, asset.asset_id);
      }
    }

    const resolvedFinalPath = resolveValidFinalPath(
      asset,
      repositoryRoot,
      errors,
    );
    const linkedProvenance = provenanceByAsset.get(asset.asset_id) ?? [];
    const hasOrdinaryApproval =
      asset.generation_status === "approved" || asset.qa_status === "approved";

    if (hasOrdinaryApproval) {
      if (linkedProvenance.length === 0) {
        errors.push(
          `Asset '${asset.asset_id}' is marked as approved but lacks a provenance entry.`,
        );
      }
      if (!asset.final_path || !asset.hash) {
        errors.push(
          `Asset '${asset.asset_id}' is marked as approved but lacks a final_path or hash.`,
        );
      }
      if (
        linkedProvenance.some((entry) => entry.approval_status === "rejected")
      ) {
        errors.push(
          `Asset '${asset.asset_id}' is marked as approved but references rejected/anti-reference provenance.`,
        );
      }
    }

    if (asset.runtime_release_status === "released") {
      if (hasRequiredRuntimeStates(asset)) {
        runtimeReleaseCandidates.push(asset.asset_id);
      }

      if (
        asset.generation_status !== "approved" ||
        asset.qa_status !== "approved"
      ) {
        errors.push(
          `Asset '${asset.asset_id}' is runtime-released but generation_status and qa_status are not both approved.`,
        );
      }
      if (!asset.final_path) {
        errors.push(
          `Asset '${asset.asset_id}' is runtime-released but lacks a final_path.`,
        );
      }
      if (!asset.hash) {
        errors.push(
          `Asset '${asset.asset_id}' is runtime-released but lacks a content hash.`,
        );
      } else if (!isArtContentHash(asset.hash)) {
        errors.push(
          `Asset '${asset.asset_id}' runtime content hash must be a lowercase 64-character SHA-256 digest.`,
        );
      } else if (
        resolvedFinalPath &&
        hashArtFile(resolvedFinalPath) !== asset.hash
      ) {
        errors.push(
          `Asset '${asset.asset_id}' runtime content hash does not match its final file.`,
        );
      }

      if (linkedProvenance.length === 0) {
        errors.push(
          `Asset '${asset.asset_id}' is runtime-released but lacks required provenance.`,
        );
      } else if (
        !linkedProvenance.some((entry) => entry.approval_status === "approved")
      ) {
        errors.push(
          `Asset '${asset.asset_id}' is runtime-released but lacks approved provenance.`,
        );
      }

      for (const entry of linkedProvenance.filter(isAiGenerated)) {
        const requiredFields: Array<keyof ProvenanceEntry> = [
          "generator_tool",
          "generated_model_version",
          "prompt_spec_manifest_id",
          "generation_edit_date",
        ];
        const missingFields = requiredFields.filter((field) => {
          const value = entry[field];
          return typeof value !== "string" || value.trim().length === 0;
        });
        if (missingFields.length > 0) {
          errors.push(
            `AI-generated provenance '${entry.provenance_id}' for runtime asset '${asset.asset_id}' is missing required generation metadata: ${missingFields.join(", ")}.`,
          );
        } else if (
          !isValidGenerationDate(entry.generation_edit_date as string)
        ) {
          errors.push(
            `AI-generated provenance '${entry.provenance_id}' for runtime asset '${asset.asset_id}' has an invalid generation_edit_date.`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    runtimeEligibleAssetIds:
      errors.length === 0 ? runtimeReleaseCandidates : [],
  };
}
