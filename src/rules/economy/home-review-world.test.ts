import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
} from "../../simulation/character-history";
import { startHouseholdMembership } from "../../simulation/life";
import {
  recordHouseholdLocation,
  recordHouseholdMembershipState,
} from "../../simulation/life";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  addDays,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import * as native from "../../simulation/living-world/town-homes";
import * as own from "./home-review";
import * as resources from "../../simulation/resources";
import { recordWorldEvent } from "../../simulation/world";
import { recordDirectEventMemories } from "../../simulation/records";
import { rentReadingFacts } from "./test-support/rent-reading-facts";
import { housingFacts } from "./test-support/housing-facts";
import type { World, EntityId } from "../../simulation/types";
const dates = ["2026-01-05", "2026-04-06", "2027-04-06"].map(makeIsoDate);
function facts(world: World): own.HomeReviewFacts {
  return {
    ...rentReadingFacts(world, [...dates, addDays(world.currentDate, -91)]),
    control: world.control,
    purchase: housingFacts(world),
  };
}
function run(world: World, town: EntityId, round: string) {
  const expected = native.reviewTownHomes(world, town, round),
    gen = own.reviewTownHomes(facts(world), town, round);
  let current = world,
    step = gen.next();
  while (!step.done) {
    const request = step.value;
    if (request.kind === "recordWorldEvent")
      current = recordWorldEvent(current, request.input);
    else if (request.kind === "recordDirectEventMemories")
      current = recordDirectEventMemories(current, request.eventId);
    else
      switch (request.kind) {
        case "createDwelling":
          current = resources.createDwelling(current, request.input);
          break;
        case "createHousingTenure":
          current = resources.createHousingTenure(current, request.input);
          break;
        case "startDwellingOccupancy":
          current = resources.startDwellingOccupancy(current, request.input);
          break;
        case "recordDwellingOccupancyState":
          current = resources.recordDwellingOccupancyState(
            current,
            request.input,
          );
          break;
        case "recordHousingTenureState":
          current = resources.recordHousingTenureState(current, request.input);
          break;
      }
    step = gen.next(facts(current));
  }
  expect(current).toEqual(expected);
  expect(step.value).toEqual(facts(current));
  expect(own.describeTownHomes(facts(current), town)).toEqual(
    native.describeTownHomes(current, town),
  );
  return current;
}
function downsizeControl(world: World, town: EntityId) {
  const householdId = world.history.households.at(-1)!.id,
    provenance = {
      kind: "authored" as const,
      note: "Labeled older owner and family departure control, not ordinary NPC history",
    };
  let source: World = createCharacterHistoryContextPeople(
    { ...world, control: { kind: "observer" } },
    [
      {
        stableKey: "rules2:head:older-person",
        givenName: "Older",
        familyName: "Owner",
        birthDate: makeIsoDate("1940-01-01"),
        homeJurisdictionId: town,
      },
    ],
  );
  const head =
    source.people[
      characterHistoryContextPersonId(source, "rules2:head:older-person")
    ]!;
  source = startHouseholdMembership(source, {
    stableKey: "rules2:head:older-member",
    personId: head.id,
    householdId,
    startedAt: source.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  source = resources.createDwelling(source, {
    stableKey: "rules2:head:dwelling",
    establishedAt: source.currentDate,
    jurisdictionId: town,
    classification: "residential:house",
    locationLabel: "Canonical older owner home",
    provenance,
  });
  const dwellingId = source.history.dwellings.at(-1)!.id;
  source = resources.createHousingTenure(source, {
    stableKey: "rules2:head:tenure",
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: source.currentDate,
    kind: "ownership:owned",
    context: null,
    provenance,
  });
  source = resources.startDwellingOccupancy(source, {
    stableKey: "rules2:head:occupancy",
    occupant: { kind: "household", householdId },
    dwellingId,
    startedAt: source.currentDate,
    residenceRole: "primary",
    kind: "residence:owned-home",
    provenance,
  });
  source = {
    ...source,
    currentDate: dates[1]!,
    currentMoment: simulationMomentOnLocalDate(source.currentMoment, dates[1]!),
  };
  for (const membership of source.history.householdMemberships.filter(
    (row) => row.householdId === householdId && row.personId !== head.id,
  )) {
    const state = source.history.householdMembershipStates
      .filter((row) => row.membershipId === membership.id)
      .at(-1)!;
    source = recordHouseholdMembershipState(source, {
      stableKey: "rules2:head:left:" + membership.id,
      membershipId: membership.id,
      effectiveAt: addDays(source.currentDate, -1),
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      provenance,
      supersedesStateId: state.id,
    });
  }
  const after = run(source, town, "head-downsize-control");
  expect(
    after.history.events.some((row) => row.type === own.TOWN_HOME_EVENTS.sold),
  ).toBe(true);
}
describe("complete retained quarterly home public parent, head age and canonical effects across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          household: true,
          date: "2026-01-05",
          seed: "rules2:economy:home-review:" + usps,
        });
        let world = recordHouseholdLocation(fixture.world, {
          stableKey: "rules2:home-review:location",
          householdId: fixture.world.history.households.at(-1)!.id,
          effectiveAt: fixture.world.currentDate,
          jurisdictionId: fixture.jurisdictionId,
          label: "Canonical household location control",
          kind: "residence:home",
          provenance: {
            kind: "authored",
            note: "Home-review location control",
          },
          supersedesLocationId: null,
        });
        expect(
          own.describeTownHomes(facts(world), fixture.jurisdictionId),
        ).toEqual(native.describeTownHomes(world, fixture.jurisdictionId));
        downsizeControl(world, fixture.jurisdictionId);
        world = run(world, fixture.jurisdictionId, "opening-control");
        expect(world.history.dwellingOccupancies.length).toBeGreaterThan(0);
        world = run(world, fixture.jurisdictionId, "opening-control");
        for (const date of dates.slice(1)) {
          world = {
            ...world,
            currentDate: date,
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              date,
            ),
          };
          world = run(world, fixture.jurisdictionId, "dated-control:" + date);
        }
        const noHouseholds = {
          ...world,
          history: { ...world.history, households: [] },
        };
        run(
          noHouseholds,
          fixture.jurisdictionId,
          "authored-no-households-control",
        );
      },
      60000,
    );
});
