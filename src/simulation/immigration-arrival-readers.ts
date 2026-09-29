import research from "../../data/research/laws/immigration-admissions.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { activeWorkRelationshipsAt, currentLifeCutoff } from "./life-queries";
import { placeReferencePopulation } from "./nationwide-world/place-population";
import type { EntityId, IsoDate, World } from "./types";

/** Count recorded newcomers actually working on this date, rather than assigning employment from a rate. */
export function admittedWorkforce(
  world: World,
  jurisdictionId: EntityId,
  date: IsoDate,
): number {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  const state = jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
  const rows = (world.immigrationAdmissions ?? []).filter(
    (r) =>
      r.arrivedOn <= date &&
      (r.townId === jurisdictionId || r.stateKey === state),
  );
  const cutoff = { ...currentLifeCutoff(world), asOfDate: date };
  return new Set(
    rows
      .flatMap((r) => r.personIds)
      .filter((id) => activeWorkRelationshipsAt(world, id, cutoff).length > 0),
  ).size;
}

/** A historical urban elasticity prices the added residents into new and renewed private leases. */
export function immigrationRentLevel(
  world: World,
  town: EntityId,
  date: IsoDate,
): number {
  const place = lifePlaceByJurisdictionId(town);
  const population = place
    ? (placeReferencePopulation(place.key)?.value ?? null)
    : null;
  if (!population || population <= 0) return 1;
  const added = (world.immigrationAdmissions ?? [])
    .filter((r) => r.townId === town && r.arrivedOn <= date)
    .reduce((n, r) => n + r.personIds.length, 0);
  return 1 + (added / population) * research.rentElasticity;
}
