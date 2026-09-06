import { assertCatalogShape } from "./shape";
import { makeIsoDate } from "../../simulation/dates";
import { canonicalJson } from "../../simulation/canonical-json";
import { assertDottedContentKey } from "../../simulation/taxonomy";
import type { ReferenceCatalog, DateRange } from "./types";

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Venue reference: ${message}`);
}
export function compareIds(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
export function within(date: string, range: DateRange): boolean {
  return (
    (range.start === null || date >= range.start) &&
    (range.end === null || date <= range.end)
  );
}
/** Unknown effective bounds do not authorize extrapolation beyond evidence coverage. */
export function supportedOn(
  date: string,
  record: {
    effective: DateRange;
    observedDuring: { start: string; end: string };
  },
): boolean {
  makeIsoDate(date);
  return within(date, record.effective) && within(date, record.observedDuring);
}

/** Validate cross-record identity and semantic invariants before using authored data. */
export function assertReferenceCatalog(c: ReferenceCatalog): void {
  assertCatalogShape(c);
  requireValue(c.version === "venue-reference-v1", "unsupported version");
  requireValue(
    c.coverage.kind === "bounded" && c.coverage.note.trim(),
    "coverage required",
  );
  const groups = [
    c.sources,
    c.claims,
    c.campuses,
    c.buildings,
    c.rooms,
    c.geometry,
    c.venues,
    c.eras,
    c.scenes,
  ];
  const ids = new Set<string>();
  for (const group of groups)
    for (const item of group) {
      assertDottedContentKey(item.id, "Reference id");
      requireValue(!ids.has(item.id), `duplicate id ${item.id}`);
      ids.add(item.id);
    }
  const sourceIds = new Set(c.sources.map((x) => x.id));
  const claims = new Map(c.claims.map((x) => [x.id, x]));
  const buildings = new Map(c.buildings.map((x) => [x.id, x]));
  const rooms = new Map(c.rooms.map((x) => [x.id, x]));
  const venues = new Map(c.venues.map((x) => [x.id, x]));
  const campuses = new Map(c.campuses.map((x) => [x.id, x]));
  const key = (s: string) => assertDottedContentKey(s, "Reference content key");
  const dateRange = (r: DateRange) => {
    if (r.start !== null) makeIsoDate(r.start);
    if (r.end !== null) makeIsoDate(r.end);
    requireValue(
      r.start === null || r.end === null || r.start <= r.end,
      "reversed date range",
    );
  };
  for (const s of c.sources) {
    requireValue(
      ["research-authority", "primary-reference"].includes(s.kind),
      "source kind",
    );
    requireValue(
      s.title.trim() && /^https:\/\//.test(s.url),
      `source locator ${s.id}`,
    );
    requireValue(
      ["consumed-text", "cited-not-acquired"].includes(s.acquisition),
      "acquisition state",
    );
    requireValue(
      s.rights === "unknown",
      "this catalog does not establish asset rights",
    );
    if (s.sourceDate !== null) makeIsoDate(s.sourceDate);
  }
  for (const claim of c.claims) {
    requireValue(sourceIds.has(claim.sourceId), `missing source ${claim.id}`);
    requireValue(
      claim.locator.trim() && claim.statement.trim(),
      `empty claim ${claim.id}`,
    );
    if (claim.sourceDate !== null) makeIsoDate(claim.sourceDate);
    requireValue(
      ["high", "partial", "unknown"].includes(claim.confidence),
      "claim confidence",
    );
    requireValue(
      ["research-transcribed", "primary-verified", "unverified"].includes(
        claim.verification,
      ),
      "verification",
    );
    requireValue(
      ["none", "unresolved", "resolved", "superseded"].includes(
        claim.discrepancy,
      ),
      "discrepancy",
    );
    requireValue(
      ["identity", "location", "geometry", "use", "appearance"].includes(
        claim.controls,
      ),
      "claim controls",
    );
    requireValue(
      typeof claim.renderBlocking === "boolean",
      "render blocking must be explicit",
    );
    for (const id of [...claim.citedSourceIds, ...claim.conflictingSourceIds])
      requireValue(sourceIds.has(id), `missing conflicting source ${id}`);
    if (["resolved", "superseded"].includes(claim.discrepancy))
      requireValue(claim.resolutionNote?.trim(), "resolution note required");
    if (claim.discrepancy === "superseded") {
      requireValue(
        claim.supersededBy && claims.has(claim.supersededBy),
        "supersession target required",
      );
      const seen = new Set([claim.id]);
      let next = claim.supersededBy;
      while (next) {
        requireValue(!seen.has(next), "claim supersession cycle");
        seen.add(next);
        next = claims.get(next)?.supersededBy ?? "";
      }
    } else
      requireValue(
        claim.supersededBy === null,
        "unexpected supersession target",
      );
  }
  for (const group of [
    c.campuses,
    c.buildings,
    c.rooms,
    c.geometry,
    c.venues,
    c.eras,
    c.scenes,
  ])
    for (const item of group) {
      requireValue(
        item.claimIds.length > 0 &&
          new Set(item.claimIds).size === item.claimIds.length,
        `claim links required ${item.id}`,
      );
      for (const id of item.claimIds)
        requireValue(claims.has(id), `missing claim ${id}`);
    }
  for (const x of [...c.campuses, ...c.buildings, ...c.scenes]) {
    key(x.jurisdictionId);
    key(x.governmentId);
  }
  for (const b of c.buildings) {
    requireValue(
      ["pending", "partial", "strong-source-family"].includes(b.referencePack),
      "reference pack state",
    );
    requireValue(
      ["unique", "jurisdiction-variant", "reusable-family"].includes(
        b.uniquenessClass,
      ),
      "uniqueness class",
    );
    key(b.assetFamily);
    key(b.baseGeometryFamily);
    requireValue(
      b.extractedAssetStatus === "not-acquired",
      "not an asset-release registry",
    );
    if (b.campusId !== null) {
      const campus = campuses.get(b.campusId);
      requireValue(
        campus &&
          campus.jurisdictionId === b.jurisdictionId &&
          campus.governmentId === b.governmentId,
        `campus mismatch ${b.id}`,
      );
    }
  }
  for (const r of c.rooms) {
    requireValue(
      buildings.has(r.buildingId) && r.verifiedName.trim(),
      `room identity ${r.id}`,
    );
    key(r.roomFunctionFamily);
  }
  for (const v of c.venues) {
    requireValue(buildings.has(v.buildingId), `venue building ${v.id}`);
    if (v.roomId !== null)
      requireValue(
        rooms.get(v.roomId)?.buildingId === v.buildingId,
        `venue room mismatch ${v.id}`,
      );
    if (v.walkingTransitionGroup !== null) key(v.walkingTransitionGroup);
  }
  for (const g of c.geometry) {
    key(g.dimension);
    requireValue(
      g.appliesTo === "room"
        ? rooms.has(g.subjectId)
        : g.appliesTo === "building-context" && buildings.has(g.subjectId),
      `geometry subject ${g.id}`,
    );
    requireValue(
      ["located", "not-supplied"].includes(g.primaryEvidence),
      "primary evidence state",
    );
    if (g.value.state === "unknown") {
      requireValue(
        g.value.reason.trim() &&
          !("magnitude" in g.value) &&
          !("confidence" in g.value) &&
          !("value" in g.value),
        "unknown geometry cannot carry numbers/confidence",
      );
    } else {
      requireValue(g.value.state === "reported", "geometry state");
      requireValue(
        [
          "exact",
          "plan-derived",
          "specified",
          "bounded-estimate",
          "visual-estimate",
        ].includes(g.value.confidence),
        "measurement confidence",
      );
      requireValue(
        ["ft", "in", "m", "sq-ft", "degrees"].includes(g.value.unit),
        "measurement unit",
      );
      const m = g.value.magnitude;
      requireValue(m.kind === "scalar" || m.kind === "range", "magnitude kind");
      const values = m.kind === "scalar" ? [m.value] : [m.min, m.max];
      requireValue(
        values.every((x) => Number.isFinite(x) && x > 0),
        "positive finite measurement required",
      );
      if (m.kind === "range")
        requireValue(m.min <= m.max, "reversed measurement range");
    }
  }
  for (const x of [...c.eras, ...c.scenes]) {
    requireValue(venues.has(x.venueId), `missing venue ${x.id}`);
    dateRange(x.effective);
    dateRange(x.observedDuring);
    requireValue(
      x.observedDuring.start !== null && x.observedDuring.end !== null,
      "bounded observation required",
    );
    requireValue(
      within(x.observedDuring.start, x.effective) &&
        within(x.observedDuring.end, x.effective),
      "observation outside effective range",
    );
  }
  for (const e of c.eras) {
    requireValue(
      ["current-researched", "historical-reference"].includes(
        e.currentEraStatus,
      ),
      "current era status",
    );
    requireValue(
      [
        "normal",
        "temporary",
        "swing_space",
        "construction",
        "historic_only",
        "ceremonial_only",
      ].includes(e.state),
      "venue state",
    );
    requireValue(
      ["available", "closed", "unknown"].includes(e.availability),
      "availability",
    );
    requireValue(
      ["public", "screened", "restricted", "closed", "unknown"].includes(
        e.publicAccessState,
      ),
      "public access",
    );
    requireValue(
      ["screening", "restricted", "unknown"].includes(e.securityState),
      "security state",
    );
    requireValue(
      e.state !== "construction" || e.availability !== "available",
      "construction cannot imply ordinary availability",
    );
    requireValue(
      e.publicAccessState !== "closed" || e.availability !== "available",
      "closed access cannot imply availability",
    );
    for (const other of c.eras)
      if (other.id < e.id && other.venueId === e.venueId) {
        requireValue(
          e.observedDuring.end < other.observedDuring.start ||
            other.observedDuring.end < e.observedDuring.start,
          `overlapping venue eras ${e.id}`,
        );
      }
  }
  for (const s of c.scenes) {
    key(s.institutionId);
    key(s.branch);
    key(s.officeRole);
    key(s.sceneType);
    const v = venues.get(s.venueId)!;
    const b = buildings.get(v.buildingId)!;
    requireValue(
      b.jurisdictionId === s.jurisdictionId &&
        b.governmentId === s.governmentId,
      `scene jurisdiction mismatch ${s.id}`,
    );
    requireValue(
      s.assignment === (v.roomId === null ? "building-family" : "named-room"),
      "assignment identity mismatch",
    );
    requireValue(
      s.use === "institutional-default" || s.use === "meeting-specific",
      "use kind",
    );
    requireValue(
      s.use === "meeting-specific"
        ? s.meetingId !== null
        : s.meetingId === null,
      "meeting identity required only for meeting use",
    );
    if (s.meetingId !== null) key(s.meetingId);
  }
}

export function serializeReferenceCatalog(c: ReferenceCatalog): string {
  assertReferenceCatalog(c);
  return canonicalJson({
    ...c,
    sources: [...c.sources].sort(compareIds),
    claims: [...c.claims].sort(compareIds),
    campuses: [...c.campuses].sort(compareIds),
    buildings: [...c.buildings].sort(compareIds),
    rooms: [...c.rooms].sort(compareIds),
    geometry: [...c.geometry].sort(compareIds),
    venues: [...c.venues].sort(compareIds),
    eras: [...c.eras].sort(compareIds),
    scenes: [...c.scenes].sort(compareIds),
  });
}
/** Invalid JSON or catalog data throws before it can be resolved. */
export function parseReferenceCatalog(json: string): ReferenceCatalog {
  const value = JSON.parse(json) as ReferenceCatalog;
  assertReferenceCatalog(value);
  return value;
}
