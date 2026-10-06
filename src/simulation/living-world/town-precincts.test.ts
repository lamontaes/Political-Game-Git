import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { redistrictAfterCensus } from "./local-elections";
import { localGoverningBodiesForJurisdiction } from "../candidacy";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import {
  createHousehold,
  startHouseholdMembership,
  recordHouseholdLocation,
} from "../life";
import {
  establishVotingPrecinctMembership,
  syncVotingPrecinctArrival,
  votingPrecinctOfPerson,
  votingPrecinctPlan,
} from "./town-wards";

it("records deterministic population-share membership for every resident across all 56 jurisdictions", () => {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  for (const state of states) {
    const fixture = smallWorld({
      place: state.usps,
      people: 6,
      seed: `session13-precinct-${state.usps}`,
      date: "2026-01-05",
    });
    const town = fixture.world.people[fixture.personId]!.homeJurisdictionId;
    const first = establishVotingPrecinctMembership(fixture.world, town);
    const second = establishVotingPrecinctMembership(fixture.world, town);
    expect(first.history).toEqual(second.history);
    for (const id of first.personOrder) {
      const membership = votingPrecinctOfPerson(first, town, id);
      expect(membership).not.toBeNull();
      expect(
        membership!.plan.precincts.filter(
          (row) => row.key === membership!.precinctKey,
        ),
      ).toHaveLength(1);
    }
    const plan = votingPrecinctPlan(first, town);
    const total = plan.precincts.reduce((sum, row) => sum + row.population, 0);
    const assigned = first.personOrder.map(
      (id) => votingPrecinctOfPerson(first, town, id)!.precinctKey,
    );
    for (const row of plan.precincts) {
      const count = assigned.filter((key) => key === row.key).length;
      const exact = (assigned.length * row.population) / total;
      expect(count).toBeGreaterThanOrEqual(Math.floor(exact));
      expect(count).toBeLessThanOrEqual(Math.ceil(exact));
    }
    const reloaded = deserializeWorld(serializeWorld(first));
    expect(establishVotingPrecinctMembership(reloaded, town)).toBe(reloaded);
    expect(
      reloaded.personOrder.map((id) =>
        votingPrecinctOfPerson(reloaded, town, id),
      ),
    ).toEqual(
      first.personOrder.map((id) => votingPrecinctOfPerson(first, town, id)),
    );
    expect(syncVotingPrecinctArrival(reloaded, fixture.personId)).toBe(
      reloaded,
    );
  }
});

it("does not invent membership for an old save or expose a future opening map", () => {
  const seed = "session13-precinct-old-save";
  const place = drawRandomPlace(seed);
  console.log(`Precinct fixture place=${place.displayName}, seed=${seed}`);
  const fixture = smallWorld({
    place: place.key,
    people: 6,
    date: "2026-01-05",
    seed,
  });
  const town = fixture.world.people[fixture.personId]!.homeJurisdictionId;
  expect(
    votingPrecinctOfPerson(fixture.world, town, fixture.personId),
  ).toBeNull();
  const later = addDays(fixture.world.currentDate, 1);
  const next = establishVotingPrecinctMembership(
    {
      ...fixture.world,
      currentDate: later,
      currentMoment: simulationMomentOnLocalDate(
        fixture.world.currentMoment,
        later,
      ),
    },
    town,
  );
  expect(
    votingPrecinctOfPerson(
      next,
      town,
      fixture.personId,
      fixture.world.currentDate,
    ),
  ).toBeNull();
  expect(votingPrecinctOfPerson(next, town, fixture.personId)).not.toBeNull();
});

