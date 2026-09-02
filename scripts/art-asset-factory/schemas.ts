import type { CharacterComponentDefinition } from "../../src/presentation/character-components";

export type MeasurementConfidence =
  | "exact"
  | "plan-derived"
  | "specified"
  | "bounded-estimate"
  | "visual-estimate";

export type MeasurementSourceClass =
  "authoritative" | "secondary" | "historical" | "visual-estimate-support";

export type RightsStatus = "public-domain" | "licensed" | "owned" | "unknown";

export type RuntimeReleaseStatus = "unreleased" | "released";

export interface MeasurementValue {
  value: number; // missing must remain undefined, zero is distinct from missing
  confidence: MeasurementConfidence;
  source?: string;
}

export interface Dimensions {
  room_width?: MeasurementValue;
  room_length?: MeasurementValue;
  clear_height?: MeasurementValue;
  gallery_floor_height?: MeasurementValue;
  dais_height?: MeasurementValue;
  railing_height?: MeasurementValue;
  railing_module_width?: MeasurementValue;
  door_width?: MeasurementValue;
  door_height?: MeasurementValue;
  window_bay_width?: MeasurementValue;
  window_bay_height?: MeasurementValue;
  column_diameter_or_width?: MeasurementValue;
  aisle_width?: MeasurementValue;
  desk_spacing?: MeasurementValue;
  public_seat_pitch?: MeasurementValue;
  stage_platform_height?: MeasurementValue;
  floor_to_floor_height?: MeasurementValue;
  major_artwork_width?: MeasurementValue;
  major_artwork_height?: MeasurementValue;
  seated_capacity?: MeasurementValue;
  drawing_source_scale?: string;
}

/**
 * How a tier raster came to exist. Mirrors `RasterTierDerivation` in
 * `src/presentation/raster-tiers.ts`; the manifest keeps snake_case fields.
 */
export type RasterTierDerivationRecord =
  "native-master" | "deterministic-downscale" | "upscaled-development-fixture";

export interface RasterTierRecord {
  width: number;
  height: number;
  /** Repository-relative POSIX path under art/. */
  path: string;
  hash: string;
  derivation: RasterTierDerivationRecord;
  /**
   * Real detail this raster carries when it is less than `width`. Required for
   * an upscale, forbidden otherwise, so no tier can overstate its sharpness.
   */
  native_detail_width?: number;
}

/**
 * Whether an asset is held to the production master contract or is frozen
 * development fixture art. Fixture art is exempt from the master-dimension
 * minimums and must never be promoted to a production plate or component.
 */
export type ArtClass = "development-fixture" | "production";

export interface AssetManifestEntry {
  asset_id: string;
  asset_type: string;
  /** Defaults to "development-fixture" when absent. */
  art_class?: ArtClass;
  /**
   * Ordered raster tier ladder under one asset identity. The runtime selects
   * among these by viewport and device pixel ratio.
   */
  raster_tiers?: RasterTierRecord[];
  family_id?: string;
  jurisdiction_scope?: string;
  era_start?: number;
  era_end?: number;
  hero_asset: boolean;
  hero_justification?: string;
  reuse_allowed: boolean;
  source_refs?: string[];
  rights_note?: string;
  dimensions?: Dimensions;
  material_tokens?: string[];
  palette_tokens?: string[];
  fixed_or_modular?: "fixed" | "modular";
  variant_rules?: string;
  negative_constraints?: string[];
  approved_reference?: string;
  generation_status: "draft" | "approved" | "rejected" | "pending";
  qa_status: "approved" | "rejected" | "pending";
  runtime_release_status: RuntimeReleaseStatus;
  final_path?: string;
  hash?: string;
  requires_transparency?: boolean;
  /**
   * Present only when asset_type is "character-component". The definition
   * contract lives in src/presentation/character-components.ts so the art
   * validator and the runtime share one implementation.
   */
  component?: CharacterComponentDefinition;
}

export type {
  CharacterCatalogData,
  CharacterComponentDefinition,
} from "../../src/presentation/character-components";

export interface EnvironmentFamily {
  family_id: string;
  room_use_category: string;
  typical_proportion_rules: string;
  seating_dais_logic: string;
  public_member_separation: string;
  circulation_assumptions: string;
  camera_framing_guidance: string;
  ceiling_height_category: string;
  density_category: string;
  ornament_category: string;
  material_token_defaults?: string[];
  palette_token_defaults?: string[];
  lighting_family?: string;
  reusable_prop_slots?: string[];
  jurisdiction_delta_slots?: string[];
  event_layer_slots?: string[];
  negative_constraints?: string[];
  supporting_source_references?: string[];
  version_effective_era_notes?: string;
}

export interface JurisdictionDelta {
  delta_id: string;
  jurisdiction_identity: string;
  building_identity: string;
  room_identity: string;
  base_family_id: string;
  effective_era_start?: number;
  effective_era_end?: number;
  proportion_overrides?: string;
  desk_member_density?: string;
  gallery_presence_shape?: string;
  front_wall_dais_changes?: string;
  windows?: string;
  doors?: string;
  rails?: string;
  material_changes?: string[];
  palette_changes?: string[];
  distinctive_fixed_architecture_artifacts?: string[];
  flags_emblems_signage_overlays?: string[];
  temporary_or_renovation_state?: boolean;
  source_references?: string[];
  confidence?: string;
  notes?: string;
}

export interface ProvenanceEntry {
  provenance_id: string;
  asset_id?: string; // links to manifest if applicable
  source_url_or_path?: string;
  source_organization?: string;
  document_photo_plan_title?: string;
  access_retrieval_date?: string;
  publication_effective_date?: string;
  rights_license_status: RightsStatus;
  reference_type?: string;
  source_authority_category?: MeasurementSourceClass;

  // For generated outputs
  generator_tool?: string;
  generated_model_version?: string;
  prompt_spec_manifest_id?: string;
  generation_edit_date?: string;
  edits_performed?: string;
  output_hash_version?: string;
  approval_status?: "approved" | "rejected" | "pending";
}

export interface AssetManifest {
  assets: AssetManifestEntry[];
}

export interface EnvironmentFamiliesData {
  families: EnvironmentFamily[];
}

export interface JurisdictionDeltasData {
  deltas: JurisdictionDelta[];
}

export interface ProvenanceData {
  entries: ProvenanceEntry[];
}
