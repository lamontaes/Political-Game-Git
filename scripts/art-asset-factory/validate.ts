import fs from "fs";
import path from "path";
import imageSize from "image-size";
import {
  CHARACTER_COMPONENT_ASSET_TYPE,
  validateCharacterComponentLibrary,
} from "../../src/presentation/character-components";
import {
  evaluateMasterDimensions,
  masterRequirementFor,
} from "../../src/presentation/component-masters";
import { hashArtFile, isArtContentHash } from "./content-hash";
import type {
  AssetManifest,
  AssetManifestEntry,
  CharacterCatalogData,
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
  /**
   * Character catalog ledger. Required whenever the manifest declares any
   * character-component asset; an empty bootstrap catalog is valid.
   */
  characterCatalog?: CharacterCatalogData;
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
const VALID_ART_CLASS = ["development-fixture", "production"];
const VALID_TIER_DERIVATIONS = [
  "native-master",
  "deterministic-downscale",
  "upscaled-development-fixture",
];

function isAllowedStatus(
  value: unknown,
  allowedValues: readonly string[],
): value is string {
  return typeof value === "string" && allowedValues.includes(value);
}

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

    if (!isAllowedStatus(asset.generation_status, VALID_GENERATION_STATUS)) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid generation_status '${asset.generation_status}'.`,
      );
    }
    if (!isAllowedStatus(asset.qa_status, VALID_APPROVAL_STATUS)) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid qa_status '${asset.qa_status}'.`,
      );
    }
    if (
      !isAllowedStatus(
        asset.runtime_release_status,
        VALID_RUNTIME_RELEASE_STATUS,
      )
    ) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid runtime_release_status '${asset.runtime_release_status}'.`,
      );
    }

    if (
      asset.art_class !== undefined &&
      !isAllowedStatus(asset.art_class, VALID_ART_CLASS)
    ) {
      errors.push(
        `Asset '${asset.asset_id}' has invalid art_class '${asset.art_class}'.`,
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

  validateRasterTierLadders(manifest, repositoryRoot, errors);
  validateProductionComponentMasters(manifest, repositoryRoot, errors);

  validateCharacterComponents(
    manifest,
    options.characterCatalog,
    repositoryRoot,
    errors,
  );

  return {
    valid: errors.length === 0,
    errors,
    runtimeEligibleAssetIds:
      errors.length === 0 ? runtimeReleaseCandidates : [],
  };
}

/**
 * Modular character components are ordinary manifest assets and already pass
 * the release, hash, and provenance checks above. This adds the structural
 * component/catalog contract and checks each declared canvas against the real
 * raster when a final file exists.
 */
function validateCharacterComponents(
  manifest: AssetManifest,
  catalog: CharacterCatalogData | undefined,
  repositoryRoot: string,
  errors: string[],
): void {
  const componentEntries = manifest.assets.filter(
    (asset) =>
      asset.asset_type === CHARACTER_COMPONENT_ASSET_TYPE ||
      asset.component !== undefined,
  );
  if (componentEntries.length === 0 && catalog === undefined) return;
  if (catalog === undefined) {
    errors.push(
      `Manifest declares ${componentEntries.length} character component(s) but no character catalog was supplied.`,
    );
    return;
  }

  errors.push(...validateCharacterComponentLibrary(manifest.assets, catalog));

  for (const asset of componentEntries) {
    const canvas = asset.component?.canvas;
    if (!canvas || !asset.final_path) continue;
    const resolved = path.resolve(repositoryRoot, asset.final_path);
    if (!fs.existsSync(resolved)) continue; // reported by the path checks above
    try {
      const measured = imageSize(resolved);
      if (
        measured.width !== canvas.width ||
        measured.height !== canvas.height
      ) {
        errors.push(
          `Character component '${asset.asset_id}' declares canvas ${canvas.width}x${canvas.height} but its file is ${measured.width}x${measured.height}.`,
        );
      }
    } catch {
      errors.push(
        `Character component '${asset.asset_id}' final file could not be measured.`,
      );
    }
  }
}

/**
 * Raster tier ladders. A tier must exist on disk, measure exactly what it
 * claims, hash to what it claims, and be honest about how it came to be: an
 * upscale declares the detail it really carries, and no production asset may
 * carry an upscaled tier at all.
 */
function validateRasterTierLadders(
  manifest: AssetManifest,
  repositoryRoot: string,
  errors: string[],
): void {
  for (const asset of manifest.assets) {
    const tiers = asset.raster_tiers;
    if (!tiers) continue;
    if (!Array.isArray(tiers) || tiers.length === 0) {
      errors.push(
        `Asset '${asset.asset_id}' declares 'raster_tiers' but it is not a non-empty array.`,
      );
      continue;
    }

    const artClass = asset.art_class ?? "development-fixture";
    let previousWidth = 0;
    let previousAspect: number | null = null;
    let matchesFinalPath = false;

    for (const tier of tiers) {
      const label = `Asset '${asset.asset_id}' raster tier ${tier.width}`;
      if (
        !Number.isInteger(tier.width) ||
        !Number.isInteger(tier.height) ||
        tier.width <= 0 ||
        tier.height <= 0
      ) {
        errors.push(`${label} must declare positive integer dimensions.`);
        continue;
      }
      if (tier.width <= previousWidth) {
        errors.push(
          `${label} must be wider than the tier before it; a ladder is ascending and unique.`,
        );
      }
      previousWidth = tier.width;
      const aspect = tier.width / tier.height;
      if (
        previousAspect !== null &&
        Math.abs(aspect - previousAspect) > 0.005
      ) {
        errors.push(
          `${label} does not preserve the ladder's source aspect ratio.`,
        );
      }
      previousAspect = aspect;

      if (!isAllowedStatus(tier.derivation, VALID_TIER_DERIVATIONS)) {
        errors.push(`${label} has invalid derivation '${tier.derivation}'.`);
      }
      if (tier.derivation === "upscaled-development-fixture") {
        if (artClass === "production") {
          errors.push(
            `${label} is an upscale, which a production asset may never carry. The asset pipeline does not synthesize tiers.`,
          );
        }
        if (
          !Number.isInteger(tier.native_detail_width) ||
          (tier.native_detail_width ?? 0) <= 0 ||
          (tier.native_detail_width ?? 0) > tier.width
        ) {
          errors.push(
            `${label} is an upscale and must declare the native_detail_width it was enlarged from.`,
          );
        }
      } else if (tier.native_detail_width !== undefined) {
        errors.push(
          `${label} declares native_detail_width but is not an upscale.`,
        );
      }

      if (!isArtContentHash(tier.hash)) {
        errors.push(
          `${label} hash must be a lowercase 64-character SHA-256 digest.`,
        );
        continue;
      }

      const tierAsset: AssetManifestEntry = {
        ...asset,
        final_path: tier.path,
      };
      const resolved = resolveValidFinalPath(tierAsset, repositoryRoot, errors);
      if (!resolved) continue;
      if (hashArtFile(resolved) !== tier.hash) {
        errors.push(`${label} content hash does not match its file.`);
      }
      try {
        const measured = imageSize(resolved);
        if (measured.width !== tier.width || measured.height !== tier.height) {
          errors.push(
            `${label} declares ${tier.width}x${tier.height} but its file is ${measured.width}x${measured.height}.`,
          );
        }
      } catch {
        errors.push(`${label} file could not be measured.`);
      }
      if (asset.final_path === tier.path) {
        matchesFinalPath = true;
        if (asset.hash && asset.hash !== tier.hash) {
          errors.push(
            `${label} shares the asset's final_path but declares a different hash.`,
          );
        }
      }
    }

    if (asset.final_path && !matchesFinalPath) {
      errors.push(
        `Asset '${asset.asset_id}' declares a tier ladder that does not include its own final_path '${asset.final_path}'.`,
      );
    }
  }
}