it("assigns an actual arriving primary household without moving existing residents", () => {
  const seed = "session13-precinct-arrival";
  const fixture = smallWorld({
    place: drawRandomPlace(seed).key,
    people: 6,
    date: "2026-01-05",
    seed,
  });
  const town = fixture.world.people[fixture.personId]!.homeJurisdictionId;
  const mover = fixture.world.personOrder[1]!;
  const outside = fixture.world.jurisdictionOrder.find((id) => id !== town)!;
  let world = createHousehold(fixture.world, {
    stableKey: "precinct-arrival-household",
    formedAt: fixture.world.currentDate,
    label: "Arrival fixture household",
    provenance: { kind: "authored", note: "Recorded mover fixture." },
  });
  const household = world.history.households.at(-1)!;
  world = startHouseholdMembership(world, {
    stableKey: "precinct-arrival-membership",
    householdId: household.id,
    personId: mover,
    startedAt: world.currentDate,
    kind: "resident:member",
    residenceRole: "primary",
    provenance: { kind: "authored", note: "Recorded mover fixture." },
  });
  world = recordHouseholdLocation(world, {
    stableKey: "precinct-before-arrival",
    householdId: household.id,
    jurisdictionId: outside,
    effectiveAt: world.currentDate,
    label: "Outside the town",
    kind: "residence:home",
    supersedesLocationId: null,
    provenance: { kind: "authored", note: "Recorded mover fixture." },
  });
  world = establishVotingPrecinctMembership(world, town);
  const before = votingPrecinctOfPerson(world, town, fixture.personId);
  expect(votingPrecinctOfPerson(world, town, mover)).toBeNull();
  const tomorrow = addDays(world.currentDate, 1);
  world = {
    ...world,
    currentDate: tomorrow,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, tomorrow),
  };
  world = recordHouseholdLocation(world, {
    stableKey: "precinct-after-arrival",
    householdId: household.id,
    jurisdictionId: town,
    effectiveAt: tomorrow,
    label: "Moved into town",
    kind: "residence:home",
    supersedesLocationId: world.history.householdLocations.at(-1)!.id,
    provenance: { kind: "authored", note: "Recorded mover fixture." },
  });
  const arrived = syncVotingPrecinctArrival(world, mover);
  expect(votingPrecinctOfPerson(arrived, town, mover)).not.toBeNull();
  expect(
    votingPrecinctOfPerson(arrived, town, mover, fixture.world.currentDate),
  ).toBeNull();
  expect(votingPrecinctOfPerson(arrived, town, fixture.personId)).toEqual(
    before,
  );
  expect(syncVotingPrecinctArrival(arrived, mover)).toBe(arrived);
  expect(votingPrecinctPlan(arrived, town).precincts.length).toBeGreaterThan(0);
});

it("changes saved map generation only through the existing census redistricting step", () => {
  const seed = "session13-precinct-census";
  const place = drawRandomPlace(seed, (candidate) =>
    localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
      (body) => body.unit.unitType === "municipality",
    ),
  );
  const fixture = smallWorld({
    place: place.key,
    people: 6,
    date: "2026-01-05",
    seed,
  });
  const town = fixture.world.people[fixture.personId]!.homeJurisdictionId;
  const unit = localGoverningBodiesForJurisdiction(town).find(
    (body) => body.unit.unitType === "municipality",
  )!.unit;
  const opening = establishVotingPrecinctMembership(fixture.world, town);
  const originalMap = votingPrecinctOfPerson(
    opening,
    town,
    fixture.personId,
  )!.mapId;
  expect(redistrictAfterCensus(opening, unit, town)).toBe(opening);
  const censusDate = makeIsoDate("2031-01-05");
  const census = {
    ...opening,
    currentDate: censusDate,
    currentMoment: simulationMomentOnLocalDate(
      opening.currentMoment,
      censusDate,
    ),
  };
  const redrawn = redistrictAfterCensus(census, unit, town);
  expect(
    votingPrecinctOfPerson(redrawn, town, fixture.personId)!.mapId,
  ).not.toBe(originalMap);
  expect(
    votingPrecinctOfPerson(
      redrawn,
      town,
      fixture.personId,
      opening.currentDate,
    )!.mapId,
  ).toBe(originalMap);
  expect(redistrictAfterCensus(redrawn, unit, town)).toBe(redrawn);
});
