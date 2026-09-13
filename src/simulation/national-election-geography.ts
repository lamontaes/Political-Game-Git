import { createStableId } from "./ids";
import { makeIsoDate } from "./dates";
import { stateJurisdictionForKey } from "./life-places";
import {
  NATIONAL_ELECTION_SOURCES,
  nationalElectionRules,
} from "./national-election-rules";
import type { Jurisdiction, World } from "./types";

/** Explicit federal identity. This adds no powers, source rules or local capabilities. */
const federalId = createStableId("jurisdiction", "definition:us-federal");
export const NATIONAL_ELECTION_JURISDICTION: Jurisdiction = {
  id: federalId,
  slug: "us-federal",
  name: "United States",
  kind: "federal",
  parentName: null,
  provenance: {
    asOf: makeIsoDate("2026-09-13"),
    source: NATIONAL_ELECTION_SOURCES.constitution,
    jurisdiction: federalId,
    status: "candidate",
  },
};
export function ensureNationalElectionJurisdiction(world: World): World {
  return ensureJurisdiction(world, NATIONAL_ELECTION_JURISDICTION);
}
export function nationalUnitJurisdiction(
  cycle: number,
  unitKey: string,
): Jurisdiction {
  const unit = nationalElectionRules(cycle).units.find(
    (unit) => unit.key === unitKey,
  );
  if (!unit) throw new Error("Unknown national result unit.");
  const jurisdiction = stateJurisdictionForKey(`US-${unit.state}`);
  if (!jurisdiction)
    throw new Error("Canonical state/DC jurisdiction identity unavailable.");
  return jurisdiction;
}
export function ensureJurisdiction(
  world: World,
  jurisdiction: Jurisdiction,
): World {
  if (world.jurisdictions[jurisdiction.id]) return world;
  return {
    ...world,
    jurisdictions: { ...world.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
  };
}
