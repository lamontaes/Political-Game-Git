import type { EntityId, IsoDate } from "./types";

/** Citizenship only: noncitizen does not imply an immigration category. */
export type CitizenshipStatus =
  | "citizen-by-birth"
  | "naturalized-citizen"
  | "noncitizen"
  | "noncitizen-national";

/** One private, append-only record family on the canonical person. */
export interface CitizenshipStatusRecord {
  readonly stableKey: string;
  readonly status: CitizenshipStatus;
  readonly effectiveAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly sequence: number | null;
  /** Null for an estimated naturalized citizen: no invented oath date. */
  readonly citizenSince: IsoDate | null;
  readonly sourceEventId: EntityId | null;
  readonly visibility: "private";
  readonly provenance: {
    readonly method: "estimated-from-population-share" | "recorded-event";
    readonly basis: "county" | "state-counties" | "published-counties" | null;
    readonly countyGeoids: readonly string[];
    readonly sourceVintage: string | null;
    readonly sourceArtifactSha256s: readonly string[];
    readonly sourceEntityIds: readonly EntityId[];
    readonly note: string;
  };
}
