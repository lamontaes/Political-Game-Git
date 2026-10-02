import type { RentalPriceRule } from "../../src/simulation/law-consequence-types";
import { expect, vi } from "vitest";
import { smallWorld } from "./small-world";
import { STATES } from "../../src/simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  createHousehold,
  startHouseholdMembership,
} from "../../src/simulation/life";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  money,
} from "../../src/simulation/resources";
import * as laws from "../../src/simulation/governing/law-in-force";
import * as housing from "../../src/simulation/living-world/housing-market";
import {
  RENT_LAW_KEYS,
  RENT_BASIS,
  townLeases,
} from "../../src/simulation/living-world/town-rent";

const seed = "team4-r6-recognized-rental-rule";
const places = Object.keys(STATES);

const provenance = {
  kind: "authored" as const,
  note: "Controlled small-world lease fixture; no actual statutory eligibility claimed.",
};

export function rentalFixture(place: string, rule?: RentalPriceRule) {
  expect(places).toHaveLength(56);
  const small = smallWorld({
    place,
    seed,
    date: "2026-01-01",
    laws: [RENT_LAW_KEYS.rentStabilization],
  });
  // Controlled law input deliberately has no numeric term. The original reader
  // must refuse it; a yes answer never establishes a rate or CPI window.
  vi.spyOn(laws, "lawInForce").mockImplementation(
    (_world, _town, propositionId) =>
      rule &&
      propositionId === small.propositionIds[RENT_LAW_KEYS.rentStabilization]
        ? {
            answer: "yes",
            origin: "in-force-at-start",
            measureId:
              `starting-law:US-${place}:${RENT_LAW_KEYS.rentStabilization}` as typeof small.personId,
            level: "state-statute",
            operativeAt: makeIsoDate("2026-01-01"),
            operativeBasis: "enacted-date",
          }
        : null,
  );
  vi.spyOn(laws, "startingLawTerms").mockReturnValue(
    rule
      ? [
          {
            questionKey: RENT_LAW_KEYS.rentStabilization,
            key: "cap",
            value: 0.08,
            unit: "ratio",
            rentalPriceRule: rule,
          },
        ]
      : [],
  );
  vi.spyOn(housing, "homePriceLevel").mockImplementation(
    (_world, _town, day) => (day >= "2027-01-01" ? 1.4 : 1),
  );
  let world = createHousehold(small.world, {
    stableKey: "fixture:tenant-household",
    formedAt: small.world.currentDate,
    label: "Recorded tenant household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "fixture:tenant-membership",
    householdId,
    personId: small.personId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: "fixture:leased-home",
    establishedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: "Recorded rental home",
    classification: "residential:house",
    rentalRegulationFacts: {
      certificateOfOccupancyDate: makeIsoDate("1990-01-01"),
      exemptions: {
        "affordable-program-adjustment": false,
        "separate-property-with-notice": false,
      },
      provenance,
    },
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: "fixture:home-owner",
    dwellingId,
    holder: { kind: "person", personId: world.personOrder[2]! },
    startedAt: world.currentDate,
    kind: "ownership:owned",
    context: null,
    provenance,
  });
  world = createHousingTenure(world, {
    stableKey: "fixture:home-tenant",
    dwellingId,
    holder: { kind: "household", householdId },
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance,
  });
  const tenureId = world.history.housingTenures.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "fixture:recorded-lease-flow",
    source: { kind: "person", personId: small.personId },
    recipient: { kind: "person", personId: world.personOrder[2]! },
    startsAt: world.currentDate,
    amount: money(1000_00, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: RENT_BASIS,
    basisReference: { kind: "housing", housingTenureId: tenureId },
    restrictionKind: null,
    jurisdictionId: small.jurisdictionId,
    provenance,
  });
  world = createResourceObligation(world, {
    stableKey: "fixture:recorded-lease-obligation",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    establishedAt: world.currentDate,
    basisKind: "housing:lease-1-bedroom-market",
    principal: null,
    careResponsibilityId: null,
    housingTenureId: tenureId,
    provenance,
  });
  const lease = townLeases(world).find((row) => row.dwellingId === dwellingId)!;
  expect(lease, `${place} seed=${seed}`).toBeDefined();
  expect(lease.flow.recipient).toEqual({
    kind: "person",
    personId: world.personOrder[2],
  });
  const day = makeIsoDate("2027-01-01");
  world = {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
  const law = laws.lawInForce(
    world,
    lease.town,
    small.propositionIds[RENT_LAW_KEYS.rentStabilization]!,
    day,
  )!;
  return {
    world,
    lease,
    day,
    input: { world, flow: lease.flow, law, onDate: day },
  };
}
