/**
 * Compiled map geometry pack format (browser-safe, data only).
 *
 * Geometry is physical shape and identity. It never carries party, holder,
 * election result, or membership; those come from the live World.
 */

export const MAP_GEOMETRY_FORMAT = "ocd-map-geometry/v1" as const;
export const MAP_GEOMETRY_VINTAGE = "census-cb-2025" as const;

export type MapLayerId =
  | "state"
  | "congressional"
  | "county"
  | "state-upper"
  | "state-lower"
  | "place";

export interface MapFeature {
  /** Census GEOID exactly as published (district GEOIDs are chamber-scoped). */
  readonly geoid: string;
  readonly name: string;
  readonly stateFips: string;
  readonly stateUsps: string;
  /** Rings of arc references; negative ~i walks arc i backwards. */
  readonly rings: readonly (readonly number[])[];
  readonly bbox: readonly [number, number, number, number];
  /** Deterministic interior label anchor. Not a residence or membership point. */
  readonly label: readonly [number, number];
  /** Legislative session year stated by Census for state legislative layers. */
  readonly sessionYear?: string;
  /** Census LSAD code, kept so a place's legal/statistical type stays explicit. */
  readonly lsad?: string;
}

export interface MapGeometryPack {
  readonly format: typeof MAP_GEOMETRY_FORMAT;
  readonly vintage: typeof MAP_GEOMETRY_VINTAGE;
  readonly packId: string;
  readonly compilerVersion: string;
  /** Map units per quantized integer step. */
  readonly quantum: number;
  readonly bbox: readonly [number, number, number, number];
  /** Delta-encoded integer arcs: [x0, y0, dx1, dy1, ...]. */
  readonly arcs: readonly (readonly number[])[];
  readonly layers: Readonly<Partial<Record<MapLayerId, readonly MapFeature[]>>>;
  readonly sources: readonly {
    readonly artifactId: string;
    readonly sha256: string;
  }[];
}
