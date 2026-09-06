import type { MeasurementConfidence } from "../environment-scene-spec";

/** Content keys are open, dotted semantic keys, validated at catalog admission. */
export type ReferenceId = string;
export interface DateRange {
  /** Inclusive. Null means the actual boundary is unestablished, not infinity. */
  start: string | null;
  end: string | null;
}
export interface SourceReference {
  id: ReferenceId;
  title: string;
  url: string;
  sourceDate: string | null;
  kind: "research-authority" | "primary-reference";
  /** Research transcription does not assert acquisition of the cited drawings. */
  acquisition: "consumed-text" | "cited-not-acquired";
  rights: "unknown";
}
export interface SourceClaim {
  id: ReferenceId;
  sourceId: ReferenceId;
  locator: string;
  statement: string;
  sourceDate: string | null;
  confidence: "high" | "partial" | "unknown";
  verification: "research-transcribed" | "primary-verified" | "unverified";
  citedSourceIds: ReferenceId[];
  conflictingSourceIds: ReferenceId[];
  discrepancy: "none" | "unresolved" | "resolved" | "superseded";
  resolutionNote: string | null;
  supersededBy: ReferenceId | null;
  controls: "identity" | "location" | "geometry" | "use" | "appearance";
  renderBlocking: boolean;
}
export interface Referenced {
  id: ReferenceId;
  claimIds: ReferenceId[];
}
export interface CampusReference extends Referenced {
  name: string;
  jurisdictionId: ReferenceId;
  governmentId: ReferenceId;
}
export interface BuildingReference extends Referenced {
  name: string;
  campusId: ReferenceId | null;
  jurisdictionId: ReferenceId;
  governmentId: ReferenceId;
  address: string | null;
  ownerOperator: string | null;
  assetFamily: ReferenceId;
  baseGeometryFamily: ReferenceId;
  uniquenessClass: "unique" | "jurisdiction-variant" | "reusable-family";
  fixedInstitutionalFeatures: string[];
  visualAntiAssumptions: string[];
  referencePack: "pending" | "partial" | "strong-source-family";
  /** No art acquisition or release is implied by a strong source family. */
  extractedAssetStatus: "not-acquired";
}
export interface RoomReference extends Referenced {
  buildingId: ReferenceId;
  verifiedName: string;
  verifiedNumber: string | null;
  roomFunctionFamily: ReferenceId;
  fixedInstitutionalFeatures: string[];
  visualAntiAssumptions: string[];
}
export type GeometryValue =
  | { state: "unknown"; reason: string }
  | {
      state: "reported";
      magnitude:
        | { kind: "scalar"; value: number }
        | { kind: "range"; min: number; max: number };
      unit: "ft" | "in" | "m" | "sq-ft" | "degrees";
      /** Verbatim research evidence class, independent of verification readiness. */
      confidence: MeasurementConfidence;
    };
export interface MeasuredGeometry extends Referenced {
  subjectId: ReferenceId;
  dimension: ReferenceId;
  value: GeometryValue;
  primaryEvidence: "located" | "not-supplied";
  appliesTo: "room" | "building-context";
}
export type VenueState =
  | "normal"
  | "temporary"
  | "swing_space"
  | "construction"
  | "historic_only"
  | "ceremonial_only";
export interface VenueReference extends Referenced {
  buildingId: ReferenceId;
  /** Null is a building-level family, never a fabricated specific room. */
  roomId: ReferenceId | null;
  walkingTransitionGroup: ReferenceId | null;
}
export interface VenueEra extends Referenced {
  venueId: ReferenceId;
  effective: DateRange;
  /** Bounded evidence coverage; not a claim about opening/closing dates. */
  observedDuring: { start: string; end: string };
  currentEraStatus: "current-researched" | "historical-reference";
  state: VenueState;
  availability: "available" | "closed" | "unknown";
  publicAccessState:
    "public" | "screened" | "restricted" | "closed" | "unknown";
  securityState: "screening" | "restricted" | "unknown";
  note: string;
}
export interface SceneReference extends Referenced {
  venueId: ReferenceId;
  jurisdictionId: ReferenceId;
  governmentId: ReferenceId;
  institutionId: ReferenceId;
  branch: ReferenceId;
  officeRole: ReferenceId;
  sceneType: ReferenceId;
  use: "institutional-default" | "meeting-specific";
  meetingId: ReferenceId | null;
  effective: DateRange;
  observedDuring: { start: string; end: string };
  /** A matching reference is a candidate, not an occupant assignment. */
  assignment: "building-family" | "named-room";
}
export interface ReferenceCatalog {
  version: "venue-reference-v1";
  coverage: { kind: "bounded"; note: string; unencodedResearch: string[] };
  sources: SourceReference[];
  claims: SourceClaim[];
  campuses: CampusReference[];
  buildings: BuildingReference[];
  rooms: RoomReference[];
  geometry: MeasuredGeometry[];
  venues: VenueReference[];
  eras: VenueEra[];
  scenes: SceneReference[];
}
