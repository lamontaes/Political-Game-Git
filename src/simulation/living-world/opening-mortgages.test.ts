import { beforeAll, describe, expect, it } from "vitest";
import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { ageOnDate, makeIsoDate } from "../dates";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { householdMembershipsAt } from "../life-queries";
import { personName } from "../people";
import {
  createDwelling,
  createHousingTenure,
  recordDwellingOccupancyState,
  startDwellingOccupancy,
} from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, LifeRecordProvenance, World } from "../types";
import { openingOwnerMortgageEvidence } from "./opening-mortgage-evidence";
import { openingMortgageTenureReadings } from "./opening-mortgages";

let opening: World;
let owners: EntityId[];
let home: EntityId;
beforeAll(() => {
  const seed = "a53-opening-tenure-records";
  const rng = new SeededRng(seed);
  const state = rng.pick(lifePlaceStateIdentities());
  const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  expect(places.length).toBeGreaterThan(0);
  const place = rng.pick(places);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
      startingLife: "ordinary-life",
      questionnaire: "skipped",
    }),
  ).game!;
  opening = game.world;
  home = opening.people[game.playerPersonId]!.homeJurisdictionId;
  const band = openingOwnerMortgageEvidence(40)!.ageBand;
  owners = Object.values(opening.people)
    .filter(
      (person) =>
        person.homeJurisdictionId === home &&
        openingOwnerMortgageEvidence(
          ageOnDate(person.birthDate, opening.currentDate),
        )?.ageBand === band,
    )
    .slice(0, 3)
    .map((person) => person.id);
  expect(owners).toHaveLength(3);
  process.stdout.write(
    JSON.stringify({
      audit: "A53",
      seed,
      place: place.displayName,
      placeKey: place.key,
      selectedState: state.name,
      eligibleLocalities: places.length,
      currentDate: opening.currentDate,
      people: owners.map((id) => ({
        id,
        name: personName(opening.people[id]!),
      })),
      proof:
        "Actual opening people; controlled dated-owner records below, not automatic mortgage admission.",
    }) + "\n",
  );
});

function ownerHome(
  world: World,
  personId: EntityId,
  key: string,
  startedAt: string,
  generated = false,
  tenureKind = "ownership:mortgaged" as const,
  householdId: EntityId | null = null,
) {
  const provenance: LifeRecordProvenance = generated
    ? { kind: "generated", generatorKey: "a53-unit-opening-records" }
    : {
        kind: "authored",
        note: "Controlled recorded residence date for tenure-reader proof.",
      };
  let next = createDwelling(world, {
    stableKey: `${key}:dwelling`,
    establishedAt: startedAt,
    jurisdictionId: home,
    locationLabel: "Controlled tenure-reader dwelling",
    classification: "residential:house",
    provenance,
  });
  const dwellingId = next.history.dwellings.at(-1)!.id;
  next = createHousingTenure(next, {
    stableKey: `${key}:tenure`,
    holder: householdId
      ? { kind: "household", householdId }
      : { kind: "person", personId },
    dwellingId,
    startedAt,
    kind: tenureKind,
    context: null,
    provenance,
  });
  const tenureId = next.history.housingTenures.at(-1)!.id;
  next = startDwellingOccupancy(next, {
    stableKey: `${key}:occupancy`,
    occupant: householdId
      ? { kind: "household", householdId }
      : { kind: "person", personId },
    dwellingId,
    startedAt,
    residenceRole: "primary",
    kind: "residence:owned-home",
    provenance,
  });
  return {
    world: next,
    tenureId,
    occupancyId: next.history.dwellingOccupancies.at(-1)!.id,
  };
}

