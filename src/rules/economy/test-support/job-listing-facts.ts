/** Raw life, public-body/geographic population and compiled wage/legal receipts, without chosen role/pay/listing math. */
import * as life from "../../../simulation/life-queries";
import { homeLocalGovernmentUnits } from "../../../simulation/nationwide-world/local-governments";
import {
  playerTown,
  townRoster,
} from "../../../simulation/living-world/town-residents";
import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import { countyGeoidsForPlace } from "../../../simulation/government-units";
import * as wage from "../../../simulation/living-world/town-pay.generated";
import { TOWN_JOB_SOC } from "../../../simulation/living-world/town-job-soc";
import {
  minimumWageSettingAt,
  FEDERAL_MINIMUM_HOURLY_MINOR,
} from "../../../simulation/minimum-wage";
import type { World } from "../../../simulation/types";
import type { JobListingFacts } from "../job-listings";
export function jobListingFacts(world: World): JobListingFacts {
  const places = new Map(
    world.jurisdictionOrder.map((id) => [id, lifePlaceByJurisdictionId(id)]),
  );
  return {
    currentDate: world.currentDate,
    records: world.history,
    people: world.people,
    profiles: new Map(
      world.history.organizations.map((row) => [
        row.id,
        life.organizationProfileAt(world, row.id),
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((row) => [
        row.id,
        life.workStatusAt(world, row.id),
      ]),
    ),
    roles: new Map(
      world.history.workRelationships.map((row) => [
        row.id,
        life.workRoleAt(world, row.id),
      ]),
    ),
    closings: new Map(
      world.history.organizations.map((row) => [
        row.id,
        life.organizationClosingAt(world, row.id),
      ]),
    ),
    units: new Map(
      world.personOrder.map((id) => [id, homeLocalGovernmentUnits(world, id)]),
    ),
    population: new Map(
      world.personOrder.map((id) => {
        const town = playerTown(world, id);
        return [id, town ? townRoster(town).population : null];
      }),
    ),
    minimum: new Map(
      world.jurisdictionOrder.map((id) => [
        id,
        minimumWageSettingAt(world, id, world.currentDate)?.hourlyMinor ??
          FEDERAL_MINIMUM_HOURLY_MINOR,
      ]),
    ),
    wage: {
      places,
      counties: new Map(
        [...places.values()].flatMap((place) =>
          place?.sourceGeoid
            ? [
                [
                  place.sourceGeoid,
                  countyGeoidsForPlace(place.sourceGeoid),
                ] as const,
              ]
            : [],
        ),
      ),
      countyAreas: wage.TOWN_PAY_COUNTY_AREAS,
      occupations: TOWN_JOB_SOC,
      percentiles: wage.TOWN_PAY_PERCENTILES,
      minimumWages: wage.TOWN_MINIMUM_WAGES,
      federalMinimum: wage.FEDERAL_MINIMUM_HOURLY,
    },
  };
}
