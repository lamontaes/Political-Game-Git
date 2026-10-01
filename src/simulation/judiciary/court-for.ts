/** One saved-court lookup. Missing or ambiguous venue is not a court assignment. */
import { stateJurisdictionOf } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
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
    const exact = index.get(`${level}:${jurisdictionId}`) ?? [];
    return exact.length === 1 ? exact[0]! : null;
  }
  if (national) return null;
  const state = stateJurisdictionOf(jurisdictionId);
  if (!state) return null;
  const jurisdictions = new Set([state, courtJurisdictionOf(state)]);
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