describe("A53 opening mortgage ages are recorded or explicit peer estimates", () => {
  it("joins the ordinary opening household's primary owner and residence records", () => {
    const membership = householdMembershipsAt(opening, owners[0]!).find(
      (row) => row.state.residenceRole === "primary",
    )!;
    expect(membership).toBeDefined();
    const owned = ownerHome(
      opening,
      owners[0]!,
      "a53:household-owner",
      opening.currentDate,
      false,
      "ownership:mortgaged",
      membership.household.id,
    );
    const reading = openingMortgageTenureReadings(owned.world, home).find(
      (row) => row.housingTenureId === owned.tenureId,
    )!;
    expect(reading.paidMonths).toBe(0);
    expect(
      householdMembershipsAt(owned.world, reading.ownerPersonId).some(
        (row) =>
          row.household.id === membership.household.id &&
          row.state.residenceRole === "primary",
      ),
    ).toBe(true);
    const ownerMembership = householdMembershipsAt(
      owned.world,
      reading.ownerPersonId,
    ).find((row) => row.household.id === membership.household.id)!;
    expect(reading.sourceRecordIds).toEqual([
      owned.tenureId,
      owned.occupancyId,
      ownerMembership.membership.id,
      ownerMembership.state.id,
    ]);
  });

  it("reads elapsed residence months and preserves the actual record identities", () => {
    const owned = ownerHome(opening, owners[0]!, "a53:recorded", "2016-01-05");
    const before = serializeWorld(owned.world);
    const reading = openingMortgageTenureReadings(owned.world, home).find(
      (row) => row.housingTenureId === owned.tenureId,
    )!;
    expect(reading.paidMonths).toBe(120);
    expect(reading.basis).toBe("recorded-home-start");
    expect(reading.sourceRecordIds).toEqual([
      owned.tenureId,
      owned.occupancyId,
    ]);
    expect(serializeWorld(owned.world)).toBe(before);
  });

  it("computes the same-town similar-owner average from observed records", () => {
    const first = ownerHome(opening, owners[0]!, "a53:peer-long", "2016-01-05");
    const second = ownerHome(
      first.world,
      owners[1]!,
      "a53:peer-short",
      "2024-01-05",
    );
    const unknown = ownerHome(
      second.world,
      owners[2]!,
      "a53:peer-unknown",
      opening.currentDate,
      true,
    );
    const reading = openingMortgageTenureReadings(unknown.world, home).find(
      (row) => row.housingTenureId === unknown.tenureId,
    )!;
    expect(reading.paidMonths).toBe(72);
    expect(reading.basis).toBe("same-town-owner-average");
    expect(reading.sourceRecordIds).toEqual([
      unknown.tenureId,
      unknown.occupancyId,
      first.tenureId,
      first.occupancyId,
      second.tenureId,
      second.occupancyId,
    ]);
    const restored = deserializeWorld(serializeWorld(unknown.world));
    expect(openingMortgageTenureReadings(restored, home)).toEqual(
      openingMortgageTenureReadings(unknown.world, home),
    );
  });

  it("does not treat a generated opening date or an empty cohort as zero years paid", () => {
    const unknown = ownerHome(
      opening,
      owners[0]!,
      "a53:empty-peer",
      opening.currentDate,
      true,
    );
    expect(
      openingMortgageTenureReadings(unknown.world, home).find(
        (row) => row.housingTenureId === unknown.tenureId,
      ),
    ).toMatchObject({ paidMonths: null, basis: "missing-owner-tenure" });
  });

  it("keeps an actual recorded same-day move distinct from a generated opening date", () => {
    const owned = ownerHome(
      opening,
      owners[0]!,
      "a53:new-owner",
      opening.currentDate,
    );
    expect(
      openingMortgageTenureReadings(owned.world, home).find(
        (row) => row.housingTenureId === owned.tenureId,
      ),
    ).toMatchObject({ paidMonths: 0, basis: "recorded-home-start" });
  });

  it("excludes ended primary occupancy from the observed cohort", () => {
    const observed = ownerHome(opening, owners[0]!, "a53:ended", "2016-01-05");
    const state = observed.world.history.dwellingOccupancyStates.at(-1)!;
    const ended = recordDwellingOccupancyState(observed.world, {
      stableKey: "a53:ended:state",
      dwellingOccupancyId: observed.occupancyId,
      effectiveAt: makeIsoDate(opening.currentDate),
      status: "ended",
      residenceRole: "primary",
      kind: state.kind,
      reason: "Controlled ended-occupancy proof",
      provenance: state.provenance,
      supersedesStateId: state.id,
    });
    expect(
      openingMortgageTenureReadings(ended, home).some(
        (row) => row.housingTenureId === observed.tenureId,
      ),
    ).toBe(false);
  });
});
