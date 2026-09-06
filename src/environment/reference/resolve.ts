import { makeIsoDate } from "../../simulation/dates";
import { assertDottedContentKey } from "../../simulation/taxonomy";
import { assertReferenceCatalog, compareIds, supportedOn } from "./catalog";
import type {
  ReferenceCatalog,
  SceneReference,
  VenueEra,
  VenueReference,
} from "./types";

export interface VenueQuery {
  date: string;
  jurisdictionId?: string;
  governmentId?: string;
  institutionId?: string;
  officeRole?: string;
  sceneType?: string;
  meetingId?: string;
}
export interface ResolvedVenueReference {
  scene: SceneReference;
  venue: VenueReference;
  era: VenueEra | null;
  availability: "available" | "unavailable" | "unknown";
  reasons: string[];
  exactRender: { state: "blocked" | "reference-ready"; blockers: string[] };
}

/** Read-only reference candidates. Neither access permission nor World assignments. */
export function resolveVenueReferences(
  c: ReferenceCatalog,
  q: VenueQuery,
): ResolvedVenueReference[] {
  assertReferenceCatalog(c);
  makeIsoDate(q.date);
  for (const [field, value] of Object.entries(q))
    if (field !== "date" && value !== undefined)
      assertDottedContentKey(value, field);
  return c.scenes
    .filter(
      (s) =>
        supportedOn(q.date, s) &&
        (q.jurisdictionId === undefined ||
          s.jurisdictionId === q.jurisdictionId) &&
        (q.governmentId === undefined || s.governmentId === q.governmentId) &&
        (q.institutionId === undefined ||
          s.institutionId === q.institutionId) &&
        (q.officeRole === undefined || s.officeRole === q.officeRole) &&
        (q.sceneType === undefined || s.sceneType === q.sceneType) &&
        // A meeting-specific use must never become an institutional default.
        (s.use === "institutional-default"
          ? q.meetingId === undefined
          : s.meetingId === q.meetingId),
    )
    .sort(compareIds)
    .map((scene) => {
      const venue = c.venues.find((v) => v.id === scene.venueId)!;
      const building = c.buildings.find((b) => b.id === venue.buildingId)!;
      const room = c.rooms.find((r) => r.id === venue.roomId);
      const campus = c.campuses.find((x) => x.id === building.campusId);
      const era =
        c.eras.find((e) => e.venueId === venue.id && supportedOn(q.date, e)) ??
        null;
      const reasons: string[] = [];
      let availability: ResolvedVenueReference["availability"] = "available";
      if (!era || era.availability === "unknown") {
        availability = "unknown";
        reasons.push("availability-unestablished");
      } else if (
        era.availability === "closed" ||
        era.state === "construction" ||
        era.publicAccessState === "closed"
      ) {
        availability = "unavailable";
        reasons.push(era.state === "construction" ? "construction" : "closed");
      }
      if (
        era?.state === "historic_only" &&
        scene.sceneType !== "scene.historical-visit"
      ) {
        availability = "unavailable";
        reasons.push("historic-only");
      }
      if (
        era?.state === "ceremonial_only" &&
        !["scene.ceremony", "scene.reception"].includes(scene.sceneType)
      ) {
        availability = "unavailable";
        reasons.push("ceremonial-only");
      }
      if (era?.state === "temporary" || era?.state === "swing_space")
        reasons.push(era.state);
      const geometry = c.geometry.filter(
        (g) => g.subjectId === building.id || g.subjectId === venue.roomId,
      );
      const referencedClaims = new Set(
        [scene, venue, building, room, campus, era, ...geometry].flatMap(
          (x) => x?.claimIds ?? [],
        ),
      );
      const blockers: string[] = [];
      if (availability !== "available") blockers.push(`venue-${availability}`);
      if (!room) blockers.push("specific-room-unestablished");
      if (!geometry.some((g) => g.subjectId === venue.roomId))
        blockers.push("room-geometry-unestablished");
      const roomDimensions = new Set(
        geometry
          .filter(
            (g) => g.subjectId === venue.roomId && g.value.state === "reported",
          )
          .map((g) => g.dimension),
      );
      if (
        !roomDimensions.has("dimension.height") ||
        !(
          roomDimensions.has("dimension.diameter") ||
          (roomDimensions.has("dimension.length") &&
            roomDimensions.has("dimension.width"))
        )
      )
        blockers.push("room-envelope-incomplete");
      for (const g of geometry) {
        if (g.value.state === "unknown")
          blockers.push(`geometry-unknown:${g.id}`);
        else {
          if (g.primaryEvidence === "not-supplied")
            blockers.push(`primary-geometry-evidence-missing:${g.id}`);
          if (g.value.confidence !== "exact")
            blockers.push(`geometry-not-exact:${g.id}`);
        }
      }
      for (const claim of c.claims.filter((x) => referencedClaims.has(x.id))) {
        // A stale linked claim is not silently replaced by its successor.
        if (claim.discrepancy === "superseded")
          blockers.push(`superseded-claim:${claim.id}`);
        if (
          claim.renderBlocking ||
          (claim.discrepancy === "unresolved" &&
            ["geometry", "location"].includes(claim.controls))
        )
          blockers.push(`claim:${claim.id}`);
      }
      // Readiness is reference readiness only; the asset manifest still owns release.
      if (building.referencePack !== "strong-source-family")
        blockers.push("visual-reference-pack-incomplete");
      return {
        scene,
        venue,
        era,
        availability,
        reasons: reasons.sort(),
        exactRender: {
          state: blockers.length ? "blocked" : "reference-ready",
          blockers: [...new Set(blockers)].sort(),
        },
      };
    });
}

export type VenueTopology =
  | "same-room"
  | "same-building"
  | "same-campus-different-building"
  | "off-campus"
  | "unknown";
/** Pure physical classification; no route, permission, distance, or duration is inferred. */
export function classifyVenueTopology(
  c: ReferenceCatalog,
  fromVenueId: string,
  toVenueId: string,
): VenueTopology {
  assertReferenceCatalog(c);
  const from = c.venues.find((v) => v.id === fromVenueId);
  const to = c.venues.find((v) => v.id === toVenueId);
  if (!from || !to) throw new Error("Unknown venue identity");
  if (from.roomId !== null && from.roomId === to.roomId) return "same-room";
  if (from.buildingId === to.buildingId) return "same-building";
  const a = c.buildings.find((b) => b.id === from.buildingId)!;
  const b = c.buildings.find((b) => b.id === to.buildingId)!;
  if (a.campusId === null || b.campusId === null) return "unknown";
  return a.campusId === b.campusId
    ? "same-campus-different-building"
    : "off-campus";
}
