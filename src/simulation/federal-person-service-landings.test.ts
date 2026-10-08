import { afterAll, describe, expect, it } from "vitest";
import {
  base,
  enact,
  fundedServiceFixture,
  procedure,
} from "../../tests/fixtures/funded-service-fixture";
import {
  addSimulationMinutes,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "./dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "./national-election-geography";
import {
  livesInServiceArea,
  requestPublicService,
} from "./public-service-requests";
import { performScheduledActivity } from "./time-work";
import { applyLawConsequences } from "./enacted-law-effects";
import { assertWorldIntegrityFully, withWorldIntegrityDeferred } from "./world";
import {
  POWER_PLANT_CARBON_QUESTION,
  recordCarbonLawPersonalExposure,
} from "./federal-carbon-person-landings";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, Person, World } from "./types";

const RAIL = "us-federal-positions:transport-water.expand-passenger-rail";
function homeIn(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): World {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        homeJurisdictionId: jurisdictionId,
        establishedFacts: person.establishedFacts.map(move),
        ...(person.detailLevel === "materialized"
          ? {
              details: {
                ...person.details,
                generatedFacts: person.details.generatedFacts.map(move),
              },
            }
          : {}),
      } as Person,
    },
  };
}

describe("federal service and environmental landings", () => {
  const auditWorlds: World[] = [];
  afterAll(() => auditWorlds.forEach(assertWorldIntegrityFully));
  it(
    "delivers a funded passenger trip to residents in all 56 places",
    () =>
      withWorldIntegrityDeferred(() => {
        const places = lifePlaceStateIdentities();
        expect(places).toHaveLength(56);
        for (const place of places) {
          const f = fundedServiceFixture(
            place.jurisdictionKey,
            RAIL,
            NATIONAL_ELECTION_JURISDICTION,
          );
          const world = homeIn(
            f.world,
            f.personId,
            stateJurisdictionForKey(place.jurisdictionKey)!.id,
          );
          expect(
            livesInServiceArea(
              world,
              f.personId,
              NATIONAL_ELECTION_JURISDICTION.id,
            ),
            place.jurisdictionKey,
          ).toBe(true);
          const start = addSimulationMinutes(world.currentMoment, 30);
          const asked = requestPublicService(world, {
            personId: f.personId,
            commitmentId: f.commitmentId,
            start,
            end: addSimulationMinutes(start, 45),
          });
          if (asked.kind !== "scheduled")
            throw new Error(`${place.jurisdictionKey}: ${asked.reason}`);
          expect(
            asked.world.history.events.some(
              (e) => e.type === "service.delivery-recorded",
            ),
          ).toBe(false);
          let traveled = performScheduledActivity(
            asked.world,
            asked.activityId,
          );
          traveled = applyLawConsequences(traveled, {
            activity: "service",
            activityId: asked.activityId,
            subjectIds: [f.personId],
            onDate: traveled.currentDate,
          });
          expect(
            traveled.history.events.find(
              (e) => e.type === "service.delivery-recorded",
            )?.lawEffectStamps?.[0]?.questionKey,
          ).toBe(RAIL);
          if (place === places[0]) {
            auditWorlds.push(traveled);
            const saved = deserializeWorld(serializeWorld(traveled));
            const repeated = applyLawConsequences(saved, {
              activity: "service",
              activityId: asked.activityId,
              subjectIds: [f.personId],
              onDate: saved.currentDate,
            });
            expect(
              repeated.history.events.filter(
                (e) => e.type === "service.delivery-recorded",
              ),
            ).toHaveLength(1);
          }
        }
      }),
    30_000,
  );

  it(
    "records lower estimated personal PM2.5 after the modeled lag in all 56 places",
    () =>
      withWorldIntegrityDeferred(() => {
        const enacted = enact(
          ensureNationalElectionJurisdiction(base),
          NATIONAL_ELECTION_JURISDICTION.id,
          "yes",
          POWER_PLANT_CARBON_QUESTION,
        );
        const early = recordCarbonLawPersonalExposure(
          enacted,
          enacted.currentDate,
        );
        expect(
          early.history.events.filter(
            (e) => e.type === "environment.personal-air-exposure",
          ),
        ).toHaveLength(0);
        for (const place of lifePlaceStateIdentities()) {
          const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey)!;
          const date = makeIsoDate(
            `${Number(enacted.currentDate.slice(0, 4)) + 7}-01-01`,
          );
          let world = homeIn(
            {
              ...enacted,
              currentDate: date,
              currentMoment: simulationMomentOnLocalDate(
                enacted.currentMoment,
                date,
              ),
              jurisdictions: {
                ...enacted.jurisdictions,
                [jurisdiction.id]: jurisdiction,
              },
            },
            procedure.playerPersonId,
            jurisdiction.id,
          );
          world = recordCarbonLawPersonalExposure(world, date);
          const record = world.history.events.find(
            (e) =>
              e.type === "environment.personal-air-exposure" &&
              e.participants.some(
                (p) => p.personId === procedure.playerPersonId,
              ),
          );
          expect(record, place.jurisdictionKey).toBeDefined();
          const value = (prefix: string) =>
            Number(
              record!.tags
                .find((tag) => tag.startsWith(prefix))!
                .slice(prefix.length),
            );
          expect(value("pm25:")).toBeLessThan(value("without-law-pm25:"));
          expect(
            record!.tags.some((tag) => tag.startsWith("estimatedFrom:")),
          ).toBe(true);
          expect(
            world.history.lawExposures?.some(
              (row) =>
                row.personId === procedure.playerPersonId &&
                row.sourceRecordId === record!.id &&
                row.direction === "gain",
            ),
          ).toBe(true);
          expect(recordCarbonLawPersonalExposure(world, date)).toBe(world);
          if (auditWorlds.length === 1) auditWorlds.push(world);
        }
      }),
    30_000,
  );
});
