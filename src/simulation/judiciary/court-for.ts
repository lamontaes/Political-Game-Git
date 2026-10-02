/** One saved-court lookup. Missing or ambiguous venue is not a court assignment. */
import { stateJurisdictionOf } from "../governing/law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { countyPopulationSharesForPlace } from "../government-units";
import { NATIONAL_COUNTIES_ROWS } from "../national-counties.generated";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { STATES } from "../state-reference";
import type { EntityId, World } from "../types";
import { JUDICIAL_SELECTION_PROFILES } from "./generated/selection-profiles";
import type { JudicialCourt, JudicialCourtLevel } from "./types";

export type CourtCaseKind = "law-review" | "criminal" | "civil";

let courtJurisdictions: ReadonlyMap<EntityId, EntityId> | null = null;
function courtJurisdictionOf(state: EntityId): EntityId {
  courtJurisdictions ??= new Map(
    Object.keys(STATES).flatMap((usps) => {
      const law = stateJurisdictionForKey(`US-${usps}`)?.id;
      const court = chiefExecutiveJurisdiction(usps)?.id;
      return law && court ? [[law, court] as const] : [];
    }),
  );
  return courtJurisdictions.get(state) ?? state;
}

const INDEX = new WeakMap<
  Readonly<Record<string, JudicialCourt>>,
  ReadonlyMap<string, readonly JudicialCourt[]>
>();
function courtIndex(courts: Readonly<Record<string, JudicialCourt>>) {
  let index = INDEX.get(courts);
  if (index) return index;
  const rows = new Map<string, JudicialCourt[]>();
  for (const court of Object.values(courts)) {
    const key = `${court.level}:${court.jurisdictionId ?? "unbound"}`;
    const group = rows.get(key) ?? [];
    group.push(court);
    rows.set(key, group);
  }
  INDEX.set(courts, rows);
  index = rows;
  return index;
}

const COUNTY_NAMES = new Map(
  (
    JSON.parse(NATIONAL_COUNTIES_ROWS) as readonly (readonly [
      string,
      string,
      string,
    ])[]
  ).map(([id, name]) => [id, name.replace(/ County$/, "")] as const),
);

/** All recorded county parts must resolve to the same statutory district. */
function federalDistrictFor(
  world: World,
  jurisdictionId: EntityId,
): JudicialCourt | null {
  const courts = world.judiciary?.courts;
  if (!courts) return null;
  const state = stateJurisdictionOf(jurisdictionId);
  const bindings = new Set([
    jurisdictionId,
    ...(state ? [state, courtJurisdictionOf(state)] : []),
  ]);
  const candidates = [...bindings].flatMap(
    (id) => courtIndex(courts).get(`federal-district:${id}`) ?? [],
  );
  const unique = [...new Set(candidates)];
  if (unique.length === 1) {
    const source = FEDERAL_COURTS_PROJECTION.find(
      (row) => row.courtId === unique[0]!.sourceRecordId,
    );
    // Missing saved sibling courts do not enlarge the survivor's territory.
    if (
      source?.jurisdictionName &&
      FEDERAL_COURTS_PROJECTION.filter(
        (row) =>
          row.courtKind === "district-court" &&
          row.jurisdictionName === source.jurisdictionName,
      ).length === 1
    )
      return unique[0]!;
  }
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (!place?.sourceGeoid) return null;
  const counties =
    place.scope === "county"
      ? [place.sourceGeoid]
      : countyPopulationSharesForPlace(place.sourceGeoid).map(([id]) => id);
  if (!counties.length) return null;
  let selected: JudicialCourt | null = null;
  for (const county of counties) {
    const name = COUNTY_NAMES.get(county);
    if (!name) return null;
    const matches = unique.filter((court) => {
      const source = FEDERAL_COURTS_PROJECTION.find(
        (row) => row.courtId === court.sourceRecordId,
      );
      const names = [
        ...(source?.comprisesCounties ?? []),
        ...(source?.divisions?.flatMap((row) => row.comprisesCounties) ?? []),
      ];
      return names.some((member) => member.replace(/ County$/, "") === name);
    });
    if (
      matches.length !== 1 ||
      (selected && selected.courtId !== matches[0]!.courtId)
    )
      return null;
    selected = matches[0]!;
  }
  return selected;
}

/**
 * The existing state court-family join is shared by all callers. National
 * review uses the saved Supreme Court. A federal trial court needs an actual
 * jurisdiction binding; unbound districts are never picked by name or order.
 * The caller reads actual dated seats/tenures and leaves an unseated case pending.
 */
export function courtFor(
  world: World,
  jurisdictionId: EntityId,
  level: JudicialCourtLevel,
  caseKind: CourtCaseKind,
): JudicialCourt | null {
  const courts = world.judiciary?.courts;
  if (!courts) return null;
  const index = courtIndex(courts);
  const national = jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id;
  if (national && level === "local-highest" && caseKind === "law-review") {
    const supreme = index.get("federal-supreme:unbound") ?? [];
    return supreme.length === 1 ? supreme[0]! : null;
  }
  if (level.startsWith("federal-")) {
    // Supreme Court identity is nationwide; district identity is not a venue.
    if (national && level === "federal-supreme" && caseKind === "law-review") {
      const supreme = index.get("federal-supreme:unbound") ?? [];
      return supreme.length === 1 ? supreme[0]! : null;
    }
    if (level === "federal-district")
      return federalDistrictFor(world, jurisdictionId);
    if (level === "federal-appellate") {
      const district = federalDistrictFor(world, jurisdictionId);
      const parent = district?.parentCourtId
        ? courts[district.parentCourtId]
        : null;
      return parent?.level === "federal-appellate" ? parent : null;
    }
    return null;
  }
  if (national) return null;
  const state = stateJurisdictionOf(jurisdictionId);
  // A saved court's own jurisdiction is already an exact binding, including
  // an executive jurisdiction alias that is not the law catalog's state ID.
  const jurisdictions = new Set([
    jurisdictionId,
    ...(state ? [state, courtJurisdictionOf(state)] : []),
  ]);
  const candidates = [...jurisdictions]
    .flatMap((id) => index.get(`${level}:${id}`) ?? [])
    .filter(
      (court) =>
        caseKind === "criminal" ||
        JUDICIAL_SELECTION_PROFILES.find(
          (profile) => profile.recordId === court.sourceRecordId,
        )?.officeFamily !== "highest_court_criminal",
    );
  return candidates.length === 1 ? candidates[0]! : null;
}