/**
 * Production character components are held to the 10A master minimums. An
 * undersized master is rejected rather than enlarged: enlarging masters is what
 * put soft garments next to sharp bodies in the first place.
 *
 * Development fixture components are exempt from the dimension floor and say so
 * through `art_class`. They are never promoted into the production library.
 */
function validateProductionComponentMasters(
  manifest: AssetManifest,
  repositoryRoot: string,
  errors: string[],
): void {
  for (const asset of manifest.assets) {
    const component = asset.component;
    if (!component) continue;
    if ((asset.art_class ?? "development-fixture") !== "production") continue;
    if (!asset.final_path) continue;

    const resolved = path.resolve(repositoryRoot, asset.final_path);
    if (!fs.existsSync(resolved)) continue; // reported by the path checks

    let measured: { width?: number; height?: number };
    try {
      measured = imageSize(resolved);
    } catch {
      continue; // reported by the canvas check
    }
    if (measured.width === undefined || measured.height === undefined) continue;

    const verdict = evaluateMasterDimensions(
      component.kind,
      { width: measured.width, height: measured.height },
      component.pose_family,
    );
    if (!verdict.accepted) {
      errors.push(
        `Production character component '${asset.asset_id}' does not meet its master contract: ${verdict.reasons.join("; ")}. It would need a ${verdict.requiredUpscaleFactor.toFixed(2)}x enlargement, which the pipeline never performs.`,
      );
    }

    const requirement = masterRequirementFor(
      component.kind,
      component.pose_family,
    );
    if (
      component.canvas.width > measured.width ||
      component.canvas.height > measured.height
    ) {
      errors.push(
        `Production character component '${asset.asset_id}' declares a ${component.canvas.width}x${component.canvas.height} canvas larger than its ${measured.width}x${measured.height} file. ${requirement.note}`,
      );
    }
  }
}
